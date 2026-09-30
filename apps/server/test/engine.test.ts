import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Canonical, OutputSchemas, splitSpans, type FormatId } from '@ps154/shared';

// The engine bridge is tested without a database, a queue, a key or a network.
vi.mock('../src/db', () => ({ redis: {} }));
const ai = vi.hoisted(() => ({ extractCanonical: vi.fn(), runFormat: vi.fn() }));
vi.mock('@ps154/ai', () => ({ createEngine: () => ai }));

import { engine } from '../src/engine';

const raw = 'Between 3 and 9 September, sector monitoring recorded a campaign against 37 organisations.\n'
  + 'Attackers used firmware flaws in SSL-VPN gateways.\nApply the vendor patch immediately.';
const source = { id: 's1', classification: 'public' as const, raw_content: raw, source_hash: 'h', spans: splitSpans(raw) };
const config = { audience: 'Sector CISOs', tone: 'formal' as const, detail: 'medium' as const, language: 'en' as const };
const FORMATS = Object.keys(OutputSchemas) as FormatId[];

describe('engine bridge: the offline stub', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); ai.extractCanonical.mockReset(); ai.runFormat.mockReset(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it('produces content that fits every format schema, so no card can crash on it', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const { canonical } = await engine.extractCanonical(source);
    expect(Canonical.safeParse(canonical).success).toBe(true);
    for (const formatId of FORMATS) {
      const r = await engine.runFormat({ formatId, source, canonical, config });
      const parsed = OutputSchemas[formatId].safeParse(r.content);
      expect(parsed.success, `${formatId}: ${parsed.success ? '' : parsed.error.message}`).toBe(true);
    }
  }, 20_000);

  it('says it is unverified, names itself, and states why it ran', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const { canonical } = await engine.extractCanonical(source);
    const r = await engine.runFormat({ formatId: 'linkedin_post', source, canonical, config });
    expect(r.meta.model).toMatch(/^offline-stub/);
    expect(r.grounding_score).toBe(0);
    expect(r.verification.passed).toBe(false);
    expect(r.claims.every((c) => c.grounded === false)).toBe(true);
    expect(r.verification.open_issues[0].detail).toContain('GROQ_API_KEY is not set');
  });

  it('shows the provider\'s own reason when a real model call fails', async () => {
    vi.stubEnv('GROQ_API_KEY', 'gsk_test_key');
    ai.extractCanonical.mockRejectedValue(new Error('Cloud model failed: The model `x` does not exist | Local fallback also failed: fetch failed'));
    ai.runFormat.mockRejectedValue(new Error('Cloud model failed: The model `x` does not exist | Local fallback also failed: fetch failed'));

    const { canonical, meta } = await engine.extractCanonical(source);
    expect(meta).toMatchObject({ model: expect.stringMatching(/^offline-stub/), reason: expect.stringContaining('does not exist') });

    const r = await engine.runFormat({ formatId: 'advisory', source, canonical, config });
    expect(r.verification.open_issues[0].detail).toContain('The model `x` does not exist');
    expect(r.verification.open_issues[0].detail).not.toContain('GROQ_API_KEY is not set');
  });

  it('never hides a sovereignty failure behind the stub', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const { canonical } = await engine.extractCanonical(source);
    vi.stubEnv('GROQ_API_KEY', 'gsk_test_key');
    class EgressBlocked extends Error {}
    ai.runFormat.mockRejectedValue(new EgressBlocked('restricted content reached the cloud adapter'));
    await expect(engine.runFormat({ formatId: 'advisory', source: { ...source, classification: 'restricted' }, canonical, config }))
      .rejects.toThrow(/restricted content reached the cloud adapter/);
  });
});
