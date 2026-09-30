import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { api, ApiError, getToken, setToken } from './api';
import { Guard, SessionWatcher } from './session';
import Login from './pages/Login';
import { fakeApi, jwt } from './test/fixtures';

const later = (s: number) => Math.floor(Date.now() / 1000) + s;
const app = (initial = '/') => render(
  <MemoryRouter initialEntries={[initial]}>
    <SessionWatcher />
    <Routes>
      <Route path="/" element={<Guard><p>Private page</p></Guard>} />
      <Route path="/admin" element={<Guard roles={['admin']}><p>Admin page</p></Guard>} />
      <Route path="/login" element={<Login />} />
    </Routes>
  </MemoryRouter>);

beforeEach(() => setToken(null));
afterEach(() => { setToken(null); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('session', () => {
  it('sends a signed-out visitor to sign in', () => {
    app();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();
  });

  it('ends the session on a 401 and says why', async () => {
    setToken(jwt({ id: 'u1', name: 'asha', role: 'operator', exp: later(3600) }));
    fakeApi({ 'GET /sources/s1': { status: 401, body: { error: 'Unauthorized' } } });
    app();
    expect(screen.getByText('Private page')).toBeInTheDocument();

    await act(async () => { await api('/sources/s1').catch(() => {}); });
    expect(getToken()).toBeNull();
    expect(await screen.findByText(/your session expired/i)).toBeInTheDocument();
  });

  it('does not treat a wrong password as an expired session', async () => {
    fakeApi({ 'POST /auth/login': { status: 401, body: { error: 'Invalid credentials' } } });
    setToken(jwt({ id: 'u1', name: 'asha', role: 'operator', exp: later(3600) }));
    await api('/auth/login', { method: 'POST', body: '{}' }).catch(() => {});
    expect(getToken()).not.toBeNull();
  });

  it('ends the session at the token\'s own expiry, without waiting for a request', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    setToken(jwt({ id: 'u1', name: 'asha', role: 'operator', exp: later(60) }));
    app();
    expect(screen.getByText('Private page')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    expect(getToken()).toBeNull();
    expect(screen.getByText(/your session expired/i)).toBeInTheDocument();
  });

  it('keeps a signed-in user out of a page their role cannot use', () => {
    setToken(jwt({ id: 'u1', name: 'asha', role: 'operator', exp: later(3600) }));
    app('/admin');
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
    expect(screen.getByText('Private page')).toBeInTheDocument();
  });

  it('explains a failure in plain words: offline, forbidden, and a reply it cannot read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(api('/x')).rejects.toMatchObject({ network: true, message: expect.stringMatching(/cannot reach the server/i) });

    fakeApi({ 'GET /x': { status: 403, body: {} }, 'GET /y': { body: { unexpected: true } } });
    await expect(api('/x')).rejects.toMatchObject({ forbidden: true, message: expect.stringMatching(/permission/i) });
    const strict = { safeParse: (v: unknown) => (v as { id?: string }).id ? { success: true as const, data: v } : { success: false as const, error: { message: 'no id' } } };
    await expect(api('/y', {}, strict)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('Login after an expired session', () => {
  it('signs in and returns to the page the user was on', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    fakeApi({ 'POST /auth/login': { body: { token: jwt({ id: 'u1', name: 'asha', role: 'operator', exp: later(3600) }) } } });
    app('/');
    await userEvent.type(screen.getByPlaceholderText('operator'), 'asha');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'secret-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Private page')).toBeInTheDocument());
  });
});
