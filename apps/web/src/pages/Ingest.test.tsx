import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import Ingest from './Ingest';

const show = () => render(<MemoryRouter><Ingest /></MemoryRouter>);
const go = () => screen.getByRole('button', { name: /extract facts/i });
const REPORT = 'Between 3 and 9 September, sector monitoring recorded a campaign against VPN gateways.';

describe('Ingest', () => {
  it('holds Continue back until there is enough text, and says why', async () => {
    const user = userEvent.setup();
    show();
    expect(go()).toBeDisabled();

    await user.type(screen.getByLabelText('Paste source text'), 'too short');
    expect(go()).toBeDisabled();
    expect(screen.getByText(/at least 50 characters/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Paste source text'));
    await user.click(screen.getByLabelText('Paste source text'));
    await user.paste(REPORT);
    expect(go()).toBeEnabled();
  });

  it('defaults to Internal and lets the operator choose Restricted, with its consequence stated', async () => {
    const user = userEvent.setup();
    show();
    expect(screen.getByRole('radio', { name: /Internal/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Restricted/ }));
    expect(screen.getByRole('radio', { name: /Restricted/ })).toBeChecked();
    expect(screen.getByText(/Never sent to an external provider/)).toBeInTheDocument();
  });

  it('shows an uploaded file, uses it instead of pasted text, and can remove it', async () => {
    const user = userEvent.setup();
    show();
    await user.upload(screen.getByLabelText('Upload a file'),
      new File(['%PDF-1.4'], 'incident-report.pdf', { type: 'application/pdf' }));

    expect(screen.getByText('incident-report.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText('Paste source text')).toBeDisabled();
    expect(go()).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByText('incident-report.pdf')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Paste source text')).toBeEnabled();
    expect(go()).toBeDisabled();
  });

  it('refuses a file type the server would reject', async () => {
    const user = userEvent.setup({ applyAccept: false }); // let the wrong type reach our own check
    show();
    await user.upload(screen.getByLabelText('Upload a file'), new File(['MZ'], 'setup.exe'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Use PDF, DOCX, TXT or MD/);
    expect(go()).toBeDisabled();
  });
});
