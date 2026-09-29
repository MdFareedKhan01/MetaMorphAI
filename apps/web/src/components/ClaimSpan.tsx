import type { Claim } from '@ps154/shared';
import { useSelection } from '../selection';

/** Every claim reads as clickable; how it is underlined says how far the source supports it. */
export function ClaimSpan({ claim }: { claim: Claim }) {
  const { active, select } = useSelection();
  if (claim.status === 'framing') return <span>{claim.text} </span>;
  // Compare by object, not id: every card numbers its claims from c1.
  const isActive = active === claim;
  const inferred = claim.grounded && claim.status === 'inference';
  const unverified = !claim.grounded;

  const underline = unverified
    ? 'underline decoration-amber-500 decoration-wavy decoration-1 underline-offset-[5px]'
    : inferred
      ? 'underline decoration-sky-500 decoration-dotted decoration-2 underline-offset-[5px]'
      : 'underline decoration-slate-300 decoration-1 underline-offset-[5px]';
  const rest = isActive
    ? 'bg-yellow-200 ring-2 ring-yellow-300'
    : unverified ? 'bg-amber-50 hover:bg-amber-100'
      : 'hover:bg-teal-50 hover:decoration-teal-600';

  const toggle = () => select(isActive ? null : claim);
  const cites = claim.source_refs.length
    ? `Cites ${claim.source_refs.join(', ')}` : 'Cites no passage in the source';
  return (
    <>
      <span role="button" tabIndex={0} title={cites} aria-pressed={isActive}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        className={`cursor-pointer rounded-[3px] px-0.5 transition-colors [box-decoration-break:clone] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${underline} ${rest}`}>
        {claim.text}
        {inferred &&
          <span className="ml-1.5 inline-block rounded-full bg-sky-50 px-1.5 py-px align-[2px] text-[10.5px] font-semibold uppercase leading-4 tracking-wide text-sky-700 ring-1 ring-sky-200 no-underline">inferred</span>}
        {unverified &&
          <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-1.5 py-px align-[2px] text-[10.5px] font-semibold uppercase leading-4 tracking-wide text-amber-800 ring-1 ring-amber-300 no-underline">unverified</span>}
      </span>{' '}
    </>
  );
}
