import type { Config } from '@ps154/shared';
import type { Artifact, BatchSnapshot, Frame } from '../shared-temp';

export type Card = {
  task_id: string;
  format_id: string;
  status: Artifact['status'];
  effective_config: Config;
  detail?: string;
  started_at?: number;
  artifact?: Artifact;
  error?: { code: string; message: string; retryable: boolean };
};
export type BatchView = {
  batch_id: string; overall: string; last_seq: string;
  global_config: Config; cards: Record<string, Card>;
};

export function fromSnapshot(s: BatchSnapshot): BatchView {
  const cards: Record<string, Card> = {};
  for (const a of s.artifacts) {
    cards[a.task_id] = {
      task_id: a.task_id, format_id: a.format_id, status: a.status, effective_config: a.effective_config,
      artifact: a.status === 'ready' ? a : undefined,
      error: a.status === 'error'
        ? { code: 'FAILED', message: a.error_log ?? 'Generation failed', retryable: true } : undefined,
    };
  }
  return { batch_id: s.batch_id, overall: s.overall_status, last_seq: s.stream_last_id,
           global_config: s.global_config, cards };
}

export type Action =
  | { type: 'frame'; frame: Frame }
  | { type: 'regenerating'; task_id: string };

export function reducer(state: BatchView, action: Action): BatchView {
  if (action.type === 'regenerating') {
    return { ...patch(state, action.task_id,
      { status: 'waiting', artifact: undefined, error: undefined, detail: undefined }), overall: 'running' };
  }
  const f = action.frame;
  const s = { ...state, last_seq: f.seq };
  switch (f.event) {
    case 'task.progress':
      return patch(s, f.task_id, {
        status: f.status, detail: f.detail,
        started_at: f.status === 'running' ? Date.now() : state.cards[f.task_id]?.started_at });
    case 'task.completed':
      return patch(s, f.task_id, { status: 'ready', artifact: f.artifact, error: undefined, detail: undefined });
    case 'task.failed':
      return patch(s, f.task_id, { status: 'error',
        error: { code: f.error_code, message: f.message, retryable: f.retryable } });
    case 'batch.completed':
      return { ...s, overall: f.overall_status };
  }
}

function patch(s: BatchView, id: string, p: Partial<Card>): BatchView {
  const prev = s.cards[id];
  if (!prev) return s; // a frame for a task this page does not know: ignore it
  return { ...s, cards: { ...s.cards, [id]: { ...prev, ...p } } };
}