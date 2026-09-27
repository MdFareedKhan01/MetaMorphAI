import { describe, expect, it } from 'vitest';
import { toMarkdown, toPlainText } from '../src/export';
import { toArtifact } from '../src/artifact';

const claim = (text: string) => ({
  id: 'c1',
  text,
  source_refs: ['span_3'],
  status: 'fact',
  grounded: true,
});
const content = {
  headline: 'Phishing campaign against power utilities',
  key_points: [
    claim('37 organisations recorded indicators.'),
    claim('Three confirmed a compromise.'),
  ],
};

describe('exports (FR-28)', () => {
  it('writes claim text as Markdown and hides provenance fields', () => {
    const md = toMarkdown('executive_summary', content);
    expect(md).toContain('# Executive summary');
    expect(md).toContain('- 37 organisations recorded indicators.');
    expect(md).not.toMatch(/span_3|source_refs|grounded/);
  });

  it('strips Markdown syntax for plain text', () => {
    expect(toPlainText('executive_summary', content)).not.toMatch(/^#|^- /m);
  });
});

describe('toArtifact', () => {
  it('maps stored claims into the envelope and shows only the first line of an error', () => {
    const a = toArtifact({
      task_id: 't1',
      batch_id: 'b1',
      format_id: 'advisory',
      effective_config: {},
      content: null,
      claims: [{ claim_key: 'c3', text: 'x', source_refs: ['span_1'], status: 'fact', grounded: true }],
      grounding_score: null,
      verification: null,
      meta: null,
      status: 'error',
      review_state: 'draft',
      review_comment: null,
      error_log: 'SCHEMA_INVALID: bad JSON\n    at runFormat (pipeline.ts:88)',
      version: 2,
    });
    expect(a.claims).toEqual([
      { id: 'c3', text: 'x', source_refs: ['span_1'], status: 'fact', grounded: true },
    ]);
    expect(a.error_log).toBe('SCHEMA_INVALID: bad JSON');
  });
});
