import type React from 'react';
import type { Claim } from '@ps154/shared';
import { ClaimSpan } from '../components/ClaimSpan';
import { SeverityPill } from '../components/FactsPanel';

export const isClaim = (v: any): v is Claim => !!v && typeof v === 'object'
  && typeof v.text === 'string' && typeof v.status === 'string' && Array.isArray(v.source_refs);

const Inline = ({ items }: { items: unknown }) =>
  <>{(Array.isArray(items) ? items : [items]).filter(isClaim).map((c) => <ClaimSpan key={c.id} claim={c} />)}</>;

const List = ({ items, ordered = false }: { items: unknown[]; ordered?: boolean }) => {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
      {items.filter(isClaim).map((c) => <li key={c.id}><ClaimSpan claim={c} /></li>)}
    </Tag>
  );
};

const Heading = ({ children }: { children: string }) =>
  <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h4>;

function AdvisoryView({ content: c }: { content: any }) {
  return (
    <div className="space-y-2 leading-relaxed">
      <p className="flex items-center gap-2 font-semibold"><SeverityPill value={c.severity} /> {c.title}</p>
      <p><Inline items={c.summary} /></p>
      <Heading>Affected systems</Heading><List items={c.affected_systems} />
      <Heading>Indicators</Heading>
      <ul className="font-mono text-sm">{c.indicators.map((i: any) => <li key={i.value}>{i.type}: {i.value}</li>)}</ul>
      <Heading>Mitigations</Heading><List items={c.mitigations} ordered />
      {c.references?.length > 0 && <>
        <Heading>References</Heading>
        <ul className="text-sm text-slate-600">{c.references.map((r: string) => <li key={r}>{r}</li>)}</ul>
      </>}
    </div>
  );
}

function ExecutiveSummaryView({ content: c }: { content: any }) {
  return (
    <div className="space-y-2 leading-relaxed">
      <p className="text-lg font-semibold">{c.headline}</p>
      <List items={c.key_points} />
      <Heading>Impact</Heading><p><Inline items={c.impact} /></p>
      <Heading>Decisions required</Heading><List items={c.decisions_required} ordered />
    </div>
  );
}

function LinkedInPostView({ content: c }: { content: any }) {
  return (
    <div className="rounded border bg-white p-4 leading-relaxed">
      <p className="mb-2 text-sm text-slate-500">Sector CERT (demo) · now</p>
      <p className="font-semibold"><Inline items={c.hook} /></p>
      <p className="mt-2"><Inline items={c.body} /></p>
      <p className="mt-2 text-sky-700">{c.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}</p>
    </div>
  );
}

/** Any format: headings from field names, claims as ClaimSpans, lists as lists. */
export function GenericView({ content }: { content: unknown }) {
  const walk = (v: unknown): React.ReactNode => {
    if (isClaim(v)) return <ClaimSpan claim={v} />;
    if (Array.isArray(v)) return <ul className="list-disc pl-5">{v.map((x, i) => <li key={i}>{walk(x)}</li>)}</ul>;
    if (v && typeof v === 'object') return Object.entries(v)
      .filter(([k]) => !['source_refs', 'id', 'grounded', 'status'].includes(k))
      .map(([k, x]) => <div key={k}><Heading>{k.replace(/_/g, ' ')}</Heading>{walk(x)}</div>);
    return <span>{String(v)}</span>;
  };
  return <div className="space-y-1">{walk(content)}</div>;
}

export const RENDERERS: Record<string, (p: { content: any }) => React.ReactNode> = {
  advisory: AdvisoryView, executive_summary: ExecutiveSummaryView, linkedin_post: LinkedInPostView,
};
