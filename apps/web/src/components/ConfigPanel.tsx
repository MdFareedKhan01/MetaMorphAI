import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, Chip, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import type { Config, FormatId } from '@ps154/shared';

export type FormatOption = { id: FormatId; label: string };
type Overrides = Partial<Pick<Config, 'tone' | 'detail' | 'language'>>;

const TONES = ['formal', 'neutral', 'conversational'] as const;
const DETAILS = ['brief', 'medium', 'detailed'] as const;
const LANGUAGES = [['en', 'English'], ['hi', 'Hindi']] as const;
const AUDIENCES = ['Senior government officials', 'Sector CISOs', 'SOC analysts', 'General public'];
const MAX_FORMATS = 6;

type Option = string | readonly [string, string];
const opt = (o: Option) => (typeof o === 'string' ? [o, o] as const : o);

function Pick({ label, value, options, onChange, withSame = false }: {
  label: string; value: string; options: readonly Option[]; onChange: (v: string) => void; withSame?: boolean;
}) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} sx={{ minWidth: 0, '& select': { textTransform: value ? 'capitalize' : 'none' } }}>
      {withSame && <option value="">Default</option>}
      {options.map((o) => { const [v, l] = opt(o); return <option key={v} value={v}>{l}</option>; })}
    </TextField>
  );
}

export function ConfigPanel({ formats, busy, disabled = false, onGenerate }: {
  formats: FormatOption[]; busy: boolean; disabled?: boolean;
  onGenerate: (body: { global_config: Config; formats: { format_id: FormatId; overrides?: Overrides }[] }) => void;
}) {
  const [global, setGlobal] = useState<Config>({
    audience: 'Senior government officials', tone: 'formal', detail: 'medium', language: 'en' });
  const [selected, setSelected] = useState<FormatId[]>(formats.slice(0, 3).map((f) => f.id));
  const [overrides, setOverrides] = useState<Record<string, Overrides>>({});

  // The list can arrive after the first render (GET /formats). Keep what is still valid; else default to the first three.
  useEffect(() => {
    setSelected((prev) => {
      const valid = prev.filter((id) => formats.some((f) => f.id === id));
      return valid.length ? valid : formats.slice(0, 3).map((f) => f.id);
    });
  }, [formats]);

  const setOverride = (id: string, key: keyof Overrides, value: string) =>
    setOverrides((o) => {
      const next = { ...o[id] };
      if (value === '') delete next[key]; else (next as any)[key] = value;
      return { ...o, [id]: next };
    });

  const generate = () => onGenerate({
    global_config: { ...global, audience: global.audience.trim() },
    formats: selected.map((id) => Object.keys(overrides[id] ?? {}).length
      ? { format_id: id, overrides: overrides[id] } : { format_id: id }),
  });

  const audienceOk = global.audience.trim().length >= 2 && global.audience.length <= 80;
  const can = !busy && !disabled && audienceOk && selected.length > 0 && selected.length <= MAX_FORMATS;

  return (
    <Stack component="section" spacing={3} aria-label="Generation settings">
      <Box>
        <Typography variant="h4" sx={{ mb: 1.5 }}>Defaults for every format</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' } }}>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField size="small" label="Audience" value={global.audience} error={!audienceOk}
              helperText={audienceOk ? undefined : 'Enter 2 to 80 characters.'}
              onChange={(e) => setGlobal({ ...global, audience: e.target.value })}
              slotProps={{ htmlInput: { list: 'audiences' }, inputLabel: { shrink: true } }} />
            <datalist id="audiences">{AUDIENCES.map((a) => <option key={a} value={a} />)}</datalist>
          </Box>
          <Pick label="Tone" value={global.tone} options={TONES} onChange={(v) => setGlobal({ ...global, tone: v as Config['tone'] })} />
          <Pick label="Detail" value={global.detail} options={DETAILS} onChange={(v) => setGlobal({ ...global, detail: v as Config['detail'] })} />
          <Pick label="Language" value={global.language} options={LANGUAGES} onChange={(v) => setGlobal({ ...global, language: v as Config['language'] })} />
        </Box>
      </Box>

      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="h4">Formats</Typography>
          <Typography variant="caption" color="text.secondary">{selected.length} of {MAX_FORMATS} max</Typography>
        </Stack>
        <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {formats.map((f) => {
            const on = selected.includes(f.id);
            const n = Object.keys(overrides[f.id] ?? {}).length;
            return (
              <Box component="li" key={f.id} sx={{ p: 1.25, pl: 1, border: 1, borderRadius: 3, borderColor: on ? 'primary.light' : 'divider', bgcolor: on ? 'rgba(20,184,166,.04)' : 'transparent' }}>
                <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <FormControlLabel sx={{ flexGrow: 1, m: 0 }} label={f.label}
                    control={<Checkbox checked={on} disabled={disabled || (!on && selected.length >= MAX_FORMATS)}
                      onChange={() => setSelected((s) => on ? s.filter((x) => x !== f.id) : [...s, f.id])} />} />
                  {n > 0 && <Chip size="small" color="secondary" variant="outlined" label={`${n} override${n > 1 ? 's' : ''}`} />}
                </Stack>
                {on && (
                  <Box sx={{ display: 'grid', gap: 1.25, mt: 1.5, pl: { xs: 0, sm: 4.5 }, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
                    <Pick label="Tone" value={overrides[f.id]?.tone ?? ''} options={TONES} withSame onChange={(v) => setOverride(f.id, 'tone', v)} />
                    <Pick label="Detail" value={overrides[f.id]?.detail ?? ''} options={DETAILS} withSame onChange={(v) => setOverride(f.id, 'detail', v)} />
                    <Pick label="Language" value={overrides[f.id]?.language ?? ''} options={LANGUAGES} withSame onChange={(v) => setOverride(f.id, 'language', v)} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', pt: 1.5, pb: 1, mx: -0.5, px: 0.5, borderTop: 1, borderColor: 'divider', zIndex: 1 }}>
        <Button variant="contained" size="large" fullWidth disabled={!can} onClick={generate}
          startIcon={<AutoAwesomeRounded />} sx={{ minHeight: 50 }}>
          Generate {selected.length}
        </Button>
        {disabled && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>Your role cannot start a batch.</Typography>}
      </Box>
    </Stack>
  );
}
