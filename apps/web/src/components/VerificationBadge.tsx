import { useState } from 'react';
import type { Verification } from '@ps154/shared';

/** Grounding score with a small meter; expands to what the verifier repaired and what it left open. */
export function VerificationBadge({ score, v }: { score: number; v?: Verification | null }) {
  const [open, setOpen] = useState(false);
  const fixes = v?.fixes.length ?? 0;
  const flags = v?.open_issues.length ?? 0;
  const label = [score.toFixed(2),
    fixes ? `${fixes} fix${fixes > 1 ? 'es' : ''}` : '',
    flags ? `${flags} flag${flags > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  const tone = flags
    ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
    : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100';
  const bar = flags ? 'bg-amber-500' : 'bg-emerald-500';
  const expandable = fixes > 0 || flags > 0;
  return (
    <div className="min-w-0">
      <button onClick={() => setOpen(!open)} disabled={!expandable} aria-expanded={expandable ? open : undefined}
        title="Grounding score: the share of claims whose wording overlaps the passage they cite"
        className={`inline-flex items-center gap-2.5 rounded-full border px-3 py-1 text-[13px] font-semibold tabular-nums transition-colors disabled:cursor-default ${tone}`}>
        <span aria-hidden className="block h-1.5 w-12 overflow-hidden rounded-full bg-black/10">
          <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%` }} />
        </span>
        <span>{label}{expandable ? (open ? ' ▴' : ' ▾') : ''}</span>
      </button>
      {open && v && (
        <ul className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13.5px] leading-6 text-slate-700">
          {v.fixes.map((f) => (
            <li key={`fix-${f.key}`} className="flex gap-2">
              <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span><b className="text-emerald-800">Repaired:</b> {f.detail}</span>
            </li>
          ))}
          {v.open_issues.map((f) => (
            <li key={`open-${f.key}`} className="flex gap-2">
              <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span><b className="text-amber-800">For the reviewer:</b> {f.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
