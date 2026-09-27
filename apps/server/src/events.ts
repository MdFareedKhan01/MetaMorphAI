import type { FrameBody } from '@ps154/shared';
import { redis } from './db';

export async function emit(batch_id: string, frame: FrameBody) {
  const key = `stream:${batch_id}`;
  await redis.xadd(key, 'MAXLEN', '~', '1000', '*', 'frame', JSON.stringify(frame));
  await redis.expire(key, 6 * 3600); // SRS §8: streams live six hours
}
