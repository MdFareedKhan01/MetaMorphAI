import { describe, expect, it } from 'vitest';

import {
  identifiers,
  hasHedge,
} from '../src/identifiers';

describe('identifiers', () => {
  it('detects CVEs without treating the CVE year as a separate number', () => {
    const result = identifiers(
      'The system is affected by CVE-2026-31337.'
    );

    expect(result).toContainEqual({
      kind: 'cve',
      value: 'CVE-2026-31337',
    });
  });

  it('detects IP addresses', () => {
    const result = identifiers(
      'Observed traffic from 203.0.113.47.'
    );

    expect(result).toContainEqual({
      kind: 'ip',
      value: '203.0.113.47',
    });
  });

  it('detects hashes', () => {
    const hash =
      '3f7a9c1e5b2d4f6a8c0e1b3d5f7a9c2e';

    const result = identifiers(
      `Attachment hash: ${hash}`
    );

    expect(result).toContainEqual({
      kind: 'hash',
      value: hash,
    });
  });

  it('detects domains including defanged domains', () => {
    const result = identifiers(
      'Visit login-verify.example[.]com.'
    );

    expect(result).toContainEqual({
      kind: 'domain',
      value: 'login-verify.example[.]com',
    });
  });

  it('detects numeric values', () => {
    const result = identifiers(
      '37 organisations were exposed.'
    );

    expect(result).toContainEqual({
      kind: 'number',
      value: '37',
    });
  });

  it('detects uncertainty language', () => {
    expect(
      hasHedge(
        'The activity is possibly related to the campaign.'
      )
    ).toBe(true);

    expect(
      hasHedge(
        'Lateral movement was suspected.'
      )
    ).toBe(true);

    expect(
      hasHedge(
        'The activity has not been confirmed.'
      )
    ).toBe(true);
  });

  it('does not treat an ordinary factual sentence as hedged', () => {
    expect(
      hasHedge(
        'Three organisations confirmed credential compromise.'
      )
    ).toBe(false);
  });
});