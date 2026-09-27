import { describe, expect, it } from 'vitest';

import {
  collectClaims,
  groundingScore,
  postHocRefs,
} from '../src/provenance';

import type { Claim, Span } from '@ps154/shared';

describe('provenance', () => {
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
  ];

  it('assigns claim IDs in reading order', () => {
    const output = {
      first: {
        text: '37 organisations were potentially exposed.',
        source_refs: ['span_1'],
        status: 'inference' as const,
      },
      second: {
        text: 'Reset VPN credentials for all users.',
        source_refs: ['span_2'],
        status: 'fact' as const,
      },
    };

    const result = collectClaims(output);

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].id).toBe('c1');
    expect(result.nodes[1].id).toBe('c2');

    expect(
      (result.content as any).first.id
    ).toBe('c1');

    expect(
      (result.content as any).second.id
    ).toBe('c2');
  });

  it('keeps framing claims but excludes them from grounding score', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: 'Here is what to do.',
        source_refs: [],
        status: 'framing',
        grounded: false,
      },
      {
        id: 'c2',
        text: '37 organisations were potentially exposed.',
        source_refs: ['span_1'],
        status: 'inference',
        grounded: true,
      },
    ];

    expect(groundingScore(claims)).toBe(1);
  });

  it('returns zero grounding when a factual claim is not grounded', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: '37 organisations were potentially exposed.',
        source_refs: ['span_1'],
        status: 'inference',
        grounded: false,
      },
    ];

    expect(groundingScore(claims)).toBe(0);
  });

  it('returns perfect grounding when there are only framing claims', () => {
    const claims: Claim[] = [
      {
        id: 'c1',
        text: 'Here is what to do.',
        source_refs: [],
        status: 'framing',
        grounded: false,
      },
    ];

    expect(groundingScore(claims)).toBe(1);
  });

  it('finds post-hoc source references using lexical overlap', () => {
    const refs = postHocRefs(
      '37 organisations were potentially exposed.',
      spans
    );

    expect(refs).toEqual(['span_1']);
  });

  it('does not create a post-hoc reference when overlap is insufficient', () => {
    const refs = postHocRefs(
      'The weather is sunny today.',
      spans
    );

    expect(refs).toEqual([]);
  });

  it('detects the 37 to 42 corruption through grounding/identifier data', () => {
    const cleanClaim: Claim = {
      id: 'c1',
      text: '37 organisations were potentially exposed.',
      source_refs: ['span_1'],
      status: 'inference',
      grounded: true,
    };

    const corruptedClaim: Claim = {
      ...cleanClaim,
      text: '42 organisations were potentially exposed.',
      grounded: false,
    };

    expect(
      groundingScore([cleanClaim])
    ).toBe(1);

    expect(
      groundingScore([corruptedClaim])
    ).toBe(0);
  });
});