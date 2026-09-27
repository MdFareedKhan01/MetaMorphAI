import type { ReactNode } from 'react';
import type { Canonical } from '@ps154/shared';

const SEVERITY: Record<string, string> = {
  critical: 'bg-red-700 text-white', high: 'bg-orange-600 text-white',
  medium: 'bg-amber-400 text-black', low: 'bg-slate-300 text-black', unknown: 'bg-slate-100 text-slate-700',
};

export function SeverityPill({ value }: { value: string }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY[value]}`}>{value}</span>;
}

export function FactsPanel({ c }: { c: Canonical }) {
  const actors = c.entities.filter((e) => e.type === 'threat_actor').map((e) => e.name);
  const row = (label: string, value: ReactNode) => (
    <div className="flex gap-3"><dt className="w-24 shrink-0 text-slate-500">{label}</dt><dd>{value}</dd></div>);
  return (
    <aside className="space-y-3 text-sm">
      <h2 className="font-semibold uppercase tracking-wide text-slate-500">Extracted facts</h2>
      <dl className="space-y-1">
        {row('Severity', <SeverityPill value={c.severity.value} />)}
        {actors.length > 0 && row('Actor', actors.join(', '))}
        {row('Systems', c.affected_systems.map((s) => s.name).join('; ') || '—')}
        {row('Indicators', c.indicators.length)}
      </dl>
      <ul className="list-disc space-y-1 pl-5">
        {c.key_facts.map((f, i) => (
          <li key={i}>{f.text} <span className="text-xs uppercase text-sky-700">
            {f.status === 'inference' ? 'inferred' : ''}</span></li>
        ))}
      </ul>
    </aside>
  );
}
