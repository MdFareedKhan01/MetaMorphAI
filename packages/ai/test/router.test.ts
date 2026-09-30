import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real error classes, but fake providers: no network, no key, no Ollama.
const providers = vi.hoisted(() => ({ cloud: { generate: vi.fn() }, local: { generate: vi.fn() } }));
vi.mock('../src/adapters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/adapters')>()),
  cloud: providers.cloud,
  local: providers.local,
}));

import { TransportError, type LLMRequest } from '../src/adapters';
import { createRouter } from '../src/router';

const redis = { incr: async () => 1, expire: async () => 1, ttl: async () => 60, get: async () => null, set: async () => 'OK' };
const router = () => createRouter(redis as never);
const request = (classification: LLMRequest['classification']): LLMRequest =>
  ({ system: 'sys', user: 'user', classification });
const answer = (provider: 'cloud' | 'local') =>
  ({ text: '{}', provider, model: `${provider}-model`, latency_ms: 1 });

describe('router: the only way a prompt leaves the package', () => {
  beforeEach(() => { providers.cloud.generate.mockReset(); providers.local.generate.mockReset(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('never calls the cloud for a restricted source, and records the policy (AC-5)', async () => {
    providers.local.generate.mockResolvedValue(answer('local'));
    const r = await router().call(request('restricted'));
    expect(providers.cloud.generate).not.toHaveBeenCalled();
    expect(r).toMatchObject({ provider: 'local', fallback_reason: 'policy' });
  });

  it('uses the cloud for a public source', async () => {
    providers.cloud.generate.mockResolvedValue(answer('cloud'));
    const r = await router().call(request('public'));
    expect(providers.local.generate).not.toHaveBeenCalled();
    expect(r).toMatchObject({ provider: 'cloud', fallback_reason: null });
  });

  it('falls back to the local model when the cloud keeps failing', async () => {
    providers.cloud.generate.mockRejectedValue(new TransportError('boom'));
    providers.local.generate.mockResolvedValue(answer('local'));
    const done = router().call(request('public'));
    await vi.runAllTimersAsync();
    expect(await done).toMatchObject({ provider: 'local', fallback_reason: 'network' });
    expect(providers.cloud.generate).toHaveBeenCalledTimes(3);
  });

  it('reports the cloud reason when the local fallback also fails', async () => {
    // What happened on 30 Sep: Groq said 404 model_not_found, Ollama was not running, and the
    // operator was told only "fetch failed". Both reasons must reach the caller.
    providers.cloud.generate.mockRejectedValue(new TransportError(
      '404 {"error":{"message":"The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.","code":"model_not_found"}}'));
    providers.local.generate.mockRejectedValue(new TransportError('fetch failed'));

    const done = router().call(request('public')).catch((e: Error) => e);
    await vi.runAllTimersAsync();
    const error = await done;

    expect(error).toBeInstanceOf(TransportError);
    expect((error as Error).message).toContain('does not exist or you do not have access to it');
    expect((error as Error).message).toContain('Local fallback also failed: fetch failed');
    expect((error as Error).message).not.toContain('{"error"'); // the sentence, not the JSON
  });
});
