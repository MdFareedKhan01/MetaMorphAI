import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, setToken } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<{ token: string }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ name: f.get('name'), password: f.get('password') }) });
      setToken(r.token);
      navigate('/');
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 max-w-sm space-y-4 rounded-lg border p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <input name="name" placeholder="operator" className="w-full rounded border px-3 py-2" />
      <input name="password" type="password" placeholder="Password" className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="w-full rounded bg-slate-900 py-2 text-white">Sign in</button>
    </form>
  );
}
