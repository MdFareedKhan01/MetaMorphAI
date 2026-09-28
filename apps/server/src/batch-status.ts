import { prisma } from './db';
import { emit } from './events';

export async function refreshBatchStatus(batch_id: string) {
  const rows = await prisma.artifact.findMany({ where: { batch_id }, select: { status: true } });
  const done = rows.filter((r) => r.status === 'ready').length;
  const failed = rows.filter((r) => r.status === 'error').length;
  if (done + failed < rows.length) return; // still running
  const overall_status = failed === 0 ? 'complete' : done === 0 ? 'failed' : 'partial';
  await prisma.batchJob.update({ where: { batch_id }, data: { overall_status, completed_at: new Date() } });
  await emit(batch_id, { event: 'batch.completed', batch_id, overall_status, completed: done, failed });
}
