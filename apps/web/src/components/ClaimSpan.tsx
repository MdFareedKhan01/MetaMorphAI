import type { Claim } from '@ps154/shared';
import { useSelection } from '../selection';

export function ClaimSpan({ claim }: { claim: Claim }) {
  const { active, select } = useSelection();
  if (claim.status === 'framing') return <span>{claim.text} </span>;
  // Compare by object, not id: every card numbers its claims from c1.
  const isActive = active === claim;
  const style = !claim.grounded
    ? 'bg-amber-50 underline decoration-amber-500 decoration-wavy'
    : claim.status === 'inference'
      ? 'underline decoration-sky-500 decoration-dotted underline-offset-4'
      : 'hover:bg-sky-50 hover:underline';
  const toggle = () => select(isActive ? null : claim);
  return (
    <>
      <span role="button" tabIndex={0} onClick={toggle} onKeyDown={(e) => e.key === 'Enter' && toggle()}
        className={`cursor-pointer rounded-sm transition-colors ${style} ${isActive ? 'bg-yellow-200 ring-2 ring-yellow-400' : ''}`}>
        {claim.text}
        {claim.grounded && claim.status === 'inference' &&
          <sup className="ml-1 text-[10px] font-semibold uppercase text-sky-700">inferred</sup>}
        {!claim.grounded &&
          <sup className="ml-1 text-[10px] font-semibold uppercase text-amber-700">unverified</sup>}
      </span>{' '}
    </>
  );
}
