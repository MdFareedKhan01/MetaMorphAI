import { useMemo, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Claim } from '@ps154/shared';
import { splitSpans } from '../shared-temp';
import { SelectionContext } from '../selection';
import { ClaimSpan } from './ClaimSpan';
import { SourcePane } from './SourcePane';

const raw = 'Three organisations confirmed a compromise.\nThe rest were potentially exposed.';
const spans = splitSpans(raw, [raw]); // one PDF page, so spans carry page 1

const fact: Claim = { id: 'c1', text: 'Three utilities confirmed credential theft.',
                      source_refs: ['span_1'], status: 'fact', grounded: true };
const inferred: Claim = { id: 'c2', text: 'The other organisations may have been exposed.',
                          source_refs: ['span_2'], status: 'inference', grounded: true };
const unverified: Claim = { id: 'c3', text: 'Treat every VPN login as hostile.',
                            source_refs: [], status: 'inference', grounded: false };
const framing: Claim = { id: 'c4', text: 'Here is what to do.', source_refs: [], status: 'framing', grounded: true };

/** The workspace in miniature: shared selection, a source pane and some claims. */
function Harness({ claims }: { claims: Claim[] }) {
  const [active, select] = useState<Claim | null>(null);
  const refs = useMemo(() => new Set(active?.source_refs ?? []), [active]);
  return (
    <SelectionContext.Provider value={{ active, select }}>
      <SourcePane raw={raw} spans={spans} active={refs} />
      <p>{claims.map((c, i) => <ClaimSpan key={i} claim={c} />)}</p>
    </SelectionContext.Provider>
  );
}

describe('provenance (SRS §11.4)', () => {
  it('highlights the cited passage and its page when a claim is clicked, and clears on a second click (AC-2)', async () => {
    const user = userEvent.setup();
    render(<Harness claims={[inferred]} />);
    const passage = screen.getByText('The rest were potentially exposed.');
    expect(passage).not.toHaveClass('bg-yellow-200');

    await user.click(screen.getByRole('button', { name: /other organisations/ }));
    expect(passage).toHaveClass('bg-yellow-200');
    expect(screen.getByText('p.1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /other organisations/ }));
    expect(passage).not.toHaveClass('bg-yellow-200');
  });

  it('tags inferred and unverified claims, and leaves framing unclickable', () => {
    render(<Harness claims={[fact, inferred, unverified, framing]} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByText('inferred')).toBeInTheDocument();
    expect(screen.getByText('unverified')).toBeInTheDocument();
    expect(screen.getByText('Here is what to do.')).toBeInTheDocument();
  });

  it('selects one claim even when two cards reuse the same id', async () => {
    const user = userEvent.setup();
    render(<Harness claims={[fact, { ...fact, text: 'A second card says the same.' }]} />);
    await user.click(screen.getByRole('button', { name: /Three utilities/ }));
    expect(screen.getByRole('button', { name: /Three utilities/ })).toHaveClass('bg-yellow-200');
    expect(screen.getByRole('button', { name: /second card/ })).not.toHaveClass('bg-yellow-200');
  });
});
