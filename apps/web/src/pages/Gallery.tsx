import { useMemo, useState } from 'react';
import type { Claim } from '@ps154/shared';
import type { Artifact } from '../shared-temp';
import advisory from '../mocks/advisory.ready.json';
import { DEMO_SOURCE, DEMO_SPANS } from '../mocks/demo-source';
import { SelectionContext } from '../selection';
import { CardView } from '../components/Card';
import { CardBoundary } from '../components/CardBoundary';
import { SourcePane } from '../components/SourcePane';

const a = advisory as unknown as Artifact;
const base = { task_id: a.task_id, format_id: a.format_id, effective_config: a.effective_config };
const CARDS = [
  { ...base, status: 'waiting' as const },
  { ...base, status: 'running' as const, started_at: Date.now() - 9000 },
  { ...base, status: 'revising' as const, detail: '1 finding', started_at: Date.now() - 14000 },
  { ...base, status: 'error' as const, error: { code: 'SCHEMA_INVALID', message: 'Schema invalid after the targeted revision', retryable: true } },
  { ...base, status: 'ready' as const, artifact: a },
];

/** Offline demo of AC-2 for screenshots — click a sentence in the ready card, left. */
function ProvenanceDemo() {
  const [active, select] = useState<Claim | null>(null);
  const refs = useMemo(() => new Set(active?.source_refs ?? []), [active]);
  return (
    <SelectionContext.Provider value={{ active, select }}>
      <section className="mb-8 grid gap-4 rounded-lg border-2 border-dashed border-sky-300 bg-white p-4 lg:grid-cols-[3fr_2fr]">
        <div className="max-h-[420px] overflow-y-auto rounded border p-4">
          <SourcePane raw={DEMO_SOURCE} spans={DEMO_SPANS} active={refs} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-sky-700">
            Click any underlined sentence in the card → its source highlights here (AC-2 demo)
          </p>
          <CardBoundary label="advisory">
            <CardView card={{ ...base, status: 'ready', artifact: a }} globalConfig={a.effective_config} onRegenerate={() => {}} />
          </CardBoundary>
        </div>
      </section>
    </SelectionContext.Provider>
  );
}

export default function Gallery() {
  return (
    <main className="bg-slate-50 p-6">
      <ProvenanceDemo />
      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map((c, i) => (
          <CardBoundary key={i} label={c.format_id}>
            <CardView card={c} globalConfig={a.effective_config} onRegenerate={() => {}} />
          </CardBoundary>
        ))}
      </div>
    </main>
  );
}
