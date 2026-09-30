import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Alert, Link, Stack, Typography } from '@mui/material';
import { api, setToken } from '../api';
import { AuthLayout, CredentialFields, SubmitButton, formValues } from '../components/AuthLayout';

export default function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api<{ token: string }>('/auth/signup', { method: 'POST', body: JSON.stringify(formValues(e)) });
      setToken(r.token);
      navigate('/', { replace: true });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} aria-busy={busy}>
        <Stack spacing={3}>
          <div>
            <Typography component="h1" variant="h2">Create an account</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>New accounts start with operator access.</Typography>
          </div>
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <CredentialFields signup />
          <SubmitButton busy={busy} busyLabel="Creating account…">Sign up</SubmitButton>
          <Typography variant="body2" color="text.secondary" align="center">
            Already have an account? <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>Sign in</Link>
          </Typography>
        </Stack>
      </form>
    </AuthLayout>
  );
}
