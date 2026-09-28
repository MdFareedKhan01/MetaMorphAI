import { Router } from 'express';
import { BatchRequest } from '@ps154/shared';
import { prisma, redis, json } from '../db';
import { enqueueTask } from '../queue';
import { appendAudit } from '../audit';
import { requireRole } from '../auth';
import { toArtifact } from '../artifact';

export const jobsRouter = Router();

jobsRouter.post('/batch', requireRole('operator'), async (req, res) => {
  const body = BatchRequest.parse(req.body); // 1 to 6 formats, no duplicates
  const source = await prisma.source.findUnique({ where: { id: body.source_id } });
  if (!source || source.created_by !== req.user!.id) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }
  if (!source.canonical) {
    res.status(409).json({ error: 'Facts have not been extracted from this source yet' });
    return;
  }

  const batch = await prisma.batchJob.create({
    data: {
      source_id: source.id,
      created_by: req.user!.id,
      global_config: json(body.global_config),
      overall_status: 'running',
      artifacts: {
        create: body.formats.map((f) => ({
          format_id: f.format_id,
          effective_config: json({ ...body.global_config, ...f.overrides }), // FR-11: merged per format
        })),
      },
    },
    include: { artifacts: true },
  });
  for (const a of batch.artifacts) await enqueueTask(a.task_id, a.version);
  await appendAudit(req.user!.id, batch.batch_id, 'batch.created', {
    formats: body.formats.map((f) => f.format_id),
    overridden: body.formats.filter((f) => f.overrides).map((f) => f.format_id),
  });

  res.status(202).json({
    batch_id: batch.batch_id,
    stream_last_id: '0',
    tasks: batch.artifacts.map((a) => ({ task_id: a.task_id, format_id: a.format_id, status: a.status })),
  });
});

jobsRouter.get('/:batch_id', async (req, res) => {
  // Read the stream position FIRST, then the rows. A frame landing in between
  // is replayed to the client rather than lost.
  const last = await redis.xrevrange(`stream:${req.params.batch_id}`, '+', '-', 'COUNT', 1);
  const batch = await prisma.batchJob.findUnique({
    where: { batch_id: req.params.batch_id },
    include: { artifacts: { include: { claims: true }, orderBy: { format_id: 'asc' } } },
  });
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }
  res.json({
    batch_id: batch.batch_id,
    source_id: batch.source_id,
    global_config: batch.global_config,
    overall_status: batch.overall_status,
    stream_last_id: last[0]?.[0] ?? '0',
    artifacts: batch.artifacts.map(toArtifact),
  });
});
