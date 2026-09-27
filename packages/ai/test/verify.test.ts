import { describe, expect, it } from 'vitest';

import { verifyClaims } from '../src/verifier';

import type { Claim, Span } from '@ps154/shared';

const spans: Span[] = [
  {
    span_id: 'span_1',
    text: '37 organisations were potentially exposed.',
    start_offset: 0,
    end_offset: 43,
  },
  {
    span_id: 'span_2',
    text: 'Reset VPN credentials for all users.',
    start_offset: 44,
    end_offset: 80,
  },
  {
    span_id: 'span_3',
    text: 'The activity was confirmed.',
    start_offset: 81,
    end_offset: 110,
  },
];

describe('verifier', () => {
  it('passes a clean grounded claim', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: '37 organisations were potentially exposed.',
        source_refs: ['span_1'],
        status: 'inference',
        grounded: false,
      },
    ];

    const result = verifyClaims(claims, spans);

    expect(result.passed).toBe(true);
    expect(result.open_issues).toHaveLength(0);
  });

  it('detects an identifier that was changed from 37 to 42', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: '42 organisations were potentially exposed.',
        source_refs: ['span_1'],
        status: 'fact',
        grounded: false,
      },
    ];

    const result = verifyClaims(claims, spans);

    expect(result.passed).toBe(false);

    expect(
      result.open_issues.some(
        (finding) =>
          finding.check === 'identifier' &&
          finding.key === 'c1'
      )
    ).toBe(true);
  });

  it('detects a missing hedge', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: '37 organisations were exposed.',
        source_refs: ['span_1'],
        status: 'inference',
        grounded: false,
      },
    ];

    const result = verifyClaims(claims, spans);

    expect(result.passed).toBe(false);

    expect(
      result.open_issues.some(
        (finding) =>
          finding.check === 'hedge' &&
          finding.key === 'c1'
      )
    ).toBe(true);
  });

  it('detects an unknown source reference', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: '37 organisations were potentially exposed.',
        source_refs: ['span_999'],
        status: 'inference',
        grounded: false,
      },
    ];

    const result = verifyClaims(claims, spans);

    expect(result.passed).toBe(false);

    expect(
      result.open_issues.some(
        (finding) =>
          finding.check === 'constraint' &&
          finding.key === 'c1'
      )
    ).toBe(true);
  });

  it('detects insufficient grounding', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: 'The weather is sunny today.',
        source_refs: ['span_1'],
        status: 'fact',
        grounded: false,
      },
    ];

    const result = verifyClaims(claims, spans);

    expect(result.passed).toBe(false);

    expect(
      result.open_issues.some(
        (finding) =>
          finding.check === 'grounding' &&
          finding.key === 'c1'
      )
    ).toBe(true);
  });

  it('does not require grounding for framing claims', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: 'Here is what to do.',
        source_refs: [],
        status: 'framing',
        grounded: false,
      },
    ];

    const result = verifyClaims(claims, spans);

    expect(result.passed).toBe(true);
    expect(result.open_issues).toHaveLength(0);
  });

  it('passes a correctly preserved hedge', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: '37 organisations were potentially exposed.',
        source_refs: ['span_1'],
        status: 'inference',
        grounded: false,
      },
    ];

    const result = verifyClaims(claims, spans);

    expect(
      result.open_issues.some(
        (finding) => finding.check === 'hedge'
      )
    ).toBe(false);
  });

  it('does not flag identifiers that match the source', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: 'The system was affected by CVE-2026-31337.',
        source_refs: ['span_1'],
        status: 'fact',
        grounded: false,
      },
    ];

    // This claim intentionally uses a source span without
    // the CVE, so the identifier check should flag it.
    const result = verifyClaims(claims, spans);

    expect(
      result.open_issues.some(
        (finding) =>
          finding.check === 'identifier' &&
          finding.key === 'c1'
      )
    ).toBe(true);
  });
});