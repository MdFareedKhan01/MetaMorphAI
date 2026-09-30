const KEY = 'ps154.token';
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export type Role = 'operator' | 'reviewer' | 'admin';
export type User = { id: string; name: string; role: Role; exp?: number };

/** The payload of a token. Display only: the server is the only party that verifies it. */
function decode(t: string | null): User | null {
  if (!t) return null;
  try {
    const u = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as User;
    return u && typeof u.name === 'string' ? u : null;
  } catch { return null; }
}
const expired = (u: User | null) => !!u?.exp && u.exp * 1000 <= Date.now();

// One tiny store, so React can subscribe (useSyncExternalStore) and the 401 handler can end the session.
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

let token: string | null = stored();
let endedBy: 'expired' | null = null;
if (token && expired(decode(token))) { token = null; endedBy = 'expired'; } // a stale token from an earlier visit

export function setToken(t: string | null, reason: 'expired' | null = null) {
  token = t;
  endedBy = t ? null : reason;
  try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* private window */ }
  emit();
}
export const expireSession = () => setToken(null, 'expired');
export const getToken = () => token;
export const getEndedBy = () => endedBy;
export const getUser = () => decode(token);

// In-flight request count, for the global loading bar.
let pending = 0;
export const getPending = () => pending;
const track = (n: number) => { pending += n; emit(); };

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: any) { super(message); }
  /** status 0 means the request never got an answer. */
  get network() { return this.status === 0; }
  get forbidden() { return this.status === 403; }
  get notFound() { return this.status === 404; }
}

/** Anything with the shape of a Zod schema; keeps this file free of a direct zod dependency. */
export type Schema<T> = { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { message: string } } };

export async function api<T>(path: string, init: RequestInit = {}, schema?: Schema<T>): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  track(1);
  try {
    let res: Response;
    try { res = await fetch(`/api/v1${path}`, { ...init, headers }); }
    catch { throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.'); }

    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.startsWith('/auth/')) expireSession();
    if (!res.ok) {
      const fallback = res.status === 403 ? 'You do not have permission to do that.'
        : res.status === 404 ? 'Not found.' : res.status >= 500 ? 'The server had a problem. Try again.' : res.statusText;
      throw new ApiError(res.status, body?.error ?? fallback, body);
    }
    if (schema) {
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw new ApiError(res.status, 'The server sent a response this page does not understand.', body);
      return parsed.data;
    }
    return body as T;
  } finally { track(-1); }
}

/** Exports return files, not JSON. */
export async function download(path: string, filename: string) {
  let res: Response;
  try { res = await fetch(`/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } }); }
  catch { throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.'); }
  if (res.status === 401) expireSession();
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({})))?.error ?? 'The export failed.');
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

export const socketUrl = (path: string) =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/v1${path}`;
