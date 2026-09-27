import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigPanel, type FormatOption } from './ConfigPanel';

const FORMATS: FormatOption[] = [
  { id: 'advisory', label: 'Security advisory' },
  { id: 'executive_summary', label: 'Executive summary' },
  { id: 'linkedin_post', label: 'LinkedIn post' },
];
const toneOf = (label: string) => within(screen.getByText(label).closest('li')!).getAllByRole('combobox')[0];

describe('ConfigPanel (SRS §10.2)', () => {
  it('sends an override only for the format that has one (AC-11)', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<ConfigPanel formats={FORMATS} busy={false} onGenerate={onGenerate} />);
    await user.selectOptions(toneOf('LinkedIn post'), 'conversational');
    await user.click(screen.getByRole('button', { name: 'Generate 3' }));
    expect(onGenerate).toHaveBeenCalledWith({
      global_config: { audience: 'Senior government officials', tone: 'formal', detail: 'medium', language: 'en' },
      formats: [{ format_id: 'advisory' }, { format_id: 'executive_summary' },
                { format_id: 'linkedin_post', overrides: { tone: 'conversational' } }],
    });
  });

  it('drops an override set back to "same as global"', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<ConfigPanel formats={FORMATS} busy={false} onGenerate={onGenerate} />);
    await user.selectOptions(toneOf('LinkedIn post'), 'conversational');
    await user.selectOptions(toneOf('LinkedIn post'), 'same as global');
    await user.click(screen.getByRole('button', { name: 'Generate 3' }));
    expect(onGenerate.mock.calls[0][0].formats[2]).toEqual({ format_id: 'linkedin_post' });
  });

  it('disables Generate when no format is selected (FR-13)', async () => {
    const user = userEvent.setup();
    render(<ConfigPanel formats={FORMATS} busy={false} onGenerate={() => {}} />);
    for (const f of FORMATS) await user.click(within(screen.getByText(f.label).closest('li')!).getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Generate 0' })).toBeDisabled();
  });
});
