import { useState, type FormEvent, type ReactNode } from 'react';
import { Box, Button, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import { motion } from 'motion/react';

const POINTS = [
  { icon: <LinkOutlined />, title: 'Every claim traceable', body: 'Click a sentence and the passage it came from lights up in the source.' },
  { icon: <FactCheckOutlined />, title: 'Checked by code, not by the model', body: 'Numbers, identifiers and hedges are tested against the cited sentence.' },
  { icon: <LockOutlined />, title: 'Restricted stays on this machine', body: 'Routing is decided in code, before any provider is chosen.' },
];

/** Centered auth card: product guarantees on the left, credentials on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 66px)', p: { xs: 2, sm: 4, lg: 6 } }}>
      <Box sx={{ display: 'grid', width: '100%', maxWidth: 1120, overflow: 'hidden', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) minmax(0,1fr)' }, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', boxShadow: '0 18px 50px rgba(15, 118, 110, .12)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', p: { xs: 3, sm: 5, lg: 7 }, color: '#fff',
          background: 'radial-gradient(900px 420px at 0% 0%, #14b8a6 0%, transparent 60%), linear-gradient(160deg,#0b4f4a,#0f766e 55%,#115e59)' }}>
          <Typography variant="overline" sx={{ opacity: .8, letterSpacing: '.14em' }}>SIH 2026 · SIH26154</Typography>
          <Typography variant="h2" sx={{ mt: 1, mb: 1.5, fontSize: { xs: '1.8rem', sm: '2.1rem' }, lineHeight: 1.2 }}>One source. Every audience. Nothing invented.</Typography>
          <Typography sx={{ opacity: .85, maxWidth: 460, mb: { xs: 3, sm: 5 }, lineHeight: 1.7 }}>
            MetaMorph-AI turns a threat report into audience-specific artefacts and proves each sentence against the source.
          </Typography>
          <Stack spacing={{ xs: 2, sm: 3 }} sx={{ maxWidth: 480 }}>
            {POINTS.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1 + i * .1, duration: .4 }}>
                <Stack direction="row" spacing={2}>
                  <Box aria-hidden sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: 'rgba(255,255,255,.14)' }}>{p.icon}</Box>
                  <Box><Typography sx={{ fontWeight: 600 }}>{p.title}</Typography><Typography variant="body2" sx={{ opacity: .8 }}>{p.body}</Typography></Box>
                </Stack>
              </motion.div>
            ))}
          </Stack>
        </Box>
        <Box sx={{ display: 'grid', alignItems: 'center', p: { xs: 3, sm: 5, lg: 7 } }}>
          <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Username + password fields shared by sign-in and sign-up. */
export function CredentialFields({ signup }: { signup?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <Stack spacing={2.5}>
      <TextField name="name" label="Username" placeholder={signup ? 'Your name' : 'operator'} autoComplete="username" required
        slotProps={{ inputLabel: { shrink: true }, htmlInput: signup ? { minLength: 3, maxLength: 80 } : {} }} />
      <TextField name="password" label="Password" type={show ? 'text' : 'password'} required
        placeholder={signup ? 'Password (8+ characters)' : 'Password'} autoComplete={signup ? 'new-password' : 'current-password'}
        helperText={signup ? 'At least 8 characters.' : undefined}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: signup ? { minLength: 8, maxLength: 128 } : {},
          input: { endAdornment: (
            <InputAdornment position="end">
              <IconButton edge="end" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}>
                {show ? <VisibilityOffRounded /> : <VisibilityRounded />}
              </IconButton>
            </InputAdornment>) },
        }} />
    </Stack>
  );
}

export function SubmitButton({ busy, children, busyLabel }: { busy: boolean; children: ReactNode; busyLabel: string }) {
  return (
    <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}
      startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined} sx={{ minHeight: 48 }}>
      {busy ? busyLabel : children}
    </Button>
  );
}

export const formValues = (e: FormEvent<HTMLFormElement>) => {
  const f = new FormData(e.currentTarget);
  return { name: String(f.get('name') ?? ''), password: String(f.get('password') ?? '') };
};
