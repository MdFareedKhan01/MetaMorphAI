import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { Alert, Link, Stack, Typography } from '@mui/material';
import { api, setToken } from '../api';
import { AuthLayout, CredentialFields, SubmitButton, formValues } from '../components/AuthLayout';

export default function Login() {
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as { from?: string; expired?: boolean; denied?: string };
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(formValues(e)) });
      setToken(r.token);
      navigate(state.from && state.from !== '/login' ? state.from : '/', { replace: true });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} noValidate={false} aria-busy={busy}>
        <Stack spacing={3}>
          <div>
            <Typography component="h1" variant="h2">Sign in</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>Continue to your workspace.</Typography>
          </div>
          {state.expired && <Alert severity="info">Your session expired. Sign in again to continue.</Alert>}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <CredentialFields />
          <SubmitButton busy={busy} busyLabel="Signing in…">Sign in</SubmitButton>
          <Typography variant="body2" color="text.secondary" align="center">
            Need an account? <Link component={RouterLink} to="/signup" sx={{ fontWeight: 600 }}>Sign up</Link>
          </Typography>
        </Stack>
      </form>
    </AuthLayout>
  );
}
