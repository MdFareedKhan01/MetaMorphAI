import type { Artifact } from '../shared-temp';
import advisory from '../mocks/advisory.ready.json';
import { CardView } from '../components/Card';
import { CardBoundary } from '../components/CardBoundary';

const a = advisory as unknown as Artifact;
const base = { task_id: a.task_id, format_id: a.format_id, effective_config: a.effective_config };
const CARDS = [
  { ...base, status: 'waiting' as const },
  { ...base, status: 'running' as const, started_at: Date.now() - 9000 },
  { ...base, status: 'revising' as const, detail: '1 finding', started_at: Date.now() - 14000 },
  { ...base, status: 'error' as const, error: { code: 'SCHEMA_INVALID', message: 'Schema invalid after the targeted revision', retryable: true } },
  { ...base, status: 'ready' as const, artifact: a },
];

export default function Gallery() {
  return (
    <main className="grid gap-4 bg-slate-50 p-6 md:grid-cols-2">
      {CARDS.map((c, i) => (
        <CardBoundary key={i} label={c.format_id}>
          <CardView card={c} globalConfig={a.effective_config} onRegenerate={() => {}} />
        </CardBoundary>
      ))}
    </main>
  );
}
