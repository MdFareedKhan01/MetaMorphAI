import type { ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { Canonical } from '@ps154/shared';

const SEVERITY: Record<string, string> = {
  critical: 'bg-red-700 text-white', high: 'bg-orange-600 text-white',
  medium: 'bg-amber-400 text-amber-950', low: 'bg-slate-200 text-slate-800', unknown: 'bg-slate-100 text-slate-600',
};

export function SeverityPill({ value }: { value: unknown }) {
  // Content comes from a model (or a stub). A wrong shape must degrade to "unknown", never throw.
  const v = typeof value === 'string' && value in SEVERITY ? value : 'unknown';
  return (
    <span className={`inline-block shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase leading-5 tracking-wider ${SEVERITY[v]}`}>
      {v}
    </span>
  );
}

export function FactsPanel({ c }: { c: Canonical }) {
  const actors = c.entities.filter((e) => e.type === 'threat_actor').map((e) => e.name);
  const row = (label: string, value: ReactNode) => (
    <Box sx={{ display: 'flex', gap: 2, py: .75, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
      <Typography component="dt" variant="body2" color="text.secondary" sx={{ width: 92, flexShrink: 0 }}>{label}</Typography>
      <Typography component="dd" variant="body2" sx={{ m: 0, minWidth: 0, overflowWrap: 'anywhere' }}>{value}</Typography>
    </Box>);
  return (
    <Stack spacing={2}>
      <Box component="dl" sx={{ m: 0 }}>
        {row('Severity', <SeverityPill value={c.severity.value} />)}
        {actors.length > 0 && row('Actor', actors.join(', '))}
        {row('Systems', c.affected_systems.map((s) => s.name).join('; ') || '—')}
        {row('Indicators', c.indicators.length)}
      </Box>
      <Box>
        <Typography variant="overline" color="text.secondary">Key facts</Typography>
        <Box component="ul" sx={{ pl: 2.5, my: .5, '& li': { mb: 1, lineHeight: 1.6, fontSize: 14 } }}>
          {c.key_facts.map((f, i) => (
            <li key={i}>{f.text}{f.status === 'inference' &&
              <Chip size="small" label="inferred" color="info" variant="outlined" sx={{ ml: 1, height: 20, fontSize: 11 }} />}</li>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
