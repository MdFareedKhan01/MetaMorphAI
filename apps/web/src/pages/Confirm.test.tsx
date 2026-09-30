import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setToken } from '../api';
import Confirm from './Confirm';
import { fakeApi, jwt, source } from '../test/fixtures';

const show = () => render(
  <MemoryRouter initialEntries={['/sources/s1']}>
    <Routes>
      <Route path="/sources/:id" element={<Confirm />} />
      <Route path="/batches/:id" element={<p>Workspace opened</p>} />
    </Routes>
  </MemoryRouter>);

beforeEach(() => setToken(jwt({ id: 'u1', name: 'asha', role: 'operator', exp: Math.floor(Date.now() / 1000) + 3600 })));
afterEach(() => { setToken(null); vi.unstubAllGlobals(); });

describe('Confirm', () => {
  it('shows a loading state, then the source, facts and settings', async () => {
    fakeApi({ 'GET /sources/s1': { body: source() }, 'GET /formats': { body: [] } });
    show();
    expect(screen.getByRole('status')).toHaveTextContent(/loading the source/i);
    expect(await screen.findByRole('heading', { name: 'Extracted facts' })).toBeInTheDocument();
    expect(screen.getByText('Facts extracted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate 3' })).toBeEnabled();
  });

  it('says what went wrong when the source cannot be loaded, and retries', async () => {
    let calls = 0;
    fakeApi({ 'GET /sources/s1': () => (++calls === 1 ? { status: 404, body: { error: 'Source not found' } } : { body: source() }), 'GET /formats': { body: [] } });
    show();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/was not found/i);
    await userEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Extracted facts' })).toBeInTheDocument();
  });

  it('will not let a source with no extracted facts be generated', async () => {
    fakeApi({ 'GET /sources/s1': { body: source({ canonical: null }) }, 'GET /formats': { body: [] } });
    show();
    expect(await screen.findByText('No facts were extracted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate 3' })).toBeDisabled();
  });

  it('follows the formats list when it arrives after first render', async () => {
    fakeApi({
      'GET /sources/s1': { body: source() },
      'GET /formats': { body: [{ id: 'x_thread', label: 'X thread' }, { id: 'video_package', label: 'Video package' }] },
    });
    show();
    await screen.findByRole('heading', { name: 'Extracted facts' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate 2' })).toBeEnabled());
    expect(screen.queryByText('LinkedIn post')).not.toBeInTheDocument();
  });

  it('starts the batch and opens the workspace', async () => {
    const api = fakeApi({
      'GET /sources/s1': { body: source() }, 'GET /formats': { body: [] },
      'POST /jobs/batch': { status: 201, body: { batch_id: 'b1', stream_last_id: '0', tasks: [] } },
    });
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Generate 3' }));
    expect(await screen.findByText('Workspace opened')).toBeInTheDocument();
    expect(api.calls).toContain('POST /jobs/batch');
  });

  it('shows the server\'s refusal and lets the operator try again', async () => {
    fakeApi({
      'GET /sources/s1': { body: source() }, 'GET /formats': { body: [] },
      'POST /jobs/batch': { status: 409, body: { error: 'Facts have not been extracted from this source yet' } },
    });
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Generate 3' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/have not been extracted/i);
    expect(screen.getByRole('button', { name: 'Generate 3' })).toBeEnabled(); // busy is released
  });

  it('disables generation for a reviewer, who cannot start batches', async () => {
    setToken(jwt({ id: 'u2', name: 'rev', role: 'reviewer', exp: Math.floor(Date.now() / 1000) + 3600 }));
    fakeApi({ 'GET /sources/s1': { body: source() }, 'GET /formats': { body: [] } });
    show();
    expect(await screen.findByRole('button', { name: 'Generate 3' })).toBeDisabled();
    expect(screen.getByText(/cannot start a batch/i)).toBeInTheDocument();
  });
});
