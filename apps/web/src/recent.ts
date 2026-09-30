import type { Classification } from '@ps154/shared';

/** Sources this browser created, newest first. A per-viewer convenience: the server has no list endpoint. */
export type RecentSource = { id: string; label: string; tier: Classification; at: string };
const KEY = 'ps154.recent';

export function readRecent(): RecentSource[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((r) => r && typeof r.id === 'string').slice(0, 5) : [];
  } catch { return []; }
}

export function rememberSource(entry: RecentSource) {
  try {
    const next = [entry, ...readRecent().filter((r) => r.id !== entry.id)].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* private window */ }
}
