import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import { Alert, Box, Button, Chip, Stack, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import { BatchCreated, SourceRecord } from '@ps154/shared';
import type { BatchCreated as BatchCreatedT, SourceRecord as SourceRecordT } from '@ps154/shared';
import { api, ApiError } from '../api';
import { useNotify } from '../notify';
import { canGenerate, useSession } from '../session';
import { FactsPanel } from '../components/FactsPanel';
import { ConfigPanel, type FormatOption } from '../components/ConfigPanel';
import { SourcePane } from '../components/SourcePane';
import { EmptyState, ErrorState, Flow, LoadingState, Page, PageHeader, Panel, StatusChip } from '../components/ui';

// Shown until GET /formats answers, and kept if it never does.
const FALLBACK: FormatOption[] = [
  { id: 'advisory', label: 'Security advisory' },
  { id: 'executive_summary', label: 'Executive summary' },
  { id: 'linkedin_post', label: 'LinkedIn post' },
  { id: 'x_thread', label: 'X thread' },
  { id: 'video_package', label: 'Video package' },
];

const TIER: Record<string, string> = { public: 'Public · cloud', internal: 'Internal · cloud, masked', restricted: 'Restricted · on this machine' };

const problem = (e: unknown, what: string) => {
  if (e instanceof ApiError && e.notFound) return `${what} was not found. It may belong to another account or no longer exist.`;
  if (e instanceof ApiError && e.forbidden) return `You do not have permission to open ${what.toLowerCase()}.`;
  return (e as Error).message;
};

export default function Confirm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const { user } = useSession();
  const wide = useMediaQuery(useTheme().breakpoints.up('lg'));
  const [source, setSource] = useState<SourceRecordT | null>(null);
  const [formats, setFormats] = useState<FormatOption[]>(FALLBACK);
  const [loadError, setLoadError] = useState('');
  const [genError, setGenError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(0);

  const load = useCallback(() => {
    setLoadError(''); setSource(null);
    api<SourceRecordT>(`/sources/${id}`, {}, SourceRecord).then(setSource).catch((e) => setLoadError(problem(e, 'This source')));
    api<FormatOption[]>('/formats').then((f) => Array.isArray(f) && f.length && setFormats(f)).catch(() => { /* the fallback list stays */ });
  }, [id]);
  useEffect(load, [load]);

  async function generate(body: object) {
    if (!source) return;
    setBusy(true); setGenError('');
    try {
      const batch = await api<BatchCreatedT>('/jobs/batch',
        { method: 'POST', body: JSON.stringify({ source_id: source.id, ...body }) }, BatchCreated);
      navigate(`/batches/${batch.batch_id}`);
    } catch (e) {
      const message = problem(e, 'This source');
      setGenError(message); notify(message, 'error');
      setBusy(false);
    }
  }

  const crumbs = [{ label: 'New source', to: '/' }, { label: 'Confirm' }];
  if (loadError) return <Page><PageHeader title="Confirm source" crumbs={crumbs} /><ErrorState title="Could not load this source" message={loadError} onRetry={load} /></Page>;
  if (!source) return <Page><PageHeader title="Confirm source" crumbs={crumbs} /><LoadingState label="Loading the source…" rows={5} /></Page>;

  const words = source.raw_content.trim().split(/\s+/).length;
  const facts = source.canonical
    ? <FactsPanel c={source.canonical} />
    : <EmptyState title="No facts were extracted" body="The model did not return a fact index for this source, so nothing can be generated from it."
        action={<Button component={RouterLink} to="/" variant="outlined">Add the source again</Button>} />;
  const sourcePane = (
    <Box sx={{ maxHeight: { xs: '60vh', lg: 'none' }, overflowY: { xs: 'auto', lg: 'visible' }, pr: 1 }}>
      <SourcePane raw={source.raw_content} spans={source.spans} active={new Set()} />
    </Box>
  );
  const config = (
    <>
      {genError && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{genError}</Alert>}
      <ConfigPanel formats={formats} busy={busy} disabled={!source.canonical || !canGenerate(user?.role)} onGenerate={generate} />
    </>
  );

  return (
    <Page fit>
      <PageHeader dense title="Confirm source"
        subtitle="Check the extracted facts, choose the formats, then start the batch."
        actions={<Flow active={1} />}
        meta={
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: .75 }}>
            <StatusChip value="approved" label="Source received" />
            <StatusChip value={source.canonical ? 'approved' : 'rejected'} label={source.canonical ? 'Facts extracted' : 'No facts extracted'} />
            <Chip size="small" variant="outlined" label={TIER[source.classification] ?? source.classification} />
            <Chip size="small" variant="outlined" label={`${source.filename ?? 'Pasted text'} · ${words.toLocaleString()} words · ${source.spans.length} passages`} />
          </Stack>} />

      {wide ? (
        <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gap: 2, gridTemplateColumns: 'minmax(0,5fr) minmax(0,3fr) minmax(0,4fr)' }}>
          <Panel fill dense title="Source" id="src" description="Passages are numbered so every claim can point back to one.">{sourcePane}</Panel>
          <Panel fill dense title="Extracted facts" id="facts">{facts}</Panel>
          <Panel fill dense title="Generation" id="gen">{config}</Panel>
        </Box>
      ) : (
        <Panel sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" aria-label="Sections" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Source" id="tab-0" aria-controls="panel-0" />
            <Tab label="Facts" id="tab-1" aria-controls="panel-1" />
            <Tab label="Generate" id="tab-2" aria-controls="panel-2" />
          </Tabs>
          <Box role="tabpanel" id="panel-0" aria-labelledby="tab-0" hidden={tab !== 0}>{tab === 0 && sourcePane}</Box>
          <Box role="tabpanel" id="panel-1" aria-labelledby="tab-1" hidden={tab !== 1}>{tab === 1 && facts}</Box>
          <Box role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden={tab !== 2}>{tab === 2 && config}</Box>
        </Panel>
      )}
    </Page>
  );
}
