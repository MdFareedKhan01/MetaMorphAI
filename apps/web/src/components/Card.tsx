import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, ListItemText, Menu, MenuItem, TextField, Tooltip,
} from '@mui/material';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import type { Artifact, Config } from '@ps154/shared';
import type { Card } from '../batch/state';
import type { Role } from '../api';
import { canGenerate, canReview } from '../session';
import { RENDERERS, GenericView } from '../renderers';
import { VerificationBadge } from './VerificationBadge';
import { StatusChip } from './ui';

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

/** What the card may do. All optional, so the offline gallery can render a card with none of it. */
export type CardActions = {
  role?: Role;
  onSubmit?: () => Promise<void>;
  onReview?: (decision: 'approve' | 'reject', comment?: string) => Promise<void>;
  onExport?: (as: 'md' | 'txt') => Promise<void>;
};

export function CardView({ card, globalConfig, onRegenerate, role, onSubmit, onReview, onExport }:
    { card: Card; globalConfig: Config; onRegenerate: () => void } & CardActions) {
  const overridden = (['audience', 'tone', 'detail', 'language'] as const)
    .filter((k) => card.effective_config[k] !== globalConfig[k]);
  const cfg = card.effective_config;
  const label = LABELS[card.format_id] ?? card.format_id;
  return (
    <article aria-busy={LIVE.includes(card.status)} aria-label={label}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.05),0_8px_24px_-12px_rgba(16,24,40,.10)]">
      <header className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-[13px] font-bold text-teal-800 ring-1 ring-teal-100">
          {MARKS[card.format_id] ?? '··'}
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-slate-900">{label}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{cfg.audience} · {cfg.tone} · {cfg.detail}</p>
        </div>
        {overridden.length > 0 && (
          <span className="shrink-0 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-violet-200">{overridden.join(', ')} overridden</span>)}
        {(card.artifact?.version ?? 1) > 1 && <span className="text-xs font-medium text-slate-500">v{card.artifact!.version}</span>}
        {card.status === 'ready' && card.artifact && <StatusChip value={card.artifact.review_state ?? 'draft'} />}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${PILL[card.status]}`}>
          {LIVE.includes(card.status) && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />}
          <span className="sr-only">{label}: </span>{card.status}
        </span>
      </header>
      <div className="px-6 pb-5 pt-1">
        {card.status === 'ready' && card.artifact
          ? <Ready a={card.artifact} label={label} onRegenerate={onRegenerate} actions={{ role, onSubmit, onReview, onExport }} />
          : card.status === 'error' ? <Failed message={card.error?.message} onRetry={onRegenerate} canRetry={role === undefined || canGenerate(role)} />
          : <Working card={card} />}
      </div>
    </article>
  );
}

const Skeleton = () => (
  <div className="space-y-2.5" aria-hidden>
    <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
    <div className="h-2.5 w-11/12 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
    <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
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
      <p className="text-sm text-slate-700" role="status" aria-live="polite">
        {PHASE[card.status]}{card.detail ? ` — ${card.detail}` : ''} · {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
      </p>
      <Skeleton />
    </div>
  );
}

const providerNote = (meta?: Artifact['meta']) =>
  // The offline stub reports provider "local" so it must be checked first: nothing ran on this machine.
  meta?.model?.startsWith('offline-stub') ? { text: 'offline stub · no model ran', tone: 'bg-red-50 text-red-800 ring-red-200' }
  : meta?.provider === 'local' ? { text: 'processed on this machine', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' }
  : meta?.provider === 'cache' ? { text: 'served from the offline pack', tone: 'bg-amber-50 text-amber-900 ring-amber-200' }
  : null;

function Ready({ a, label, onRegenerate, actions }: { a: Artifact; label: string; onRegenerate: () => void; actions: CardActions }) {
  const View = RENDERERS[a.format_id] ?? GenericView;
  const note = providerNote(a.meta);
  const { role, onSubmit, onReview, onExport } = actions;
  const [busy, setBusy] = useState('');
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const state = a.review_state ?? 'draft';
  const mayWrite = role === undefined || canGenerate(role);
  const mayReview = role !== undefined && canReview(role);
  const run = async (name: string, fn?: () => Promise<void>) => {
    if (!fn) return;
    setBusy(name);
    try { await fn(); } finally { setBusy(''); }
  };
  const reasonError = reason.trim().length < 3 ? 'Give the operator a reason (at least 3 characters).' : reason.length > 2000 ? 'Keep it under 2000 characters.' : '';

  return (
    <>
      <View content={a.content} />
      {state === 'rejected' && a.review_comment && (
        <Alert severity="warning" sx={{ mt: 2 }}><b>Rejected:</b> {a.review_comment}</Alert>
      )}
      <footer className="mt-5 flex flex-wrap items-start gap-x-3 gap-y-3 border-t border-slate-100 pt-4 text-sm">
        <VerificationBadge score={a.grounding_score ?? 0} v={a.verification} />
        {note && (
          <Tooltip title={a.meta ? `${a.meta.provider} · ${a.meta.model} · ${(a.meta.latency_ms / 1000).toFixed(1)}s` : ''}>
            <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${note.tone}`}>{note.text}</span>
          </Tooltip>
        )}
        <span className="flex-1" />
        {onExport && (
          <>
            <Button size="small" variant="outlined" color="inherit" startIcon={<FileDownloadOutlined />} aria-haspopup="menu"
              onClick={(e) => setMenu(e.currentTarget)}>Export</Button>
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
              <MenuItem onClick={() => { setMenu(null); void run('export', () => onExport('md')); }}><ListItemText primary="Markdown (.md)" /></MenuItem>
              <MenuItem onClick={() => { setMenu(null); void run('export', () => onExport('txt')); }}><ListItemText primary="Plain text (.txt)" /></MenuItem>
            </Menu>
          </>
        )}
        {mayWrite && (
          <Button size="small" variant="outlined" color="inherit" startIcon={<ReplayRounded />} disabled={!!busy}
            onClick={() => setConfirm(true)}>Regenerate</Button>
        )}
        {mayWrite && onSubmit && (state === 'draft' || state === 'rejected') && (
          <Button size="small" variant="contained" startIcon={<SendRounded />} disabled={!!busy}
            onClick={() => void run('submit', onSubmit)}>{state === 'rejected' ? 'Resubmit for review' : 'Submit for review'}</Button>
        )}
        {mayReview && onReview && state === 'submitted' && (
          <>
            <Button size="small" variant="outlined" color="error" startIcon={<CloseRounded />} disabled={!!busy}
              onClick={() => { setReason(''); setRejecting(true); }}>Reject</Button>
            <Button size="small" variant="contained" color="success" startIcon={<CheckRounded />} disabled={!!busy}
              onClick={() => void run('approve', () => onReview('approve'))}>Approve</Button>
          </>
        )}
      </footer>

      <Dialog open={confirm} onClose={() => setConfirm(false)} aria-labelledby={`regen-${a.task_id}`}>
        <DialogTitle id={`regen-${a.task_id}`}>Regenerate {label.toLowerCase()}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This writes version {a.version + 1} and replaces the current text. Its review status goes back to draft.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setConfirm(false); onRegenerate(); }}>Regenerate</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejecting} onClose={() => setRejecting(false)} fullWidth maxWidth="sm" aria-labelledby={`reject-${a.task_id}`}>
        <DialogTitle id={`reject-${a.task_id}`}>Reject {label.toLowerCase()}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>The operator sees this reason. It is recorded in the audit log.</DialogContentText>
          <TextField autoFocus multiline minRows={3} label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}
            error={reason.length > 0 && !!reasonError} helperText={reason.length > 0 ? reasonError : ' '} />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setRejecting(false)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!!reasonError || !!busy}
            onClick={() => { setRejecting(false); void run('reject', () => onReview!('reject', reason.trim())); }}>Reject</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Failed({ message, onRetry, canRetry }: { message?: string; onRetry: () => void; canRetry: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4" role="alert">
      <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-600 text-sm font-bold text-white">!</span>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-sm leading-6 text-red-900">{message ?? 'Generation failed'}</p>
        {canRetry && <Button size="small" variant="outlined" color="error" startIcon={<ReplayRounded />} onClick={onRetry}>Retry</Button>}
      </div>
    </div>
  );
}
