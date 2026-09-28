import { Worker } from 'bullmq';
import type { Canonical, Classification, Config, FormatId, Span } from '@ps154/shared';
import { prisma, redis, json } from './db';
import { engine } from './engine';
import { emit } from './events';
import { appendAudit } from './audit';
import { refreshBatchStatus } from './batch-status';
import { toArtifact } from './artifact';

async function setStatus(batch_id: string, task_id: string, status: string, detail?: string) {
  await prisma.artifact.update({ where: { task_id }, data: { status } });
  await emit(batch_id, {
    event: 'task.progress',
    task_id,
    status: status as any,
    ...(detail ? { detail } : {}),
  });
}

const worker = new Worker(
  'generate',
  async (job) => {
    const { task_id } = job.data as { task_id: string };
    const lock = `lock:task:${task_id}`;
    // A stalled job can be re-delivered while its first run is still going. The lock makes that harmless.
    if (!(await redis.set(lock, String(job.id), 'EX', 300, 'NX'))) return;

    const task = await prisma.artifact.findUniqueOrThrow({
      where: { task_id },
      include: { batch: { include: { source: true } } },
    });
    const { batch } = task;
    const { source } = batch;
    try {
      const result = await engine.runFormat({
        formatId: task.format_id as FormatId,
        source: {
          id: source.id,
          classification: source.classification as Classification,
          spans: source.spans as unknown as Span[],
          raw_content: source.raw_content,
          source_hash: source.source_hash,
        },
        canonical: source.canonical as unknown as Canonical,
        config: task.effective_config as unknown as Config,
        onPhase: (status, detail) => setStatus(batch.batch_id, task_id, status, detail),
      });
      const saved = await prisma.artifact.update({
        where: { task_id },
        data: {
          status: 'ready',
          content: json(result.content),
          grounding_score: result.grounding_score,
          verification: json(result.verification),
          meta: json(result.meta),
          error_log: null,
          claims: {
            deleteMany: {},
            create: result.claims.map((c) => ({
              claim_key: c.id,
              text: c.text,
              source_refs: json(c.source_refs),
              status: c.status,
              grounded: c.grounded,
            })),
          },
        },
        include: { claims: true },
      });
      await emit(batch.batch_id, { event: 'task.completed', task_id, artifact: toArtifact(saved) });
      await appendAudit(batch.created_by, task_id, 'artifact.generated', {
        format_id: task.format_id,
        version: task.version,
        grounding_score: result.grounding_score,
        provider: result.meta.provider,
        model: result.meta.model,
        fallback_reason: result.meta.fallback_reason,
        revised: result.verification.revised,
        perturbed: result.meta.perturbed,
      });
    } catch (e: any) {
      const kind = e?.constructor?.name;
      if (kind === 'EgressBlocked')
        console.error('EGRESS BLOCKED: restricted content reached the cloud adapter', e);
      const code = e?.code ?? (kind === 'TransportError' ? 'PROVIDERS_UNAVAILABLE' : 'GENERATION_FAILED');
      await prisma.artifact.update({
        where: { task_id },
        data: { status: 'error', error_log: String(e?.stack ?? e) },
      });
      await emit(batch.batch_id, {
        event: 'task.failed',
        task_id,
        error_code: code,
        message: e?.message ?? 'Generation failed',
        retryable: true,
      });
      await appendAudit(batch.created_by, task_id, 'artifact.failed', { format_id: task.format_id, code });
    } finally {
      await redis.del(lock);
      await refreshBatchStatus(batch.batch_id);
    }
  },
  { connection: redis, concurrency: 3 }
); // NFR-4: three in flight

worker.on('ready', () => console.log('Worker ready: 3 concurrent tasks'));
