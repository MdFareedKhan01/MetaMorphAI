import { useEffect, useState } from 'react';
import type { Config } from '@ps154/shared';
import type { Artifact } from '../shared-temp';
import type { Card } from '../batch/state';
import { download } from '../api';
import { RENDERERS, GenericView } from '../renderers';
import { VerificationBadge } from './VerificationBadge';

const LABELS: Record<string, string> = { advisory: 'Security advisory', executive_summary: 'Executive summary',
  linkedin_post: 'LinkedIn post', x_thread: 'X thread', video_package: 'Video package' };
const MARKS: Record<string, string> = { advisory: 'SA', executive_summary: 'ES', linkedin_post: 'in', x_thread: 'X', video_package: 'VP' };
const PHASE: Record<string, string> = { running: 'Writing', validating: 'Checking facts', revising: 'Repairing' };
const STEP: Record<string, number> = { running: 0, validating: 1, revising: 2 };
const STEPS = ['Draft', 'Check', 'Repair'];
const PILL: Record<string, string> = {
  waiting: 'bg-slate-100 text-slate-600 ring-slate-200', running: 'bg-sky-50 text-sky-800 ring-sky-200',
  validating: 'bg-indigo-50 text-indigo-800 ring-indigo-200', revising: 'bg-amber-50 text-amber-900 ring-amber-200',
  ready: 'bg-emerald-50 text-emerald-800 ring-emerald-200', error: 'bg-red-50 text-red-800 ring-red-200',
};
const LIVE = ['running', 'validating', 'revising'];

export function CardView({ card, globalConfig, onRegenerate }:
    { card: Card; globalConfig: Config; onRegenerate: () => void }) {
  const overridden = (['audience', 'tone', 'detail', 'language'] as const)
    .filter((k) => card.effective_config[k] !== globalConfig[k]);
  const cfg = card.effective_config;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.05),0_8px_24px_-12px_rgba(16,24,40,.10)]">
      <header className="flex items-center gap-3 px-6 pb-3 pt-5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-[13px] font-bold text-teal-800 ring-1 ring-teal-100">
          {MARKS[card.format_id] ?? '··'}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-slate-900">{LABELS[card.format_id] ?? card.format_id}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{cfg.audience} · {cfg.tone} · {cfg.detail}</p>
        </div>
        {overridden.length > 0 && (
          <span className="shrink-0 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-violet-200">{overridden.join(', ')} overridden</span>)}
        {(card.artifact?.version ?? 1) > 1 && <span className="text-xs font-medium text-slate-500">v{card.artifact!.version}</span>}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${PILL[card.status]}`}>
          {LIVE.includes(card.status) && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
          {card.status}
        </span>
      </header>
      <div className="px-6 pb-5 pt-1">
        {card.status === 'ready' && card.artifact ? <Ready a={card.artifact} onRegenerate={onRegenerate} />
          : card.status === 'error' ? <Failed message={card.error?.message} onRetry={onRegenerate} />
          : <Working card={card} />}
      </div>
    </article>
  );
}

const Skeleton = () => (
  <div className="space-y-2.5" aria-hidden>
    <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
    <div className="h-2.5 w-11/12 animate-pulse rounded-full bg-slate-100" />
    <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-slate-100" />
  </div>
);

function Working({ card }: { card: Card }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (card.status === 'waiting') {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-600">
          Queued — starts when one of three slots frees.
        </p>
        <Skeleton />
      </div>
    );
  }
  const s = card.started_at ? Math.floor((now - card.started_at) / 1000) : 0;
  const at = STEP[card.status] ?? 0;
  return (
    <div className="space-y-4">
      <ol className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide" aria-hidden>
        {STEPS.map((name, i) => (
          <li key={name} className="flex flex-1 items-center gap-2">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
              i < at ? 'bg-teal-600 text-white' : i === at ? 'bg-teal-50 text-teal-800 ring-2 ring-teal-500' : 'bg-slate-100 text-slate-400'}`}>
              {i < at ? '✓' : i + 1}
            </span>
            <span className={i <= at ? 'text-slate-800' : 'text-slate-400'}>{name}</span>
            {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < at ? 'bg-teal-500' : 'bg-slate-200'}`} />}
          </li>
        ))}
      </ol>
      <p className="text-sm text-slate-700">
        {PHASE[card.status]}{card.detail ? ` — ${card.detail}` : ''} · {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
      </p>
      <Skeleton />
    </div>
  );
}

const providerNote = (p?: string) =>
  p === 'local' ? { text: 'processed on this machine', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }
  : p === 'cache' ? { text: 'served from the offline pack', tone: 'bg-amber-50 text-amber-900 ring-amber-200' }
  : null;

function Ready({ a, onRegenerate }: { a: Artifact; onRegenerate: () => void }) {
  const View = RENDERERS[a.format_id] ?? GenericView;
  const note = providerNote(a.meta?.provider);
  return (
    <>
      <View content={a.content} />
      <footer className="mt-5 flex flex-wrap items-start gap-x-3 gap-y-3 border-t border-slate-100 pt-4 text-sm">
        <VerificationBadge score={a.grounding_score ?? 0} v={a.verification} />
        {note && <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${note.tone}`}>{note.text}</span>}
        <span className="flex-1" />
        <button onClick={onRegenerate}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50">Regenerate</button>
        <button onClick={() => download(`/tasks/${a.task_id}/export?as=md`, `${a.format_id}-v${a.version}.md`)}
          className="rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-1.5 font-medium text-teal-800 transition-colors hover:bg-teal-100">Export .md</button>
      </footer>
    </>
  );
}

function Failed({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
      <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-600 text-sm font-bold text-white">!</span>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-sm leading-6 text-red-900">{message ?? 'Generation failed'}</p>
        <button onClick={onRetry}
          className="rounded-lg border border-red-300 bg-white px-3.5 py-1.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-50">Retry</button>
      </div>
    </div>
  );
}
