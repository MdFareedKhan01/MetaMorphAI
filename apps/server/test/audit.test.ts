import { describe, expect, it, vi } from 'vitest';

// audit.ts imports the real database client. These tests replace it, so they need no PostgreSQL.
vi.mock('../src/db', () => ({ prisma: { auditLog: { findMany: vi.fn() } } }));

import { prisma } from '../src/db';
import { rowHash, verifyChain } from '../src/audit';

const GENESIS = '0'.repeat(64);
const findMany = vi.mocked(prisma.auditLog.findMany);

/** A valid chain of n rows, linked the way appendAudit links them. */
function chain(n: number) {
  const rows = [];
  let prev = GENESIS;
  for (let seq = 1; seq <= n; seq++) {
    const row = {
      id: `a${seq}`,
      seq,
      prev_hash: prev,
      actor_id: 'u1',
      target_id: `t${seq}`,
      action: 'artifact.generated',
      metadata: { version: 1 },
      ts: new Date(Date.UTC(2026, 8, 27, 10, seq)),
    };
    prev = rowHash(row);
    rows.push({ ...row, row_hash: prev });
  }
  return rows;
}

describe('hash-chained audit log (SRS §8, AC-14)', () => {
  it('hashes metadata identically whatever its key order', () => {
    const row = {
      seq: 1,
      prev_hash: GENESIS,
      actor_id: 'u1',
      target_id: 't1',
      action: 'x',
      ts: new Date(0),
    };
    expect(rowHash({ ...row, metadata: { a: 1, b: 2 } })).toBe(
      rowHash({ ...row, metadata: { b: 2, a: 1 } })
    );
  });

  it('reports an untouched chain as valid', async () => {
    findMany.mockResolvedValue(chain(5) as never);
    expect(await verifyChain()).toEqual({ valid: true, rows_checked: 5, first_broken_seq: null });
  });

  it('names the first row whose content was edited', async () => {
    const rows = chain(5);
    rows[2] = { ...rows[2], action: 'artifact.approved' }; // seq 3 edited, its stored hash left alone
    findMany.mockResolvedValue(rows as never);
    expect(await verifyChain()).toEqual({ valid: false, rows_checked: 2, first_broken_seq: 3 });
  });

  it('notices a deleted row from the gap in seq', async () => {
    findMany.mockResolvedValue(chain(5).filter((r) => r.seq !== 2) as never);
    expect(await verifyChain()).toMatchObject({ valid: false, first_broken_seq: 3 });
  });
});
