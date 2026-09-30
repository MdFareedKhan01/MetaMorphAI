import { useMemo, useState } from 'react';
import type { Claim } from '@ps154/shared';
import type { Artifact } from '@ps154/shared';
import type { Card } from '../batch/state';
import advisory from '../mocks/advisory.ready.json';
import { DEMO_SOURCE, DEMO_SPANS } from '../mocks/demo-source';
import { SelectionContext } from '../selection';
import { CardView } from '../components/Card';
import { CardBoundary } from '../components/CardBoundary';
import { ClaimSpan } from '../components/ClaimSpan';
import { SourcePane } from '../components/SourcePane';

/**
 * The Gallery is an offline showcase: no login, no API, no model. It exists so that
 * (1) the click-to-source interaction can be shown and screenshotted anywhere, and
 * (2) every card state can be seen, including ones that are hard to trigger live.
 * All the sample content below is drawn from DEMO_SOURCE, so every citation is real.
 */

const ADVISORY = advisory as unknown as Artifact;
const claim = (id: string, text: string, status: Claim['status'], refs: string[], grounded = true): Claim =>
  ({ id, text, status, source_refs: refs, grounded });

const meta = (provider: 'cloud' | 'local', model: string) =>
  ({ provider, model, fallback_reason: null, attempts: 1, latency_ms: 900, perturbed: false });
const shell = { claims: [] as Claim[], review_state: 'draft' as const, review_comment: null, error_log: null };

const LINKEDIN: Artifact = {
  ...shell, task_id: 't-linkedin', batch_id: 'b1', format_id: 'linkedin_post', version: 1, status: 'ready',
  effective_config: { audience: 'General public', tone: 'conversational', detail: 'brief', language: 'en' },
  grounding_score: 1,
  verification: { passed: true, revised: false, fixes: [], open_issues: [] },
  meta: meta('local', 'qwen2.5:7b'),
  content: {
    hook: claim('c1', '37 organisations had their VPN gateways targeted between 3 and 9 September.', 'fact', ['span_1']),
    body: [
      claim('c2', 'Three confirmed attackers used firmware flaws in SSL-VPN gateways released before June 2026.', 'fact', ['span_3']),
      claim('c3', "If you run one, apply the vendor's September security patch now.", 'fact', ['span_4']),
    ],
    hashtags: ['CyberSecurity', 'VPN', 'PatchNow'],
  },
};

const EXECUTIVE: Artifact = {
  ...shell, task_id: 't-executive', batch_id: 'b1', format_id: 'executive_summary', version: 1, status: 'ready',
  effective_config: { audience: 'Ministry leadership', tone: 'formal', detail: 'brief', language: 'en' },
  grounding_score: 1,
  verification: { passed: true, revised: false, fixes: [], open_issues: [] },
  meta: meta('cloud', 'openai/gpt-oss-120b'),
  content: {
    headline: '37 organisations were targeted through VPN gateways; patching is the priority',
    key_points: [
      claim('c1', 'Sector monitoring recorded a campaign against VPN gateways at 37 organisations between 3 and 9 September.', 'fact', ['span_1']),
      claim('c2', 'Three organisations confirmed that attackers used firmware flaws in SSL-VPN gateways released before June 2026.', 'fact', ['span_3']),
      claim('c3', "Analysts recommend applying the vendor's September security patch immediately.", 'fact', ['span_4']),
    ],
    impact: [
      claim('c4', 'The narrow band of source addresses points to a targeted campaign rather than opportunistic scanning.', 'inference', ['span_2']),
    ],
    decisions_required: [
      claim('c5', "Authorise the vendor's September security patch across all exposed gateways.", 'fact', ['span_4']),
    ],
  },
};

const READY: Artifact[] = [ADVISORY, LINKEDIN, EXECUTIVE];
const asCard = (x: Artifact): Card =>
  ({ task_id: x.task_id, format_id: x.format_id, status: 'ready', effective_config: x.effective_config, artifact: x });

const state = (format_id: string): Pick<Card, 'task_id' | 'format_id' | 'effective_config'> =>
  ({ task_id: `t-${format_id}`, format_id, effective_config: ADVISORY.effective_config });
const STATES: Card[] = [
  { ...state('linkedin_post'), status: 'waiting' },
  { ...state('executive_summary'), status: 'running', started_at: Date.now() - 9000 },
  { ...state('advisory'), status: 'revising', detail: '1 finding', started_at: Date.now() - 14000 },
  { ...state('x_thread'), status: 'error',
    error: { code: 'PROVIDERS_UNAVAILABLE', message: 'No model provider could be reached. Retry when one is available.', retryable: true } },
];

