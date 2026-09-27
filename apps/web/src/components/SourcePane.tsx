import { useEffect, useRef, type ReactNode } from 'react';
import type { Span } from '@ps154/shared';

export function SourcePane({ raw, spans, active }: { raw: string; spans: Span[]; active: Set<string> }) {
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
    parts.push(
      <span key={s.span_id} ref={(el) => { if (el) nodes.current.set(s.span_id, el); }}
        className={`transition-colors ${on ? 'rounded bg-yellow-200 ring-2 ring-yellow-400' : ''}`}>
        {raw.slice(s.start_offset, s.end_offset)}
        {on && s.page !== undefined &&
          <sup className="ml-1 rounded bg-slate-800 px-1 text-[10px] text-white">p.{s.page}</sup>}
      </span>,
    );
    cursor = s.end_offset;
  }
  parts.push(raw.slice(cursor));
  return <div className="whitespace-pre-wrap text-[17px] leading-relaxed text-slate-800">{parts}</div>;
}
