import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireRole } from '../auth';
import { enqueueTask } from '../queue';
import { appendAudit } from '../audit';
import { emit } from '../events';
import { toMarkdown, toPlainText } from '../export';

export const tasksRouter = Router();
// Behind requireRole, Express 5 types req.params.id as string | string[].
const load = (task_id: string | string[]) =>
  prisma.artifact.findUnique({ where: { task_id: String(task_id) }, include: { batch: true } });

tasksRouter.post('/:id/regenerate', requireRole('operator', 'admin'), async (req, res) => {
  const task = await load(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const next = await prisma.artifact.update({
    where: { task_id: task.task_id },
    data: {
      status: 'waiting',
      review_state: 'draft',
      review_comment: null,
      version: { increment: 1 },
    },
  });
  await prisma.batchJob.update({
    where: { batch_id: task.batch_id },
    data: { overall_status: 'running', completed_at: null },
  });
  await emit(task.batch_id, { event: 'task.progress', task_id: task.task_id, status: 'waiting' });
  await enqueueTask(task.task_id, next.version);
  await appendAudit(req.user!.id, task.task_id, 'artifact.regenerate', { version: next.version });
  res.status(202).json({ task_id: task.task_id, version: next.version });
});

tasksRouter.post('/:id/submit', requireRole('operator', 'admin'), async (req, res) => {
  const task = await load(req.params.id);
  if (!task || task.status !== 'ready') {
    res.status(409).json({ error: 'Only a ready artefact can be submitted' });
    return;
  }
  await prisma.artifact.update({
    where: { task_id: task.task_id },
    data: { review_state: 'submitted' },
  });
  await appendAudit(req.user!.id, task.task_id, 'artifact.submitted', { version: task.version });
  res.json({ review_state: 'submitted' });
});

const Review = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().max(2000).optional(),
});

tasksRouter.post('/:id/review', requireRole('reviewer', 'admin'), async (req, res) => {
  const { decision, comment } = Review.parse(req.body);
  const task = await load(req.params.id);
  if (!task || task.review_state !== 'submitted') {
    res.status(409).json({ error: 'Only a submitted artefact can be reviewed' });
    return;
  }
  if (task.batch.created_by === req.user!.id) {
    // FR-27, AC-10
    res.status(403).json({ error: 'You cannot review your own artefact' });
    return;
  }
  if (decision === 'reject' && !comment) {
    res.status(400).json({ error: 'A rejection needs a comment' });
    return;
  }
  const review_state = decision === 'approve' ? 'approved' : 'rejected';
  await prisma.artifact.update({
    where: { task_id: task.task_id },
    data: { review_state, review_comment: comment ?? null, reviewed_by: req.user!.id },
  });
  await appendAudit(req.user!.id, task.task_id, `artifact.${review_state}`, {
    version: task.version,
    comment,
  });
  res.json({ review_state });
});

tasksRouter.get('/:id/export', async (req, res) => {
  const task = await load(req.params.id);
  if (!task?.content) {
    res.status(404).json({ error: 'Nothing to export yet' });
    return;
  }
  const as = req.query.as === 'txt' ? 'txt' : 'md';
  const body =
    as === 'md'
      ? toMarkdown(task.format_id, task.content)
      : toPlainText(task.format_id, task.content);
  await appendAudit(req.user!.id, task.task_id, 'artifact.exported', { as, version: task.version });
  res
    .type(as === 'md' ? 'text/markdown' : 'text/plain')
    .attachment(`${task.format_id}-v${task.version}.${as}`)
    .send(body);
});