/** Every span id that any claim or indicator in the sample cards relies on. */
function refsOf(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => refsOf(x, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.source_refs)) (o.source_refs as string[]).forEach((r) => out.add(r));
    Object.values(o).forEach((x) => refsOf(x, out));
  }
  return out;
}
const CITED = new Set([...refsOf(READY.map((x) => x.content))].filter((r) => DEMO_SPANS.some((s) => s.span_id === r)));

const LEGEND: { claim: Claim; title: string; note: string }[] = [
  { claim: claim('l1', 'Stated in the source', 'fact', ['span_1']), title: 'Fact', note: 'The source says it.' },
  { claim: claim('l2', 'Follows from the source', 'inference', ['span_2']), title: 'Inferred', note: 'Reasoned from the source, not stated in it.' },
  { claim: claim('l3', 'No supporting passage', 'inference', [], false), title: 'Unverified', note: 'Cites nothing. Review this first.' },
];

function Legend() {
  return (
    <ul className="mt-7 grid gap-3 sm:grid-cols-3">
      {LEGEND.map((l) => (
        <li key={l.title} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <p className="pointer-events-none text-[15px] leading-7"><ClaimSpan claim={l.claim} /></p>
          <p className="mt-1 text-[13px] text-slate-500"><b className="font-semibold text-slate-700">{l.title}.</b> {l.note}</p>
        </li>
      ))}
    </ul>
  );
}

function SourcePanel({ active }: { active: Set<string> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.05),0_8px_24px_-12px_rgba(16,24,40,.10)]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <span aria-hidden className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[13px] font-bold text-slate-600">SRC</span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight text-slate-900">Source</h2>
          <p className="text-[12.5px] text-slate-500">Synthetic incident note · {DEMO_SPANS.length} passages · {CITED.size} cited</p>
        </div>
      </div>
      <div className="max-h-[calc(100vh-15rem)] overflow-y-auto px-6 py-5">
        <SourcePane raw={DEMO_SOURCE} spans={DEMO_SPANS} active={active} cited={CITED} />
      </div>
      <p className="border-t border-slate-100 bg-slate-50/60 px-6 py-2.5 text-[12.5px] text-slate-500">
        <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-teal-100 align-middle" />
        Tinted passages are cited by at least one claim.
      </p>
    </div>
  );
}

function Hint({ active }: { active: Claim | null }) {
  const unverified = active && active.source_refs.length === 0;
  return (
    <p role="status" aria-live="polite"
      className={`rounded-xl border px-4 py-2.5 text-[14px] leading-6 ${
        unverified ? 'border-amber-200 bg-amber-50 text-amber-900'
        : active ? 'border-yellow-200 bg-yellow-50 text-yellow-900'
        : 'border-teal-100 bg-teal-50/60 text-teal-900'}`}>
      {unverified ? 'This sentence cites no passage in the source, so nothing lights up. It is marked unverified.'
        : active ? 'Showing the passage this sentence was written from. Click it again to clear.'
        : 'Click any underlined sentence. The passage it was written from lights up in the source.'}
    </p>
  );
}

export default function Gallery() {
  const [active, select] = useState<Claim | null>(null);
  const refs = useMemo(() => new Set(active?.source_refs ?? []), [active]);
  return (
    <main className="mx-auto max-w-[1280px] px-6 pb-24 pt-12">
      <header className="max-w-3xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-700">Provenance demo · works offline</p>
        <h1 className="mt-2 text-4xl font-semibold leading-[1.15] tracking-tight text-slate-900">
          Every sentence knows where it came from.
        </h1>
        <p className="mt-3 text-[17px] leading-8 text-slate-600">
          MetaMorph-AI writes each artefact from a fact index built out of your source, and keeps the link.
          Select a sentence to see the exact passage behind it. This page uses sample data only and calls no model or server.
        </p>
        <Legend />
      </header>

      <SelectionContext.Provider value={{ active, select }}>
        <section aria-label="Provenance demo" className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="lg:sticky lg:top-24"><SourcePanel active={refs} /></div>
          <div className="space-y-6">
            <Hint active={active} />
            {READY.map((x) => (
              <CardBoundary key={x.task_id} label={x.format_id}>
                <CardView card={asCard(x)} globalConfig={ADVISORY.effective_config} onRegenerate={() => {}} />
              </CardBoundary>
            ))}
          </div>
        </section>
      </SelectionContext.Provider>

      <section className="mt-20" aria-label="Card states">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Every card has its own state</h2>
        <p className="mt-2 max-w-3xl text-[16px] leading-7 text-slate-600">
          One slow or failed format never blocks the others. Each artefact moves through its own states, and a failed one offers Retry without touching its siblings.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {STATES.map((c) => (
            <CardBoundary key={c.task_id} label={c.format_id}>
              <CardView card={c} globalConfig={ADVISORY.effective_config} onRegenerate={() => {}} />
            </CardBoundary>
          ))}
        </div>
      </section>
    </main>
  );
}
