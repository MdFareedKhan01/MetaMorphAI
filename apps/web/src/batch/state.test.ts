import { describe, expect, it } from 'vitest';
import type { Artifact, BatchSnapshot, Frame } from '../shared-temp';
import advisory from '../mocks/advisory.ready.json';
import { fromSnapshot, reducer, type BatchView } from './state';

const ready = advisory as unknown as Artifact;
const waiting = (task_id: string, format_id: string) =>
  ({ ...ready, task_id, format_id, status: 'waiting', content: null }) as Artifact;

const initial = fromSnapshot({
  batch_id: 'b1', source_id: 's1', global_config: ready.effective_config,
  overall_status: 'running', stream_last_id: '0',
  artifacts: [waiting('t1', 'advisory'), waiting('t2', 'executive_summary'), waiting('t3', 'linkedin_post')],
} as BatchSnapshot);

const apply = (state: BatchView, ...frames: Frame[]) =>
  frames.reduce((s, frame) => reducer(s, { type: 'frame', frame }), state);

describe('batch reducer (SRS §11.1)', () => {
  it('patches only the card a frame names, and remembers the seq', () => {
    const next = apply(initial, { event: 'task.progress', seq: '1-0', task_id: 't2', status: 'running' });
    expect(next.cards.t2.status).toBe('running');
    expect(next.cards.t2.started_at).toBeTypeOf('number');
    expect(next.cards.t1).toBe(initial.cards.t1);
    expect(next.last_seq).toBe('1-0');
  });

  it('keeps finished cards when another fails, and reads partial (AC-9)', () => {
    const s = apply(initial,
      { event: 'task.completed', seq: '2-0', task_id: 't1', artifact: { ...ready, task_id: 't1' } },
      { event: 'task.completed', seq: '3-0', task_id: 't2', artifact: { ...ready, task_id: 't2' } },
      { event: 'task.failed', seq: '4-0', task_id: 't3', error_code: 'SCHEMA_INVALID',
        message: 'Schema invalid after the targeted revision', retryable: true },
      { event: 'batch.completed', seq: '5-0', batch_id: 'b1', overall_status: 'partial', completed: 2, failed: 1 });
    expect([s.cards.t1.status, s.cards.t2.status, s.cards.t3.status]).toEqual(['ready', 'ready', 'error']);
    expect(s.cards.t1.artifact).toBeDefined();
    expect(s.cards.t3.error?.retryable).toBe(true);
    expect(s.overall).toBe('partial');
  });

  it('ignores a frame for a task this page does not know', () => {
    const s = apply(initial, { event: 'task.progress', seq: '6-0', task_id: 'other', status: 'running' });
    expect(s.cards).toEqual(initial.cards);
  });

  it('sends a regenerated card back to waiting and the batch back to running', () => {
    let s = apply(initial, { event: 'task.completed', seq: '7-0', task_id: 't1', artifact: ready });
    s = reducer({ ...s, overall: 'complete' }, { type: 'regenerating', task_id: 't1' });
    expect(s.cards.t1).toMatchObject({ status: 'waiting', artifact: undefined });
    expect(s.overall).toBe('running');
  });

  it('rebuilds ready and failed cards from a snapshot after a reconnect', () => {
    const view = fromSnapshot({
      batch_id: 'b1', source_id: 's1', global_config: ready.effective_config,
      overall_status: 'partial', stream_last_id: '9-0',
      artifacts: [ready, { ...waiting('t9', 'linkedin_post'), status: 'error', error_log: 'Schema invalid' }],
    } as BatchSnapshot);
    expect(view.cards[ready.task_id].artifact).toBeDefined();
    expect(view.cards.t9.error?.message).toBe('Schema invalid');
    expect(view.last_seq).toBe('9-0');
  });
});
