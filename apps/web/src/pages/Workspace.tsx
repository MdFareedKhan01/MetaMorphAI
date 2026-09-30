import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useParams } from 'react-router';
import {
  Alert, Box, Button, Chip, IconButton, Stack, Tab, Tabs, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { BatchSnapshot, SourceRecord, type Claim, type Frame } from '@ps154/shared';
import type { BatchSnapshot as BatchSnapshotT, SourceRecord as SourceRecordT } from '@ps154/shared';
import { api, ApiError, download } from '../api';
import { setActiveBatch } from '../activity';
import { useNotify } from '../notify';
import { canGenerate, useSession } from '../session';
import { fromSnapshot, reducer, type BatchView, type Card } from '../batch/state';
import { useBatchStream } from '../batch/useBatchStream';
import { SelectionContext } from '../selection';
import { SourcePane } from '../components/SourcePane';
import { CardView } from '../components/Card';
import { CardBoundary } from '../components/CardBoundary';
import { EmptyState, ErrorState, LoadingState, Page, PageHeader, Panel } from '../components/ui';

const label = (id: string) => id.replace(/_/g, ' ');

export default function Workspace() {
  const { id } = useParams();
  const [initial, setInitial] = useState<BatchView | null>(null);
  const [source, setSource] = useState<SourceRecordT | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError(''); setInitial(null); setSource(null);
    api<BatchSnapshotT>(`/jobs/${id}`, {}, BatchSnapshot)
      .then(async (s) => {
        setSource(await api<SourceRecordT>(`/sources/${s.source_id}`, {}, SourceRecord));
        setInitial(fromSnapshot(s));
      })
      .catch((e) => setError(e instanceof ApiError && e.notFound ? 'This batch was not found. It may belong to another account.'
        : e instanceof ApiError && e.forbidden ? 'You do not have permission to open this batch.' : (e as Error).message));
  }, [id]);
  useEffect(load, [load]);

  const crumbs = [{ label: 'New source', to: '/' }, { label: 'Workspace' }];
  if (error) return <Page><PageHeader title="Workspace" crumbs={crumbs} /><ErrorState title="Could not load this batch" message={error} onRetry={load} /></Page>;
  if (!initial || !source) return <Page><PageHeader title="Workspace" crumbs={crumbs} /><LoadingState label="Loading the batch…" rows={5} /></Page>;
  return <LiveBatch initial={initial} source={source} />;
}

type LogLine = { at: number; text: string; tone: 'info' | 'success' | 'error' };
const describe = (f: Frame, cards: Record<string, Card>): LogLine | null => {
  const name = (t: string) => label(cards[t]?.format_id ?? 'task');
  switch (f.event) {
    case 'task.progress': return { at: Date.now(), tone: 'info', text: `${name(f.task_id)}: ${f.status}${f.detail ? ` — ${f.detail}` : ''}` };
    case 'task.completed': return { at: Date.now(), tone: 'success', text: `${name(f.task_id)}: ready (v${f.artifact.version})` };
    case 'task.failed': return { at: Date.now(), tone: 'error', text: `${name(f.task_id)}: failed — ${f.message}` };
    case 'batch.completed': return { at: Date.now(), tone: f.overall_status === 'failed' ? 'error' : 'success', text: `Batch ${f.overall_status}: ${f.completed} done, ${f.failed} failed` };
  }
};

const FILTERS = [['all', 'All'], ['active', 'In progress'], ['ready', 'Ready'], ['error', 'Failed']] as const;
type Filter = (typeof FILTERS)[number][0];
const inFilter = (c: Card, f: Filter) =>
  f === 'all' || (f === 'ready' && c.status === 'ready') || (f === 'error' && c.status === 'error')
  || (f === 'active' && c.status !== 'ready' && c.status !== 'error');

