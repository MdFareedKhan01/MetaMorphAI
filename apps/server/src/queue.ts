import { Queue } from 'bullmq';
import { redis } from './db';

export const generateQueue = new Queue('generate', { connection: redis });

export const enqueueTask = (task_id: string, version: number) =>
  generateQueue.add(
    'generate',
    { task_id },
    {
      jobId: `${task_id}-v${version}`, // one job per version; avoid ':' in custom ids
      attempts: 1, // retries and fallback live in the engine, not in the queue
      removeOnComplete: 1000,
      removeOnFail: 1000,
    }
  );
