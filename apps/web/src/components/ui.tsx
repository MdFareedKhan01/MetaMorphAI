import type { ReactNode } from 'react';
import { Alert, AlertTitle, Box, Breadcrumbs, Button, Chip, Link, Paper, Skeleton, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import NavigateNextRounded from '@mui/icons-material/NavigateNextRounded';

/**
 * Page width and rhythm in one place, so every screen lines up.
 * `fit` makes the page exactly one desktop viewport tall (below the app bar) with tight padding and no max width,
 * so a screen that has to be seen whole (Ingest, Confirm) never scrolls; its panels scroll inside themselves instead.
 */
export const APPBAR_H = 67; // 66px toolbar + 1px border on md and up
export function Page({ children, wide = false, fit = false }: { children: ReactNode; wide?: boolean; fit?: boolean }) {
  return (
    <Box component="main" sx={{
      mx: 'auto', width: '100%', maxWidth: fit ? 'none' : wide ? 1560 : 1200,
      px: { xs: 2, sm: 3, lg: fit ? 6 : 5 }, py: { xs: 3, md: 5, lg: fit ? 2.5 : 5 },
      ...(fit && { display: { lg: 'flex' }, flexDirection: 'column', height: { lg: `calc(100dvh - ${APPBAR_H}px)` }, overflow: { lg: 'hidden' } }),
    }}>
      {children}
    </Box>
  );
}

export function PageHeader({ title, subtitle, crumbs, actions, meta, dense = false }: {
  title: string; subtitle?: ReactNode; actions?: ReactNode; meta?: ReactNode; dense?: boolean;
  crumbs?: { label: string; to?: string }[];
}) {
  return (
    <Box sx={{ mb: dense ? { xs: 2, lg: 1.5 } : 3, flexShrink: 0 }}>
      {crumbs && crumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNextRounded fontSize="small" />} aria-label="Breadcrumb" sx={{ mb: dense ? .25 : 1, fontSize: 14 }}>
          {crumbs.map((c, i) => c.to && i < crumbs.length - 1
            ? <Link key={c.label} component={RouterLink} to={c.to} underline="hover" color="text.secondary">{c.label}</Link>
            : <Typography key={c.label} color="text.primary" aria-current="page" sx={{ fontSize: 14 }}>{c.label}</Typography>)}
        </Breadcrumbs>
      )}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={dense ? 1 : 2} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', columnGap: 2, rowGap: .25, flexWrap: 'wrap' }}>
            <Typography component="h1" variant="h1" sx={{ fontSize: dense ? { xs: '1.4rem', lg: '1.5rem' } : { xs: '1.6rem', md: '2rem' } }}>{title}</Typography>
            {meta && dense && <Box sx={{ minWidth: 0 }}>{meta}</Box>}
          </Stack>
          {subtitle && <Typography color="text.secondary" variant={dense ? 'body2' : 'body1'} sx={{ mt: dense ? .25 : 1, maxWidth: dense ? 'none' : 720, lineHeight: dense ? 1.5 : 1.7 }}>{subtitle}</Typography>}
          {meta && !dense && <Box sx={{ mt: 1.5 }}>{meta}</Box>}
        </Box>
        {actions && <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>{actions}</Stack>}
      </Stack>
    </Box>
  );
}

/** `fill` stretches the panel to its grid cell and lets only its body scroll; `dense` tightens the padding. */
export function Panel({ title, description, action, children, id, sx, fill = false, dense = false }: {
  title?: string; description?: ReactNode; action?: ReactNode; children: ReactNode; id?: string; sx?: object;
  fill?: boolean; dense?: boolean;
}) {
  const pad = dense ? { xs: 2, lg: 2 } : { xs: 2, sm: 3 };
  return (
    <Paper component="section" variant="outlined" aria-labelledby={title ? `${id ?? title}-h` : undefined}
      sx={{ p: pad, borderRadius: 3, borderColor: 'divider', boxShadow: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -14px rgba(16,24,40,.10)',
        ...(fill && { display: { lg: 'flex' }, flexDirection: 'column', minHeight: 0 }), ...sx }}>
      {(title || action) && (
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: dense ? 1.25 : 2, flexShrink: 0 }} spacing={2}>
          <Box>
            {title && <Typography id={`${id ?? title}-h`} component="h2" variant="h3">{title}</Typography>}
            {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{description}</Typography>}
          </Box>
          {action}
        </Stack>
      )}
      {fill ? <Box sx={{ flex: { lg: 1 }, minHeight: 0, pt: { lg: 1 }, mt: { lg: -1 }, overflowY: { lg: 'auto' }, display: { lg: 'flex' }, flexDirection: 'column' }}>{children}</Box> : children}
    </Paper>
  );
}

/** The three-stage flow every source goes through. `active` is the 0-based stage now in progress. */
const FLOW = ['Source', 'Confirm', 'Generate'];
export function Flow({ active }: { active: number }) {
  return (
    <Stepper activeStep={active} aria-label="Progress" sx={{ display: { xs: 'none', md: 'flex' }, width: 340, '& .MuiStepLabel-label': { fontSize: 13 } }}>
      {FLOW.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
    </Stepper>
  );
}

/** Text that shimmers while something runs. Falls back to plain text under reduced motion. */
export function ShimmerLoader({ label, hint }: { label: string; hint?: string }) {
  return (
    <Box role="status" aria-live="polite" aria-busy="true" sx={{ py: 1 }}>
      <Typography className="shimmer-text" sx={{ fontWeight: 600 }}>{label}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{hint}</Typography>}
    </Box>
  );
}

export function LoadingState({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <Box role="status" aria-busy="true" aria-live="polite" sx={{ py: 1 }}>
      <Typography className="shimmer-text" sx={{ fontWeight: 600, mb: 2 }}>{label}</Typography>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="text" sx={{ fontSize: '1rem', width: `${92 - i * 14}%` }} animation="wave" />
      ))}
    </Box>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', py: 5, px: 2 }}>
      <InboxOutlined sx={{ fontSize: 40, color: 'text.disabled' }} />
      <Typography variant="h4">{title}</Typography>
      {body && <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>{body}</Typography>}
      {action}
    </Stack>
  );
}

/** Failed request: says what happened in plain words and offers a retry when one makes sense. */
export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again' }: {
  title?: string; message: string; onRetry?: () => void; retryLabel?: string;
}) {
  return (
    <Alert severity="error" icon={<ErrorOutlineRounded />} role="alert" sx={{ alignItems: 'flex-start', borderRadius: 3 }}
      action={onRetry && <Button color="inherit" size="small" startIcon={<RefreshRounded />} onClick={onRetry}>{retryLabel}</Button>}>
      <AlertTitle>{title}</AlertTitle>
      {message}
    </Alert>
  );
}

const TONE: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'> = {
  draft: 'default', submitted: 'info', approved: 'success', rejected: 'error',
  queued: 'default', running: 'primary', complete: 'success', partial: 'warning', failed: 'error',
};
/** Status as text plus colour, never colour alone. */
export function StatusChip({ value, label }: { value: string; label?: string }) {
  return <Chip size="small" label={label ?? value} color={TONE[value] ?? 'default'} variant={TONE[value] && TONE[value] !== 'default' ? 'filled' : 'outlined'}
    sx={label ? undefined : { textTransform: 'capitalize' }} />;
}
