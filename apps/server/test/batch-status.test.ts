import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db', () => ({
  prisma: {
    artifact: { findMany: vi.fn() },
    batchJob: { update: vi.fn() },
  },
}));
vi.mock('../src/events', () => ({ emit: vi.fn() }));

import { prisma } from '../src/db';
import { emit } from '../src/events';
import { refreshBatchStatus } from '../src/batch-status';

const cards = (...statuses: string[]) =>
  vi.mocked(prisma.artifact.findMany).mockResolvedValue(statuses.map((status) => ({ status })) as never);

describe('refreshBatchStatus (SRS §10.4, AC-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays quiet while any card is still working', async () => {
    cards('ready', 'running', 'waiting');
    await refreshBatchStatus('b1');
    expect(emit).not.toHaveBeenCalled();
  });

  it('reads partial when one format failed and the rest are ready', async () => {
    cards('ready', 'error', 'ready');
    await refreshBatchStatus('b1');
    expect(emit).toHaveBeenCalledWith('b1', {
      event: 'batch.completed',
      batch_id: 'b1',
      overall_status: 'partial',
      completed: 2,
      failed: 1,
    });
  });

  it('reads complete when all are ready, and failed when none are', async () => {
    cards('ready', 'ready');
    await refreshBatchStatus('b1');
    cards('error', 'error');
    await refreshBatchStatus('b1');
    const outcomes = vi
      .mocked(emit)
      .mock.calls.map(([, frame]) => 'overall_status' in frame && frame.overall_status);
    expect(outcomes).toEqual(['complete', 'failed']);
  });
});
