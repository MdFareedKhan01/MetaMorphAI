import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Artifact } from '../shared-temp';
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

  it('badges a card whose config was overridden (AC-11)', () => {
    show({ effective_config: { ...a.effective_config, tone: 'conversational' } });
    expect(screen.getByText('tone overridden')).toBeInTheDocument();
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
