import { describe, expect, it } from 'vitest';
import { BatchRequest } from '../src';

const base = {
  source_id: crypto.randomUUID(),
  global_config: { audience: 'Sector CISOs', tone: 'formal', detail: 'medium', language: 'en' },
};

describe('BatchRequest (SRS §10.2)', () => {
  it('accepts a per-format override', () => {
    const r = BatchRequest.parse({ ...base, formats: [
      { format_id: 'advisory' },
      { format_id: 'linkedin_post', overrides: { tone: 'conversational' } },
    ] });
    expect(r.formats[1].overrides).toEqual({ tone: 'conversational' });
  });

  it('rejects no formats, a duplicate format and an unknown format', () => {
    const bad = [[], [{ format_id: 'advisory' }, { format_id: 'advisory' }], [{ format_id: 'podcast' }]];
    for (const formats of bad) expect(BatchRequest.safeParse({ ...base, formats }).success).toBe(false);
  });
});
