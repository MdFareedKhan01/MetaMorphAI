import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
  Alert, Box, Button, Chip, Divider, FormControl, FormLabel, LinearProgress, List, ListItemButton, ListItemText,
  Radio, RadioGroup, Stack, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import type { Classification, SourceRecord } from '@ps154/shared';
import { api, ApiError } from '../api';
import { readRecent, rememberSource } from '../recent';
import { Dropzone } from '../components/Dropzone';
import { Flow, Page, PageHeader, Panel, ShimmerLoader } from '../components/ui';

// These mirror the server's rules in routes/sources.ts, so a bad input is caught before the round trip.
const MIN_CHARS = 50;
const MAX_CHARS = 50_000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

const TIERS: { value: Classification; label: string; route: string; color: 'info' | 'secondary' | 'success'; consequence: string }[] = [
  { value: 'public', label: 'Public', route: 'Cloud model', color: 'info',
    consequence: 'Sent to the cloud model. Best quality and speed. For material cleared for release.' },
  { value: 'internal', label: 'Internal', route: 'Cloud, masked', color: 'secondary',
    consequence: 'Sent to the cloud model after IP addresses, domains and named terms in the prompt are masked. Masking is best-effort; if the text must not leave this machine, choose the on-device tier.' },
  { value: 'restricted', label: 'Restricted', route: 'Stays on this machine', color: 'success',
    consequence: 'Processed entirely on this machine. Never sent to an external provider.' },
];

const TIER_LABEL: Record<Classification, string> = { public: 'Public', internal: 'Internal', restricted: 'Restricted' };

