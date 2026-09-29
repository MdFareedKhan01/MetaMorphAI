import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, setToken } from '../api';

export default function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<{ token: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: f.get('name'), password: f.get('password') }),
      });
      setToken(r.token);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 max-w-sm space-y-4 rounded-lg border p-6">
      <div>
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-slate-600">New accounts start with operator access.</p>
      </div>
      <input name="name" required minLength={3} maxLength={80} placeholder="Your name" className="w-full rounded border px-3 py-2" />
      <input name="password" required minLength={8} maxLength={128} type="password" placeholder="Password (8+ characters)" className="w-full rounded border px-3 py-2" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button className="w-full rounded bg-slate-900 py-2 text-white">Sign up</button>
      <p className="text-center text-sm text-slate-600">
        Already have an account? <Link className="font-medium text-slate-900 underline" to="/login">Sign in</Link>
      </p>
    </form>
  );
}