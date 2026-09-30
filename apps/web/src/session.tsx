import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { expireSession, getEndedBy, getPending, getToken, getUser, subscribe, type Role, type User } from './api';

/** The signed-in user, re-read whenever the token changes. Works without a provider. */
export function useSession(): { user: User | null; endedBy: 'expired' | null } {
  useSyncExternalStore(subscribe, getToken);
  return { user: getUser(), endedBy: getEndedBy() };
}

export const useRequestsInFlight = () => useSyncExternalStore(subscribe, getPending) > 0;

/** Ends the session at the moment its token expires, instead of waiting for the next 401. */
export function SessionWatcher() {
  const { user } = useSession();
  const exp = user?.exp;
  useEffect(() => {
    if (!exp) return;
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) { expireSession(); return; }
    const t = window.setTimeout(expireSession, Math.min(ms, 2 ** 31 - 1));
    return () => window.clearTimeout(t);
  }, [exp]);
  return null;
}

/** Sends a signed-out visitor to /login, remembers where they were going, and says if the session ran out. */
export function Guard({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, endedBy } = useSession();
  const where = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: where.pathname, expired: endedBy === 'expired' }} />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace state={{ denied: where.pathname }} />;
  return <>{children}</>;
}

export const canGenerate = (role?: Role) => role === 'operator' || role === 'admin';
export const canReview = (role?: Role) => role === 'reviewer' || role === 'admin';
