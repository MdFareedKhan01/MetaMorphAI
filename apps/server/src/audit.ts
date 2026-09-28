import { createHash } from 'node:crypto';
import { prisma } from './db';

const GENESIS = '0'.repeat(64);

/** JSON with sorted keys, so the same data always hashes to the same value. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

interface Row {
  seq: number;
  prev_hash: string;
  actor_id: string | null;
  target_id: string | null;
  action: string;
  metadata: unknown;
  ts: Date;
}

export const rowHash = (r: Row) =>
  createHash('sha256')
    .update(stable([r.prev_hash, r.seq, r.actor_id, r.target_id, r.action, r.metadata, r.ts.toISOString()]))
    .digest('hex');

export async function appendAudit(
  actor_id: string | null,
  target_id: string | null,
  action: string,
  metadata: object = {}
) {
  // Drop undefined values now, so the JSON read back later hashes identically.
  const clean = JSON.parse(JSON.stringify(metadata));
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(154)`; // one writer at a time: a linear chain
    const last = await tx.auditLog.findFirst({ orderBy: { seq: 'desc' } });
    const row: Row = {
      seq: (last?.seq ?? 0) + 1,
      prev_hash: last?.row_hash ?? GENESIS,
      actor_id,
      target_id,
      action,
      metadata: clean,
      ts: new Date(),
    };
    await tx.auditLog.create({ data: { ...row, metadata: clean, row_hash: rowHash(row) } });
  });
}

export async function verifyChain() {
  const rows = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
  let prev = GENESIS;
  for (const [i, r] of rows.entries()) {
    if (r.seq !== i + 1 || r.prev_hash !== prev || r.row_hash !== rowHash({ ...r, prev_hash: prev })) {
      return { valid: false, rows_checked: i, first_broken_seq: r.seq };
    }
    prev = r.row_hash;
  }
  return { valid: true, rows_checked: rows.length, first_broken_seq: null };
}
