import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Classification } from '@ps154/shared';
import type { SourceRecord } from '../shared-temp';
import { api } from '../api';

const TIERS: { value: Classification; label: string; consequence: string }[] = [
  { value: 'public', label: 'Public',
    consequence: 'Sent to the cloud model. Best quality and speed. For material cleared for release.' },
  { value: 'internal', label: 'Internal',
    consequence: 'Sent to the cloud model with IP addresses, domains, emails and named terms masked first, then restored.' },
  { value: 'restricted', label: 'Restricted',
    consequence: 'Processed entirely on this machine. Never sent to an external provider.' },
];

export default function Ingest() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tier, setTier] = useState<Classification>('internal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true); setError('');
    try {
      let body: BodyInit;
      if (file) {
        const form = new FormData();
        form.append('classification', tier);
        form.append('file', file);
        body = form;
      } else {
        body = JSON.stringify({ text, classification: tier });
      }
      const source = await api<SourceRecord>('/sources', { method: 'POST', body });
      navigate(`/sources/${source.id}`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">New source</h1>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setFile(null); }}
        placeholder="Paste a report, advisory or incident note..." rows={12}
        className="w-full rounded border p-3 font-mono text-sm" />
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{text.length.toLocaleString()} / 50,000 characters</span>
        <label>or upload <input type="file" accept=".pdf,.docx,.txt,.md"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
      </div>
      <fieldset className="space-y-2">
        <legend className="font-medium">Classification</legend>
        {TIERS.map((t) => (
          <label key={t.value} className="flex gap-3 rounded border p-3">
            <input type="radio" checked={tier === t.value} onChange={() => setTier(t.value)} />
            <span><b>{t.label}</b> — {t.consequence}</span>
          </label>
        ))}
      </fieldset>
      {error && <p className="text-red-700">{error}</p>}
      <button disabled={busy || (!text.trim() && !file)} onClick={submit}
        className="rounded bg-slate-900 px-5 py-2 text-white disabled:opacity-40">
        {busy ? 'Reading the source and extracting facts — up to 40 seconds…' : 'Continue: extract facts'}
      </button>
    </main>
  );
}