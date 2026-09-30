import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { getToken, setToken } from '../api';
import AppShell from './AppShell';
import { jwt } from '../test/fixtures';

const show = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/gallery" element={<p>Gallery page</p>} />
      </Route>
    </Routes>
  </MemoryRouter>);

beforeEach(() => setToken(jwt({ id: 'u1', name: 'asha', role: 'reviewer', exp: Math.floor(Date.now() / 1000) + 3600 })));
afterEach(() => setToken(null));

describe('AppShell', () => {
  it('shows who is signed in and their role, and titles the page', async () => {
    show();
    expect(screen.getByText('reviewer')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('New source · MetaMorph-AI'));
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
  });

  it('opens the account menu, closes it with Escape, and returns focus to its button', async () => {
    const user = userEvent.setup();
    show();
    const button = screen.getByRole('button', { name: /account menu for asha/i });
    await user.click(button);
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Sign out' })).not.toBeInTheDocument());
    await waitFor(() => expect(button).toHaveFocus());
  });

  it('signs out and goes to the sign-in page', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('button', { name: /account menu for asha/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it('has a navigation drawer for small screens that Escape closes', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawerNav = await screen.findAllByRole('navigation', { name: 'Main navigation' });
    expect(drawerNav.length).toBeGreaterThan(0);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Close navigation' })).not.toBeInTheDocument());
  });
});
