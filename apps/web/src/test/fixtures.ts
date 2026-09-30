import { vi } from 'vitest';
import { splitSpans, type Artifact, type BatchSnapshot, type Canonical, type SourceRecord } from '@ps154/shared';

/** A token whose payload the page can read. The signature is fake: only the server verifies. */
export const jwt = (payload: object) =>
  `h.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.s`;

const RAW = 'Between 3 and 9 September, sector monitoring recorded a campaign against 37 organisations.\n'
  + 'Attackers used firmware flaws in SSL-VPN gateways.\nApply the vendor patch immediately.';

export const canonical = (): Canonical => ({
  title: 'VPN gateway campaign', severity: { value: 'high', source_refs: ['span_1'] },
  entities: [{ name: 'APT-X', type: 'threat_actor', source_refs: ['span_2'] }],
  events: [{ summary: 'Campaign recorded', when: null, source_refs: ['span_1'] }],
  affected_systems: [{ name: 'SSL-VPN gateways', source_refs: ['span_2'] }],
  indicators: [],
  key_facts: [{ text: '37 organisations were targeted.', status: 'fact', source_refs: ['span_1'] }],
  recommendations: [{ text: 'Apply the vendor patch.', source_refs: ['span_3'] }],
} as Canonical);

export const source = (over: Partial<SourceRecord> = {}): SourceRecord => ({
  id: 's1', filename: null, mime_type: 'text/plain', raw_content: RAW, classification: 'public',
  spans: splitSpans(RAW), canonical: canonical(), source_hash: 'h', created_at: '2026-09-30T08:00:00.000Z', ...over,
});

export const artifact = (over: Partial<Artifact> = {}): Artifact => ({
  task_id: 't1', batch_id: 'b1', format_id: 'linkedin_post', status: 'ready', version: 1,
  effective_config: { audience: 'Sector CISOs', tone: 'formal', detail: 'medium', language: 'en' },
  content: { hook: { id: 'c1', text: '37 organisations were targeted.', source_refs: ['span_1'], status: 'fact', grounded: true },
             body: [], hashtags: [] },
  claims: [], grounding_score: 1, verification: { passed: true, revised: false, fixes: [], open_issues: [] },
  meta: { provider: 'cloud', model: 'openai/gpt-oss-120b', fallback_reason: null, attempts: 1, latency_ms: 4000, perturbed: false },
  review_state: 'draft', review_comment: null, error_log: null, ...over,
});

export const snapshot = (artifacts: Artifact[], over: Partial<BatchSnapshot> = {}): BatchSnapshot => ({
  batch_id: 'b1', source_id: 's1', overall_status: 'running', stream_last_id: '0',
  global_config: artifacts[0]?.effective_config ?? artifact().effective_config, artifacts, ...over,
});

type Reply = { status?: number; body?: unknown };
/** Routes fetch by "METHOD /path" (without /api/v1). An unknown route answers 404. */
export function fakeApi(routes: Record<string, Reply | ((init: RequestInit) => Reply)>) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${String(url).replace('/api/v1', '')}`;
    calls.push(key);
    const r = routes[key];
    const reply = typeof r === 'function' ? r(init) : r ?? { status: 404, body: { error: 'Not found' } };
    const status = reply.status ?? 200;
    return { ok: status < 400, status, statusText: String(status), json: async () => reply.body ?? {}, blob: async () => new Blob(['x']) };
  });
  vi.stubGlobal('fetch', fn);
  return { calls, fn };
}
