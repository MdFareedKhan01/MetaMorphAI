import { useEffect, useRef, type ReactNode } from 'react';
import type { Span } from '@ps154/shared';

/**
 * The source, rebuilt from its spans. `active` is the selected claim's passages (yellow);
 * `cited` optionally tints every passage that any claim relies on, so coverage is visible.
 */
export function SourcePane({ raw, spans, active, cited }:
    { raw: string; spans: Span[]; active: Set<string>; cited?: Set<string> }) {
  const nodes = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const first = spans.find((s) => active.has(s.span_id));
    if (first) nodes.current.get(first.span_id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active, spans]);

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start_offset > cursor) parts.push(raw.slice(cursor, s.start_offset));
    const on = active.has(s.span_id);
    const used = !on && cited?.has(s.span_id);
    parts.push(
      <span key={s.span_id} ref={(el) => { if (el) nodes.current.set(s.span_id, el); }}
        className={`rounded-[3px] transition-colors [box-decoration-break:clone] ${
          on ? 'bg-yellow-200 px-0.5 ring-2 ring-yellow-300' : used ? 'bg-teal-50 px-0.5' : ''}`}>
        {raw.slice(s.start_offset, s.end_offset)}
        {on && s.page !== undefined &&
          <sup className="ml-1 rounded-full bg-slate-800 px-1.5 py-px text-[10px] font-medium text-white">p.{s.page}</sup>}
      </span>,
    );
    cursor = s.end_offset;
  }
  parts.push(raw.slice(cursor));
  return <div className="whitespace-pre-wrap text-[16.5px] leading-8 text-slate-800">{parts}</div>;
}
