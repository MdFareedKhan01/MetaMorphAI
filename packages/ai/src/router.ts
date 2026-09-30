import type { Redis } from 'ioredis';

import {
  cloud,
  gemini,
  local,
  TransportError,
  RateLimitError,
  type LLMRequest,
  type LLMResponse,
} from './adapters';

import { Redactor } from './redact';
import { env } from './env';

export type FallbackReason =
  | 'policy'
  | 'rate_limit'
  | 'network';

export interface Routed extends LLMResponse {
  fallback_reason: FallbackReason | null;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/*
 * Redis keys:
 *
 * ratelimit:provider:cloud
 *   Counts cloud requests in the current 60-second window.
 *
 * ratelimit:provider:cloud:last
 *   Stores the timestamp of the most recent cloud request.
 *
 * Redis is used so multiple workers/processes share the same limit.
 */
const RPM_KEY = 'ratelimit:provider:cloud';
const LAST_REQUEST_KEY = 'ratelimit:provider:cloud:last';

export function createRouter(redis: Redis) {
  async function waitForCloudCapacity(): Promise<void> {
  while (true) {
    const n = await redis.incr(RPM_KEY);

    if (n === 1) {
      await redis.expire(RPM_KEY, 60);
    }

    if (n <= env.CLOUD_RPM) {
      return;
    }

    const ttl = await redis.ttl(RPM_KEY);

    // Wait until the current RPM window expires.
    // Add a small buffer so the next request doesn't race
    // the Redis expiration.
    await sleep(
      Math.max(1000, (ttl + 1) * 1000)
    );
  }
}

  async function waitForCloudSpacing(): Promise<void> {
    const minInterval = env.CLOUD_MIN_INTERVAL_MS;

    if (minInterval <= 0) return;

    const last = await redis.get(LAST_REQUEST_KEY);

    if (last) {
      const elapsed = Date.now() - Number(last);
      const remaining = minInterval - elapsed;

      if (remaining > 0) {
        await sleep(remaining);
      }
    }

    await redis.set(
      LAST_REQUEST_KEY,
      String(Date.now()),
      'EX',
      120,
    );
  }

  async function onLocal(
    req: LLMRequest,
    reason: FallbackReason,
  ): Promise<Routed> {
    return {
      ...(await local.generate(req)),
      fallback_reason: reason,
    };
  }

  /**
   * The only way any prompt leaves packages/ai.
   *
   * Flow:
   *
   * restricted
   *    -> local
   *
   * cloud RPM exhausted
   *    -> local
   *
   * otherwise
   *    -> wait for spacing
   *    -> cloud
   *    -> retry transport errors
   *    -> local on failure
   */

    const cloudProvider =
    env.AI_PROVIDER === 'gemini'
      ? gemini
      : cloud;

  async function call(req: LLMRequest): Promise<Routed> {
    /*
     * AC-5 / sovereignty boundary:
     * restricted sources NEVER attempt cloud.
     */
    if (req.classification === 'restricted') {
      return onLocal(req, 'policy');
    }

    /*
     * Hard Redis-backed RPM check.
     */
    await waitForCloudCapacity();

    /*
     * Internal sources are redacted before leaving the worker.
     */
    const redactor =
      req.classification === 'internal'
        ? new Redactor()
        : null;

    const outbound = redactor
      ? redactor.maskRequest(req)
      : req;

    /*
     * Prevent a burst of cloud calls.

     * Example with 6500 ms:
     *
     * call 1 -> immediately
     * call 2 -> ~6.5 sec later
     * call 3 -> ~13 sec later
     *
     * This keeps us comfortably below a 10 RPM provider limit.
     */
    await waitForCloudSpacing();

    let reason: FallbackReason = 'network';

    /*
     * First request + two transport retries.
     *
     * A provider 429 is NOT retried here because it should immediately
     * fall back to local.
     */
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await cloudProvider.generate(outbound);

        return {
          ...res,
          text: redactor
            ? redactor.unmask(res.text)
            : res.text,
          fallback_reason: null,
        };
      } catch (e) {
        /*
         * Provider explicitly says we are rate limited.
         */
        if (e instanceof RateLimitError) {
  reason = 'rate_limit';

  await sleep(
    Math.max(
      env.CLOUD_MIN_INTERVAL_MS,
      10000
    )
  );

  continue;
}

        /*
         * Non-transport errors should not silently become local calls.
         */
        if (!(e instanceof TransportError)) {
          throw e;
        }

        /*
         * Exponential backoff:
         *
         * attempt 1 -> 500 ms
         * attempt 2 -> 1000 ms
         * attempt 3 -> 2000 ms
         */
        await sleep(500 * 2 ** attempt);
      }
    }

    /*
     * Cloud failed.
     *
     * Local receives the ORIGINAL unmasked request.
     * It never leaves the host.
     */
    return onLocal(req, reason);
  }

  return {
    call,
  };
}

export type Router = ReturnType<typeof createRouter>;