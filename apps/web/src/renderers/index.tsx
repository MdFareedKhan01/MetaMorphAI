import type React from 'react';
import type { Claim } from '@ps154/shared';
import { ClaimSpan } from '../components/ClaimSpan';
import { SeverityPill } from '../components/FactsPanel';

export const isClaim = (v: any): v is Claim => !!v && typeof v === 'object'
  && typeof v.text === 'string' && typeof v.status === 'string' && Array.isArray(v.source_refs);

const Inline = ({ items }: { items: unknown }) =>
  <>{(Array.isArray(items) ? items : [items]).filter(isClaim).map((c, i) => <ClaimSpan key={c.id ?? i} claim={c} />)}</>;

/** A labelled block inside a card. Blocks are separated by a hairline, not by boxes. */
const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">{label}</h4>
    {children}
  </section>
);

const List = ({ items, ordered = false }: { items: unknown[]; ordered?: boolean }) => {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`space-y-2 pl-5 leading-7 text-slate-800 marker:font-semibold marker:text-teal-700 ${ordered ? 'list-decimal' : 'list-disc'}`}>
      {items.filter(isClaim).map((c, i) => <li key={c.id ?? i} className="pl-1"><ClaimSpan claim={c} /></li>)}
    </Tag>
  );
};

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12.5px] text-slate-700">{children}</span>
);

function AdvisoryView({ content: c }: { content: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-1"><SeverityPill value={c.severity} /></span>
        <p className="text-[18px] font-semibold leading-snug text-slate-900">{c.title}</p>
      </div>
      <p className="leading-7 text-slate-800"><Inline items={c.summary} /></p>
      <Section label="Affected systems"><List items={c.affected_systems} /></Section>
      {c.indicators?.length > 0 && (
        <Section label="Indicators">
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60">
            {c.indicators.map((i: any) => (
              <li key={`${i.type}-${i.value}`} className="flex items-center gap-3 px-3 py-1.5">
                <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{i.type}</span>
                <code className="font-mono text-[13.5px] text-slate-900">{i.value}</code>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section label="Mitigations"><List items={c.mitigations} ordered /></Section>
      {c.references?.length > 0 && (
        <Section label="References">
          <div className="flex flex-wrap gap-2">{c.references.map((r: string) => <Chip key={r}>{r}</Chip>)}</div>
        </Section>
      )}
    </div>
  );
}

function ExecutiveSummaryView({ content: c }: { content: any }) {
  return (
    <div className="space-y-4">
      <p className="text-[19px] font-semibold leading-snug text-slate-900">{c.headline}</p>
      <Section label="Key points"><List items={c.key_points} /></Section>
      <Section label="Impact"><p className="leading-7 text-slate-800"><Inline items={c.impact} /></p></Section>
      <Section label="Decisions required"><List items={c.decisions_required} ordered /></Section>
    </div>
  );
}

function LinkedInPostView({ content: c }: { content: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.05)]">
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">M</span>
        <div className="leading-tight">
          <p className="text-[14px] font-semibold text-slate-900">Sector CERT (demo)</p>
          <p className="text-[12.5px] text-slate-500">now</p>
        </div>
      </div>
      <p className="text-[16.5px] font-semibold leading-7 text-slate-900"><Inline items={c.hook} /></p>
      <p className="mt-2 leading-7 text-slate-800"><Inline items={c.body} /></p>
      <p className="mt-3 text-[14.5px] font-medium text-teal-700">
        {c.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join('  ')}
      </p>
    </div>
  );
}

/** Any format: headings from field names, claims as ClaimSpans, lists as lists. */
export function GenericView({ content }: { content: unknown }) {
  const walk = (v: unknown): React.ReactNode => {
    if (isClaim(v)) return <ClaimSpan claim={v} />;
    if (Array.isArray(v)) return <ul className="list-disc space-y-1 pl-5 leading-7">{v.map((x, i) => <li key={i}>{walk(x)}</li>)}</ul>;
    if (v && typeof v === 'object') return Object.entries(v)
      .filter(([k]) => !['source_refs', 'id', 'grounded', 'status'].includes(k))
      .map(([k, x]) => <Section key={k} label={k.replace(/_/g, ' ')}>{walk(x)}</Section>);
    return <span>{String(v)}</span>;
  };
  return <div className="space-y-4">{walk(content)}</div>;
}

export const RENDERERS: Record<string, (p: { content: any }) => React.ReactNode> = {
  advisory: AdvisoryView, executive_summary: ExecutiveSummaryView, linkedin_post: LinkedInPostView,
};
