import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setToken } from '../api';
import Workspace from './Workspace';
import { artifact, fakeApi, jwt, snapshot, source } from '../test/fixtures';

class FakeSocket {
  static all: FakeSocket[] = [];
  onopen?: () => void; onmessage?: (e: { data: string }) => void; onclose?: () => void;
  constructor(public url: string) { FakeSocket.all.push(this); }
  close() { this.onclose?.(); }
  emit(data: unknown) { this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) }); }
}

const as = (role: string) => setToken(jwt({ id: 'u1', name: 'asha', role, exp: Math.floor(Date.now() / 1000) + 3600 }));
const show = () => render(
  <MemoryRouter initialEntries={['/batches/b1']}>
    <Routes><Route path="/batches/:id" element={<Workspace />} /></Routes>
  </MemoryRouter>);
const waiting = (id: string, format_id: 'advisory' | 'x_thread') => artifact({ task_id: id, format_id, status: 'waiting', content: null, grounding_score: null, verification: null, meta: null });

beforeEach(() => { FakeSocket.all = []; vi.stubGlobal('WebSocket', FakeSocket); as('operator'); });
afterEach(() => { setToken(null); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Workspace', () => {
  it('says the batch is missing instead of loading forever, and retries', async () => {
    let n = 0;
    fakeApi({
      'GET /jobs/b1': () => (++n === 1 ? { status: 404, body: { error: 'Batch not found' } } : { body: snapshot([artifact()]) }),
      'GET /sources/s1': { body: source() },
    });
    show();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/not found/i);
    await userEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByText(/1 of 1 ready/)).toBeInTheDocument();
  });

  it('applies live frames, ignores a malformed one, and reports it', async () => {
    fakeApi({ 'GET /jobs/b1': { body: snapshot([waiting('t1', 'advisory'), waiting('t2', 'x_thread')]) }, 'GET /sources/s1': { body: source() } });
    show();
    expect(await screen.findByText(/0 of 2 ready/)).toBeInTheDocument();
    const ws = FakeSocket.all[0];
    act(() => ws.onopen?.());
    expect(screen.getByText('Live')).toBeInTheDocument();

    act(() => ws.emit({ event: 'task.completed', seq: '1-0', task_id: 't1', artifact: artifact({ task_id: 't1', format_id: 'advisory' }) }));
    expect(await screen.findByText(/1 of 2 ready/)).toBeInTheDocument();

    act(() => ws.emit('not json'));
    act(() => ws.emit({ event: 'task.completed', seq: '2-0', task_id: 't2', artifact: { nonsense: true } }));
    expect(screen.getByText(/2 updates from the server could not be read/)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 ready/)).toBeInTheDocument(); // nothing was applied
  });

  it('shows a reconnecting notice, then a permanent one with a Reconnect button', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fakeApi({ 'GET /jobs/b1': { body: snapshot([artifact()]) }, 'GET /sources/s1': { body: source() } });
    show();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByText(/1 of 1 ready/)).toBeInTheDocument();

    for (let i = 0; i < 6; i++) {
      act(() => FakeSocket.all[FakeSocket.all.length - 1].onclose?.());
      if (i === 0) expect(screen.getByText(/Reconnecting; nothing is lost/)).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    }
    expect(screen.getByText(/Live updates are unavailable/)).toBeInTheDocument();
    const before = FakeSocket.all.length;
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(FakeSocket.all.length).toBe(before + 1);
  });

  it('puts a card back when regenerating it fails', async () => {
    fakeApi({
      'GET /jobs/b1': { body: snapshot([artifact()]) }, 'GET /sources/s1': { body: source() },
      'POST /tasks/t1/regenerate': { status: 500, body: { error: 'Queue is down' } },
    });
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Regenerate' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Regenerate' }));
    await waitFor(() => expect(screen.getByText(/1 of 1 ready/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument(); // the card is back, not stuck on "Queued"
    expect(screen.queryByText(/Queued/)).not.toBeInTheDocument();
  });

  it('filters the outputs by state', async () => {
    fakeApi({ 'GET /jobs/b1': { body: snapshot([artifact(), waiting('t2', 'x_thread')]) }, 'GET /sources/s1': { body: source() } });
    show();
    await screen.findByText(/1 of 2 ready/);
    await userEvent.click(screen.getByRole('button', { name: /^Failed · 0/ }));
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Ready · 1/ }));
    expect(screen.getByRole('article', { name: 'LinkedIn post' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'X thread' })).not.toBeInTheDocument();
  });

  it('submits an artefact for review', async () => {
    const api = fakeApi({
      'GET /jobs/b1': { body: snapshot([artifact()]) }, 'GET /sources/s1': { body: source() },
      'POST /tasks/t1/submit': { body: { review_state: 'submitted' } },
    });
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));
    await waitFor(() => expect(screen.getByText('submitted')).toBeInTheDocument());
    expect(api.calls).toContain('POST /tasks/t1/submit');
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
  });

  it('lets a reviewer approve or reject, and rejecting needs a reason', async () => {
    as('reviewer');
    let posted: any;
    fakeApi({
      'GET /jobs/b1': { body: snapshot([artifact({ review_state: 'submitted' })]) }, 'GET /sources/s1': { body: source() },
      'POST /tasks/t1/review': (init) => { posted = JSON.parse(String(init.body)); return { body: { review_state: 'rejected' } }; },
    });
    show();
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument(); // reviewers do not write
    expect(screen.queryByRole('button', { name: /submit for review/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Reject' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'The 37 figure is unsourced');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);

    await waitFor(() => expect(posted).toEqual({ decision: 'reject', comment: 'The 37 figure is unsourced' }));
    expect(await screen.findByText(/The 37 figure is unsourced/)).toBeInTheDocument();
  });

  it('does not offer review actions to an operator', async () => {
    fakeApi({ 'GET /jobs/b1': { body: snapshot([artifact({ review_state: 'submitted' })]) }, 'GET /sources/s1': { body: source() } });
    show();
    await screen.findByText(/1 of 1 ready/);
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});
