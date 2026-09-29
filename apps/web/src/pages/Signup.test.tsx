import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import Signup from './Signup';

describe('Signup', () => {
  it('renders the account creation form and sign-in link', () => {
    render(<MemoryRouter><Signup /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/8\+ characters/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });
});