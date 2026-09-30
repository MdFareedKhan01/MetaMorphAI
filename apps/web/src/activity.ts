import { useSyncExternalStore } from 'react';

/** The batch the user is watching, so the header can show a live indicator from any page. */
type Active = { batchId: string; overall: string; ready: number; total: number } | null;
let active: Active = null;
const listeners = new Set<() => void>();

export function setActiveBatch(next: Active) {
  const same = active && next && active.batchId === next.batchId && active.overall === next.overall
    && active.ready === next.ready && active.total === next.total;
  if (same || (active === null && next === null)) return;
  active = next;
  listeners.forEach((l) => l());
}
export const useActiveBatch = () =>
  useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => active);
