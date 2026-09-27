import { useState } from 'react';
import type { Config, FormatId } from '@ps154/shared';

export type FormatOption = { id: FormatId; label: string };
type Overrides = Partial<Pick<Config, 'tone' | 'detail' | 'language'>>;

const TONES = ['formal', 'neutral', 'conversational'] as const;
const DETAILS = ['brief', 'medium', 'detailed'] as const;
const LANGUAGES = [['en', 'English'], ['hi', 'Hindi']] as const;

export function ConfigPanel({ formats, busy, onGenerate }: {
  formats: FormatOption[]; busy: boolean;
  onGenerate: (body: { global_config: Config; formats: { format_id: FormatId; overrides?: Overrides }[] }) => void;
}) {
  const [global, setGlobal] = useState<Config>({
    audience: 'Senior government officials', tone: 'formal', detail: 'medium', language: 'en' });
  const [selected, setSelected] = useState<FormatId[]>(formats.slice(0, 3).map((f) => f.id));
  const [overrides, setOverrides] = useState<Record<string, Overrides>>({});

  const setOverride = (id: string, key: keyof Overrides, value: string) =>
    setOverrides((o) => {
      const next = { ...o[id] };
      if (value === '') delete next[key]; else (next as any)[key] = value;
      return { ...o, [id]: next };
    });

  const generate = () => onGenerate({
    global_config: global,
    formats: selected.map((id) => Object.keys(overrides[id] ?? {}).length
      ? { format_id: id, overrides: overrides[id] } : { format_id: id }),
  });

  const select = (value: string, options: readonly (string | readonly [string, string])[],
                  onChange: (v: string) => void, withSame = false) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded border px-2 py-1">
      {withSame && <option value="">same as global</option>}
      {options.map((o) => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o[0]} value={o[0]}>{o[1]}</option>)}
    </select>);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <label>Audience <input list="audiences" value={global.audience}
          onChange={(e) => setGlobal({ ...global, audience: e.target.value })} className="rounded border px-2 py-1" /></label>
        <datalist id="audiences">
          <option value="Senior government officials" /><option value="Sector CISOs" />
          <option value="SOC analysts" /><option value="General public" />
        </datalist>
        <label>Tone {select(global.tone, TONES, (v) => setGlobal({ ...global, tone: v as Config['tone'] }))}</label>
        <label>Detail {select(global.detail, DETAILS, (v) => setGlobal({ ...global, detail: v as Config['detail'] }))}</label>
        <label>Language {select(global.language, LANGUAGES, (v) => setGlobal({ ...global, language: v as Config['language'] }))}</label>
      </div>
      <ul className="space-y-2">
        {formats.map((f) => {
          const on = selected.includes(f.id);
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-3 rounded border p-2 text-sm">
              <label className="w-48"><input type="checkbox" checked={on} onChange={() =>
                setSelected((s) => on ? s.filter((x) => x !== f.id) : [...s, f.id])} /> {f.label}</label>
              {on && <>
                tone {select(overrides[f.id]?.tone ?? '', TONES, (v) => setOverride(f.id, 'tone', v), true)}
                detail {select(overrides[f.id]?.detail ?? '', DETAILS, (v) => setOverride(f.id, 'detail', v), true)}
                language {select(overrides[f.id]?.language ?? '', LANGUAGES, (v) => setOverride(f.id, 'language', v), true)}
              </>}
            </li>);
        })}
      </ul>
      <button disabled={busy || selected.length === 0 || selected.length > 6} onClick={generate}
        className="rounded bg-slate-900 px-5 py-2 text-white disabled:opacity-40">
        Generate {selected.length}
      </button>
    </section>
  );
}