export default function Ingest() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tier, setTier] = useState<Classification>('internal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [recent] = useState(readRecent);
  const wide = useMediaQuery(useTheme().breakpoints.up('lg'));

  const trimmed = text.trim().length;
  const tooShort = !file && trimmed > 0 && trimmed < MIN_CHARS;
  const tooLong = !file && text.length > MAX_CHARS;
  const canSubmit = !busy && !tooLong && (file !== null || trimmed >= MIN_CHARS);

  function pick(f: File | undefined) {
    if (!f) return;
    const ext = f.name.includes('.') ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase() : '';
    if (!EXTENSIONS.includes(ext)) { setError({ message: 'Unsupported file type. Use PDF, DOCX, TXT or MD.', retry: false }); return; }
    if (f.size > MAX_FILE_BYTES) { setError({ message: 'Files are limited to 10 MB.', retry: false }); return; }
    setError(null);
    setFile(f);
  }

  async function submit() {
    setBusy(true); setError(null);
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
      rememberSource({ id: source.id, label: file?.name ?? text.trim().replace(/\s+/g, ' ').slice(0, 70), tier, at: new Date().toISOString() });
      navigate(`/sources/${source.id}`);
    } catch (e) {
      const denied = e instanceof ApiError && e.forbidden;
      setError({ message: denied ? 'Your role cannot add sources. Ask an admin for operator access.' : (e as Error).message, retry: !denied });
    } finally { setBusy(false); }
  }

  return (
    <Page fit>
      <PageHeader dense title="New source" actions={<Flow active={0} />}
        subtitle="Paste a report or upload a file. MetaMorph-AI reads it once, builds a cited fact index, and writes every format from that index." />

      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,3fr) minmax(0,2fr)' } }}>
        <Panel fill dense title="Source material" id="source" description="Use either pasted text or one file.">
          <Dropzone file={file} accept={EXTENSIONS} hint="PDF, DOCX, TXT or MD, up to 10 MB." disabled={busy}
            onPick={pick} onClear={() => setFile(null)} />
          <Divider sx={{ my: 1.5, color: 'text.disabled', fontSize: 12, fontWeight: 700, letterSpacing: '.1em', flexShrink: 0 }}>OR</Divider>
          <TextField label="Paste source text" multiline minRows={wide ? 3 : 8} maxRows={wide ? undefined : 14} value={text} disabled={file !== null}
            onChange={(e) => setText(e.target.value)}
            placeholder={file ? 'Using the uploaded file. Remove it to paste text instead.' : 'Paste a report, advisory or incident note...'}
            error={tooLong}
            sx={{ flex: { lg: 1 }, minHeight: 0, '& .MuiInputBase-root': { flex: { lg: 1 }, minHeight: 0, alignItems: 'flex-start' },
              '& textarea:not([aria-hidden])': { height: { lg: '100% !important' }, overflowY: { lg: 'auto !important' } } }}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: { fontFamily: '"IBM Plex Mono", monospace', fontSize: 14, lineHeight: 1.65 } } }}
            helperText={
              <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <span>{text.length.toLocaleString()} / 50,000 characters</span>
                {tooShort && <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>At least {MIN_CHARS} characters are needed.</Box>}
                {tooLong && <Box component="span" sx={{ fontWeight: 600 }}>Too long. The limit is 50,000 characters.</Box>}
              </Box>} />
        </Panel>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
          <Panel fill dense title="Classification" id="class" description="This decides where the text may go. It is enforced by the server.">
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Classification</FormLabel>
              <RadioGroup name="classification" value={tier} onChange={(e) => setTier(e.target.value as Classification)} sx={{ gap: 1 }}>
                {TIERS.map((t) => (
                  <Box key={t.value} component="label"
                    sx={{ display: 'flex', gap: .5, alignItems: 'flex-start', p: 1, pr: 1.5, borderRadius: 3, cursor: 'pointer', border: 2,
                      borderColor: tier === t.value ? 'primary.main' : 'divider', bgcolor: tier === t.value ? 'rgba(15,118,110,.05)' : 'background.paper',
                      transition: 'border-color .15s, background-color .15s', '&:hover': { bgcolor: tier === t.value ? undefined : 'action.hover' },
                      '&:has(:focus-visible)': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}>
                    <Radio value={t.value} size="small" sx={{ mt: -.25 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: .5 }}>
                        <Typography sx={{ fontWeight: 700 }}>{t.label}</Typography>
                        <Chip size="small" color={t.color} variant="outlined" label={t.route} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: .25, lineHeight: 1.5, fontSize: 13 }}>{t.consequence}</Typography>
                    </Box>
                  </Box>
                ))}
              </RadioGroup>
            </FormControl>

            {error && (
              <Alert severity="error" role="alert" sx={{ mt: 1.5 }}
                action={error.retry ? <Button color="inherit" size="small" onClick={submit}>Retry</Button> : undefined}>
                {error.message}
              </Alert>
            )}

            <Box sx={{ mt: 'auto', pt: 1.5, flexShrink: 0 }}>
              {busy && (
                <Box sx={{ mb: 1 }}>
                  <LinearProgress />
                  <ShimmerLoader label="Extracting a cited fact index" hint="About a minute or less on the cloud model. Restricted sources run on this machine and can take a few minutes." />
                </Box>
              )}
              <Button variant="contained" size="large" fullWidth disabled={!canSubmit} onClick={submit} endIcon={busy ? undefined : <ArrowForwardRounded />}
                sx={{ minHeight: 46 }}>
                {busy ? 'Reading the source…' : 'Continue: extract facts'}
              </Button>
            </Box>
          </Panel>

          {recent.length > 0 && (
            <Panel dense title="Recent sources" id="recent" sx={{ flexShrink: 0, '@media (max-height: 820px) and (min-width: 1200px)': { display: 'none' } }}>
              <List disablePadding>
                {recent.slice(0, 2).map((r) => (
                  <ListItemButton key={r.id} component={RouterLink} to={`/sources/${r.id}`} sx={{ borderRadius: 2, py: .25 }}>
                    <ListItemText primary={r.label || 'Untitled source'} slotProps={{ primary: { noWrap: true } }}
                      secondary={`${TIER_LABEL[r.tier]} · ${new Date(r.at).toLocaleString()}`} />
                  </ListItemButton>
                ))}
              </List>
            </Panel>
          )}
        </Box>
      </Box>
    </Page>
  );
}
