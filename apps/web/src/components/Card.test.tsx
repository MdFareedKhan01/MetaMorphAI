import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Artifact } from '@ps154/shared';
import advisory from '../mocks/advisory.ready.json';
import type { Card } from '../batch/state';
import { CardView } from './Card';
import { CardBoundary } from './CardBoundary';
import { VerificationBadge } from './VerificationBadge';

const a = advisory as unknown as Artifact;
const base: Card = { task_id: 't1', format_id: 'linkedin_post', status: 'waiting', effective_config: a.effective_config };
const show = (card: Partial<Card>, onRegenerate = () => {}) =>
  render(<CardView card={{ ...base, ...card }} globalConfig={a.effective_config} onRegenerate={onRegenerate} />);

afterEach(() => { vi.restoreAllMocks(); });

describe('the running timer', () => {
  it('counts up even when the card has no recorded start time', async () => {
    vi.useFakeTimers();
    try {
      show({ status: 'running' }); // e.g. the worker started before this page loaded
      expect(screen.getByText(/Writing · 00:00/)).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
      expect(screen.getByText(/Writing · 00:03/)).toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });
});

describe('cards (SRS §11.3)', () => {
  it('tells a queued card from a running one', () => {
    const { unmount } = show({ status: 'waiting' });
    expect(screen.getByText(/Queued/)).toBeInTheDocument();
    unmount();
    show({ status: 'running', started_at: Date.now() });
    expect(screen.getByText(/Writing/)).toBeInTheDocument();
  });

  it('offers Retry on a failed card (AC-9)', async () => {
    const onRegenerate = vi.fn();
    show({ status: 'error', error: { code: 'SCHEMA_INVALID', message: 'Schema invalid after the targeted revision',
                                     retryable: true } }, onRegenerate);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it('keeps the other cards on screen when one renderer crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs every error a boundary catches
    const Broken = (): never => { throw new Error('malformed content'); };
    render(<>
      <CardBoundary label="linkedin_post"><Broken /></CardBoundary>
      <CardBoundary label="advisory"><p>Advisory content</p></CardBoundary>
    </>);
    expect(screen.getByText(/linkedin_post crashed/)).toBeInTheDocument();
    expect(screen.getByText('Advisory content')).toBeInTheDocument();
  });
});

describe('where the text came from', () => {
  const full = (provider: 'cloud' | 'local', model: string) =>
    ({ provider, model, fallback_reason: null, attempts: 1, latency_ms: 1, perturbed: false });
  const ready = (meta: Artifact['meta']) => show({ status: 'ready', artifact: { ...a, meta } as Artifact });

  it('never calls the offline stub "processed on this machine"', () => {
    // The stub reports provider "local", which used to earn the green pill.
    ready(full('local', 'offline-stub (no model ran)'));
    expect(screen.getByText('offline stub · no model ran')).toBeInTheDocument();
    expect(screen.queryByText('processed on this machine')).not.toBeInTheDocument();
  });

  it('still says "processed on this machine" for a real local model', () => {
    ready(full('local', 'qwen2.5:7b'));
    expect(screen.getByText('processed on this machine')).toBeInTheDocument();
  });

  it('renders an advisory whose severity has the wrong shape as "unknown", not a crash', () => {
    const content = { ...(a.content as object), severity: { value: 'high', source_refs: [] } };
    show({ status: 'ready', artifact: { ...a, content } as Artifact });
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});

describe('VerificationBadge (AC-16)', () => {
  it('shows the fix count, then what was repaired', async () => {
    render(<VerificationBadge score={0.8} v={a.verification} />);
    await userEvent.click(screen.getByRole('button', { name: /0\.80 · 1 fix/ }));
    expect(screen.getByText(/Repaired:/)).toBeInTheDocument();
  });

  it('lists an unresolved finding for the reviewer', async () => {
    const v = { ...a.verification!, fixes: [], open_issues: a.verification!.fixes };
    render(<VerificationBadge score={0.8} v={v} />);
    await userEvent.click(screen.getByRole('button', { name: /1 flag/ }));
    expect(screen.getByText(/For the reviewer:/)).toBeInTheDocument();
  });
});

describe('advisory indicators', () => {
  const claim = (id: string) => ({ id, text: `Claim ${id}.`, source_refs: ['span_1'], status: 'fact', grounded: true });
  const advisoryWith = (n: number) => ({
    ...a, format_id: 'advisory',
    content: { title: 'T', severity: 'high', summary: [claim('c1')], affected_systems: [claim('c2')], mitigations: [claim('c3')], references: [],
      indicators: Array.from({ length: n }, (_, i) => ({ type: 'url', value: `https://example.org/${i}` })) },
  }) as unknown as Artifact;

  it('folds a long indicator list away until it is asked for, and scrolls once open', async () => {
    show({ status: 'ready', format_id: 'advisory', artifact: advisoryWith(12) });
    const summary = screen.getByText('Indicators').closest('summary')!;
    const details = summary.closest('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(summary).toHaveTextContent('12');

    await userEvent.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getByRole('list', { name: 'Indicators of compromise' })).toHaveClass('overflow-y-auto', 'max-h-56');
  });

  it('shows no indicator section when there are none', () => {
    show({ status: 'ready', format_id: 'advisory', artifact: advisoryWith(0) });
    expect(screen.queryByText('Indicators')).not.toBeInTheDocument();
  });

  it('no longer tags a card as overridden', () => {
    show({ effective_config: { ...a.effective_config, tone: 'conversational' } });
    expect(screen.queryByText(/overridden/)).not.toBeInTheDocument();
  });
});
