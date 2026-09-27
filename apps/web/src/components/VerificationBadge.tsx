import { useState } from 'react';
import type { Verification } from '@ps154/shared';

export function VerificationBadge({ score, v }: { score: number; v?: Verification | null }) {
  const [open, setOpen] = useState(false);
  const fixes = v?.fixes.length ?? 0;
  const flags = v?.open_issues.length ?? 0;
  const label = [score.toFixed(2),
    fixes ? `${fixes} fix${fixes > 1 ? 'es' : ''}` : '',
    flags ? `${flags} flag${flags > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  return (
    <div>
      <button onClick={() => setOpen(!open)} disabled={!fixes && !flags}
        className={`rounded px-2 py-0.5 text-xs font-medium ${flags
          ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
        {label}{fixes || flags ? (open ? ' \u25b4' : ' \u25be') : ''}
      </button>
      {open && v && (
        <ul className="mt-2 space-y-1 text-xs">
          {v.fixes.map((f) => <li key={f.key}><b>Repaired:</b> {f.detail}</li>)}
          {v.open_issues.map((f) => <li key={f.key}><b>For the reviewer:</b> {f.detail}</li>)}
        </ul>
      )}
    </div>
  );
}
