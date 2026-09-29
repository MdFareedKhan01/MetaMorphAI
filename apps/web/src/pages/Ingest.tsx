import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import type { Classification } from '@ps154/shared';
import type { SourceRecord } from '../shared-temp';
import { api } from '../api';

// These mirror the server's rules in routes/sources.ts, so a bad input is caught before the round trip.
const MIN_CHARS = 50;
const MAX_CHARS = 50_000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

const TIERS: { value: Classification; label: string; route: string; chip: string; consequence: string }[] = [
  { value: 'public', label: 'Public', route: 'Cloud model', chip: 'bg-sky-50 text-sky-800 ring-sky-200',
    consequence: 'Sent to the cloud model. Best quality and speed. For material cleared for release.' },
  { value: 'internal', label: 'Internal', route: 'Cloud, masked', chip: 'bg-violet-50 text-violet-800 ring-violet-200',
    consequence: 'Sent to the cloud model with IP addresses, domains, emails and named terms masked first, then restored.' },
  { value: 'restricted', label: 'Restricted', route: 'Stays on this machine', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    consequence: 'Processed entirely on this machine. Never sent to an external provider.' },
];

const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function Steps() {
  const steps = ['Source', 'Confirm', 'Generate'];
  return (
    <ol className="flex items-center gap-3 text-[13px] font-semibold" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-3" aria-current={i === 0 ? 'step' : undefined}>
          <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${i === 0 ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
          <span className={i === 0 ? 'text-slate-900' : 'text-slate-400'}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-8 bg-slate-200" />}
        </li>
      ))}
    </ol>
  );
}

const panel = 'rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.05),0_8px_24px_-12px_rgba(16,24,40,.10)]';

export default function Ingest() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tier, setTier] = useState<Classification>('internal');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');

  const trimmed = text.trim().length;
  const tooShort = !file && trimmed > 0 && trimmed < MIN_CHARS;
  const tooLong = !file && text.length > MAX_CHARS;
  const canSubmit = !busy && !tooLong && (file !== null || trimmed >= MIN_CHARS);

  function pick(f: File | undefined) {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!EXTENSIONS.includes(ext)) { setError('Unsupported file type. Use PDF, DOCX, TXT or MD.'); return; }
    if (f.size > MAX_FILE_BYTES) { setError('Files are limited to 10 MB.'); return; }
    setError('');
    setFile(f);
  }
  function clearFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files?.[0]);
  }

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
    <main className="mx-auto max-w-[1120px] px-6 pb-16 pt-10">
      <Steps />
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">New source</h1>
      <p className="mt-2 max-w-2xl text-[16px] leading-7 text-slate-600">
        Paste a report or upload a file. MetaMorph-AI reads it once, builds a cited fact index, and writes every format from that index.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className={panel} aria-labelledby="source-heading">
          <h2 id="source-heading" className="text-[15px] font-semibold text-slate-900">Source text</h2>
          <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={file !== null}
            aria-label="Paste source text"
            placeholder={file ? 'Using the uploaded file. Remove it to paste text instead.' : 'Paste a report, advisory or incident note...'}
            rows={11}
            className="mt-3 w-full resize-y rounded-xl border-2 border-slate-200 p-4 font-mono text-[14px] leading-6 text-slate-800 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400" />
          <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span className={tooLong ? 'font-medium text-red-700' : 'text-slate-500'}>
              {text.length.toLocaleString()} / 50,000 characters
            </span>
            {tooShort && <span className="font-medium text-amber-700">At least {MIN_CHARS} characters are needed.</span>}
            {tooLong && <span className="font-medium text-red-700">Too long. The limit is 50,000 characters.</span>}
          </p>

          <div className="my-5 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-400" aria-hidden>
            <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
          </div>

          <input ref={inputRef} type="file" accept={EXTENSIONS.join(',')} className="sr-only" tabIndex={-1}
            aria-label="Upload a file" onChange={(e) => pick(e.target.files?.[0])} />
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border-2 border-teal-200 bg-teal-50/60 px-4 py-3">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[11px] font-bold uppercase text-teal-800 ring-1 ring-teal-200">
                {file.name.split('.').pop()?.slice(0, 4)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-slate-900">{file.name}</p>
                <p className="text-[13px] text-slate-500">{size(file.size)} · ready to read</p>
              </div>
              <button type="button" onClick={clearFile}
                className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50">Remove</button>
            </div>
          ) : (
            <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
              className={`flex flex-wrap items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 transition-colors ${
                over ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50/60'}`}>
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-lg text-teal-700 ring-1 ring-slate-200">↑</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-slate-900">Upload a file</p>
                <p className="text-[13px] text-slate-500">Drop it here. PDF, DOCX, TXT or MD, up to 10 MB.</p>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()}
                className="rounded-lg border-2 border-teal-200 bg-white px-4 py-2 text-[14px] font-semibold text-teal-800 transition-colors hover:bg-teal-50">Browse files</button>
            </div>
          )}
        </section>

        <section className={panel} aria-labelledby="class-heading">
          <fieldset>
            <legend id="class-heading" className="text-[15px] font-semibold text-slate-900">Classification</legend>
            <p className="mt-1 text-[13px] text-slate-500">This decides where the text may go. It is enforced by the server.</p>
            <div className="mt-4 space-y-3">
              {TIERS.map((t) => (
                <label key={t.value}
                  className="block cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500 has-[:focus-visible]:ring-offset-2">
                  <input type="radio" name="classification" value={t.value} checked={tier === t.value}
                    onChange={() => setTier(t.value)} className="sr-only" />
                  <span className="flex items-center gap-3">
                    <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      tier === t.value ? 'border-teal-600' : 'border-slate-300'}`}>
                      {tier === t.value && <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />}
                    </span>
                    <b className="text-[15px] text-slate-900">{t.label}</b>
                    <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ${t.chip}`}>{t.route}</span>
                  </span>
                  <span className="mt-2 block pl-8 text-[13.5px] leading-6 text-slate-600">{t.consequence}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[14px] text-red-800">{error}</p>}

          <button type="button" disabled={!canSubmit} onClick={submit}
            className="mt-5 w-full rounded-xl bg-teal-700 px-5 py-3 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
            {busy ? 'Reading the source and extracting facts…' : 'Continue: extract facts'}
          </button>
          {busy && (
            <p className="mt-2 text-center text-[13px] text-slate-500">
              About a minute or less on the cloud model. Restricted sources run on this machine and can take a few minutes.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
