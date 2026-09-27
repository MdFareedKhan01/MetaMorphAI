import { useEffect, useState } from 'react';
import type { Config } from '@ps154/shared';
import type { Artifact } from '../shared-temp';
import type { Card } from '../batch/state';
import { download } from '../api';
import { RENDERERS, GenericView } from '../renderers';
import { VerificationBadge } from './VerificationBadge';

const LABELS: Record<string, string> = { advisory: 'Security advisory', executive_summary: 'Executive summary',
  linkedin_post: 'LinkedIn post', x_thread: 'X thread', video_package: 'Video package' };
const PHASE: Record<string, string> = { running: 'Writing', validating: 'Checking facts', revising: 'Repairing' };

export function CardView({ card, globalConfig, onRegenerate }:
    { card: Card; globalConfig: Config; onRegenerate: () => void }) {
  const overridden = (['audience', 'tone', 'detail', 'language'] as const)
    .filter((k) => card.effective_config[k] !== globalConfig[k]);
  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm">
      <header className="mb-3 flex items-center gap-3">
        <h3 className="font-semibold uppercase tracking-wide">{LABELS[card.format_id] ?? card.format_id}</h3>
        {overridden.length > 0 && (
          <span className="rounded bg-violet-100 px-2 text-xs text-violet-800">{overridden.join(', ')} overridden</span>)}
        {(card.artifact?.version ?? 1) > 1 && <span className="text-xs text-slate-500">v{card.artifact!.version}</span>}
        <span className="ml-auto text-xs font-medium uppercase text-slate-500">{card.status}</span>
      </header>
      {card.status === 'ready' && card.artifact ? <Ready a={card.artifact} onRegenerate={onRegenerate} />
        : card.status === 'error' ? <Failed message={card.error?.message} onRetry={onRegenerate} />
        : <Working card={card} />}
    </article>
  );
}

function Working({ card }: { card: Card }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (card.status === 'waiting') return <p className="text-sm text-slate-500">Queued — starts when one of three slots frees.</p>;
  const s = card.started_at ? Math.floor((now - card.started_at) / 1000) : 0;
  return (
    <div className="space-y-2">
      <p className="text-sm">{PHASE[card.status]}{card.detail ? ` — ${card.detail}` : ''} · {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</p>
      <div className="h-2 animate-pulse rounded bg-slate-200" />
      <div className="h-2 w-2/3 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function Ready({ a, onRegenerate }: { a: Artifact; onRegenerate: () => void }) {
  const View = RENDERERS[a.format_id] ?? GenericView;
  return (
    <>
      <View content={a.content} />
      <footer className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
        <VerificationBadge score={a.grounding_score ?? 0} v={a.verification} />
        {a.meta?.provider === 'local' && <span className="rounded bg-emerald-100 px-2 text-xs text-emerald-800">processed on this machine</span>}
        {a.meta?.provider === 'cache' && <span className="rounded bg-amber-100 px-2 text-xs text-amber-900">served from the offline pack</span>}
        <span className="flex-1" />
        <button onClick={onRegenerate} className="rounded border px-3 py-1">Regenerate</button>
        <button onClick={() => download(`/tasks/${a.task_id}/export?as=md`, `${a.format_id}-v${a.version}.md`)}
          className="rounded border px-3 py-1">Export .md</button>
      </footer>
    </>
  );
}

function Failed({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-red-800">{message ?? 'Generation failed'}</p>
      <button onClick={onRetry} className="rounded border px-3 py-1">Retry</button>
    </div>
  );
}