function LiveBatch({ initial, source }: { initial: BatchView; source: SourceRecordT }) {
  const notify = useNotify();
  const { user } = useSession();
  const wide = useMediaQuery(useTheme().breakpoints.up('lg'));
  const [view, dispatch] = useReducer(reducer, initial);
  const [log, setLog] = useState<LogLine[]>([]);
  const cardsRef = useRef(view.cards);
  cardsRef.current = view.cards;
  const { status: link, dropped, reconnect } = useBatchStream(initial.batch_id, initial.last_seq, (frame) => {
    dispatch({ type: 'frame', frame });
    const line = describe(frame, cardsRef.current);
    if (line) setLog((l) => [line, ...l].slice(0, 100));
  });

  const [active, setActive] = useState<Claim | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [tab, setTab] = useState(0);
  const [showSource, setShowSource] = useState(true);
  const activeRefs = useMemo(() => new Set(active?.source_refs ?? []), [active]);

  const cards = Object.values(view.cards);
  const ready = cards.filter((c) => c.status === 'ready').length;
  const failed = cards.filter((c) => c.status === 'error').length;
  const done = ready + failed;
  const counts: Record<Filter, number> = {
    all: cards.length, ready, error: failed, active: cards.length - done };
  const mayWrite = canGenerate(user?.role);

  useEffect(() => {
    setActiveBatch({ batchId: view.batch_id, overall: view.overall, ready, total: cards.length });
    return () => setActiveBatch(null);
  }, [view.batch_id, view.overall, ready, cards.length]);

  async function regenerate(task_id: string) {
    const prev = view.cards[task_id];
    dispatch({ type: 'regenerating', task_id });
    try { await api(`/tasks/${task_id}/regenerate`, { method: 'POST' }); }
    catch (e) {
      dispatch({ type: 'restore', card: prev });
      notify(`Could not regenerate: ${(e as Error).message}`, 'error');
    }
  }
  async function retryFailed() {
    await Promise.all(cards.filter((c) => c.status === 'error').map((c) => regenerate(c.task_id)));
  }
  async function submit(task_id: string) {
    try {
      await api(`/tasks/${task_id}/submit`, { method: 'POST' });
      dispatch({ type: 'review', task_id, review_state: 'submitted' });
      notify('Submitted for review.', 'success');
    } catch (e) { notify(`Could not submit: ${(e as Error).message}`, 'error'); }
  }
  async function review(task_id: string, decision: 'approve' | 'reject', comment?: string) {
    try {
      await api(`/tasks/${task_id}/review`, { method: 'POST', body: JSON.stringify({ decision, comment }) });
      dispatch({ type: 'review', task_id, review_state: decision === 'approve' ? 'approved' : 'rejected', comment: comment ?? null });
      notify(decision === 'approve' ? 'Approved.' : 'Rejected. The operator will see your reason.', 'success');
    } catch (e) { notify(`Could not record the decision: ${(e as Error).message}`, 'error'); }
  }
  async function exportCard(c: Card, as: 'md' | 'txt') {
    try { await download(`/tasks/${c.task_id}/export?as=${as}`, `${c.format_id}-v${c.artifact?.version ?? 1}.${as}`); }
    catch (e) { notify(`Export failed: ${(e as Error).message}`, 'error'); }
  }

  const sourcePane = (
    <>
      {active && active.source_refs.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>This sentence cites no passage in the source. It is marked unverified.</Alert>
      )}
      <SourcePane raw={source.raw_content} spans={source.spans} active={activeRefs} />
    </>
  );

  const shown = cards.filter((c) => inFilter(c, filter));
  const outputs = (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }} role="group" aria-label="Filter outputs">
        {FILTERS.map(([key, name]) => (
          <Chip key={key} label={`${name} · ${counts[key]}`} clickable onClick={() => setFilter(key)}
            color={filter === key ? 'primary' : 'default'} variant={filter === key ? 'filled' : 'outlined'} aria-pressed={filter === key} />
        ))}
      </Stack>
      {shown.length === 0
        ? <EmptyState title="Nothing here" body={`No outputs are ${filter === 'error' ? 'failed' : filter === 'active' ? 'in progress' : 'ready'} right now.`} />
        : shown.map((c) => (
          <CardBoundary key={c.task_id} label={c.format_id}>
            <CardView card={c} globalConfig={view.global_config} role={user?.role}
              onRegenerate={() => regenerate(c.task_id)}
              onSubmit={() => submit(c.task_id)}
              onReview={(d, comment) => review(c.task_id, d, comment)}
              onExport={(as) => exportCard(c, as)} />
          </CardBoundary>))}
    </Stack>
  );

  const activity = log.length === 0
    ? <EmptyState title="No activity yet" body="Progress from the workers appears here as it happens." />
    : (
      <Box component="ol" aria-label="Activity" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1 }}>
        {log.map((l, i) => (
          <Box component="li" key={`${l.at}-${i}`} sx={{ display: 'flex', gap: 1.5, fontSize: 14, alignItems: 'baseline' }}>
            <Typography component="time" variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {new Date(l.at).toLocaleTimeString()}
            </Typography>
            <Typography variant="body2" color={l.tone === 'error' ? 'error' : l.tone === 'success' ? 'success.main' : 'text.primary'}>{l.text}</Typography>
          </Box>))}
      </Box>);

  const tabs = wide ? ['Outputs', 'Activity'] : ['Source', 'Outputs', 'Activity'];
  const current = tabs[tab] ?? tabs[0];

  return (
    <SelectionContext.Provider value={{ active, select: setActive }}>
      <Page wide>
        <PageHeader
          title={source.filename ?? 'Pasted source'}
          crumbs={[{ label: 'New source', to: '/' }, { label: 'Confirm', to: `/sources/${source.id}` }, { label: 'Workspace' }]}
          meta={
            <Typography variant="body2" color="text.secondary">
              {source.classification[0].toUpperCase()}{source.classification.slice(1)} source · Created {new Date(source.created_at).toLocaleString()} · Batch {view.batch_id.slice(0, 8)}
            </Typography>}
          actions={mayWrite && failed > 0 ? (
            <Button variant="outlined" startIcon={<ReplayRounded />} onClick={retryFailed}>Retry {failed} failed</Button>) : undefined} />

        {link === 'reconnecting' && <Alert severity="warning" sx={{ mb: 2 }}>Live updates dropped. Reconnecting; nothing is lost, the stream resumes where it stopped.</Alert>}
        {link === 'disconnected' && (
          <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={reconnect}>Reconnect</Button>}>
            Live updates are unavailable. Finished outputs are still shown; reconnect to see new progress.
          </Alert>)}
        {dropped > 0 && <Alert severity="info" sx={{ mb: 2 }}>{dropped} update{dropped > 1 ? 's' : ''} from the server could not be read and {dropped > 1 ? 'were' : 'was'} skipped.</Alert>}

        <Box sx={{ display: 'grid', gap: 3, alignItems: 'start',
          gridTemplateColumns: wide ? (showSource ? 'minmax(0,2fr) minmax(0,3fr)' : '48px minmax(0,1fr)') : 'minmax(0,1fr)' }}>
          {wide && (showSource ? (
            <Panel title="Source" id="src" sx={{ position: 'sticky', top: 84, maxHeight: 'calc(100vh - 108px)', overflowY: 'auto' }}
              action={<Tooltip title="Collapse source"><IconButton size="small" aria-label="Collapse source" onClick={() => setShowSource(false)}><ChevronLeftRounded /></IconButton></Tooltip>}>
              {sourcePane}
            </Panel>
          ) : (
            <Tooltip title="Show source" placement="right">
              <IconButton aria-label="Show source" onClick={() => setShowSource(true)} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
                <ChevronRightRounded />
              </IconButton>
            </Tooltip>
          ))}

          <Box sx={{ minWidth: 0 }}>
            {/* No visible progress card; screen readers still hear the count as it changes. */}
            <Box role="status" aria-live="polite" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              {ready} of {cards.length} ready{failed > 0 ? ` · ${failed} failed` : ''}
            </Box>
            <Tabs value={Math.min(tab, tabs.length - 1)} onChange={(_, v) => setTab(v)} aria-label="Workspace sections"
              variant={wide ? 'standard' : 'fullWidth'} sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
              {tabs.map((t, i) => <Tab key={t} label={t} id={`ws-tab-${i}`} aria-controls={`ws-panel-${i}`} />)}
            </Tabs>
            <Box role="tabpanel" id={`ws-panel-${Math.min(tab, tabs.length - 1)}`} aria-labelledby={`ws-tab-${Math.min(tab, tabs.length - 1)}`}>
              {current === 'Source' && <Panel>{sourcePane}</Panel>}
              {current === 'Outputs' && outputs}
              {current === 'Activity' && <Panel>{activity}</Panel>}
            </Box>
          </Box>
        </Box>
      </Page>
    </SelectionContext.Provider>
  );
}
