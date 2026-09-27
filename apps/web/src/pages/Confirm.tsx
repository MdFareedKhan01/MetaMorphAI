import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { BatchCreated, SourceRecord } from '../shared-temp';
import { api } from '../api';
import { FactsPanel } from '../components/FactsPanel';
import { ConfigPanel, type FormatOption } from '../components/ConfigPanel';
import { SourcePane } from '../components/SourcePane';

// Until B serves GET /formats from D's registry, this list stands in for it.
const FALLBACK: FormatOption[] = [
  { id: 'advisory', label: 'Security advisory' },
  { id: 'executive_summary', label: 'Executive summary' },
  { id: 'linkedin_post', label: 'LinkedIn post' },
];

export default function Confirm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [source, setSource] = useState<SourceRecord | null>(null);
  const [formats, setFormats] = useState<FormatOption[]>(FALLBACK);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<SourceRecord>(`/sources/${id}`).then(setSource);
    api<FormatOption[]>('/formats').then(setFormats).catch(() => {});
  }, [id]);
  if (!source) return <p className="p-8">Loading source…</p>;

  async function generate(body: object) {
    setBusy(true);
    const batch = await api<BatchCreated>('/jobs/batch', {
      method: 'POST', body: JSON.stringify({ source_id: source!.id, ...body }) });
    navigate(`/batches/${batch.batch_id}`);
  }

  return (
    <main className="grid gap-6 p-6 lg:grid-cols-[3fr_2fr]">
      <div className="max-h-[50vh] overflow-y-auto rounded border p-4">
        <SourcePane raw={source.raw_content} spans={source.spans} active={new Set()} />
      </div>
      {source.canonical && <FactsPanel c={source.canonical} />}
      <div className="lg:col-span-2"><ConfigPanel formats={formats} busy={busy} onGenerate={generate} /></div>
    </main>
  );
}