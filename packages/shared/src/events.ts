import { z } from 'zod';
import { Artifact, TaskStatus } from './api';

export const Frame = z.discriminatedUnion('event', [
  z.object({ event: z.literal('task.progress'), seq: z.string(), task_id: z.string(),
             status: TaskStatus, detail: z.string().optional() }),
  z.object({ event: z.literal('task.completed'), seq: z.string(), task_id: z.string(),
             artifact: Artifact }),
  z.object({ event: z.literal('task.failed'), seq: z.string(), task_id: z.string(),
             error_code: z.string(), message: z.string(), retryable: z.boolean() }),
  z.object({ event: z.literal('batch.completed'), seq: z.string(), batch_id: z.string(),
             overall_status: z.enum(['complete', 'partial', 'failed']),
             completed: z.number(), failed: z.number() }),
]);
export type Frame = z.infer<typeof Frame>;

/** A frame before the stream assigns its seq. */
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
export type FrameBody = DistributiveOmit<Frame, 'seq'>;
