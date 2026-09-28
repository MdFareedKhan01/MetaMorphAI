import type { Span } from './claim';

/** Split text into sentence spans. Pass `pages` for PDFs: the text must be pages.join('\n\n'). */
export function splitSpans(text: string, pages?: string[]): Span[] {
  const starts: number[] = [];
  if (pages) {
    let offset = 0;
    for (const p of pages) {
      starts.push(offset);
      offset += p.length + 2;
    }
  }
  const pageOf = (offset: number) => {
    let i = starts.length - 1;
    while (i > 0 && starts[i] > offset) i--;
    return i + 1;
  };
  // Line breaks always end a sentence, so headings and list items become their own spans.
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
  const spans: Span[] = [];
  for (const { segment, index } of segmenter.segment(text)) {
    const body = segment.trim();
    if (body.length < 2) continue;
    const start = index + (segment.length - segment.trimStart().length);
    spans.push({
      span_id: `span_${spans.length + 1}`,
      text: body,
      start_offset: start,
      end_offset: start + body.length,
      ...(pages ? { page: pageOf(start) } : {}),
    });
  }
  return spans;
}
