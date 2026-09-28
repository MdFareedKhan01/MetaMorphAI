import { describe, expect, it } from 'vitest';
import { splitSpans } from '../src/spans';

describe('splitSpans (SRS §5.1)', () => {
  it('gives every span offsets that point back at its exact text', () => {
    const text = '# Title\nFirst sentence here. Second one follows.\n\nThird after a gap.';
    const spans = splitSpans(text);
    expect(spans).toHaveLength(4);
    for (const s of spans) expect(text.slice(s.start_offset, s.end_offset)).toBe(s.text);
    expect(spans.map((s) => s.span_id)).toEqual(['span_1', 'span_2', 'span_3', 'span_4']);
  });

  it('ends a span at a line break, so a heading is its own span', () => {
    const spans = splitSpans('## Summary\nThe campaign began on 14 September.');
    expect(spans.map((s) => s.text)).toEqual(['## Summary', 'The campaign began on 14 September.']);
  });

  it('numbers PDF pages, and leaves page unset for pasted text', () => {
    const pages = ['Page one says this.', 'Page two says that.'];
    expect(splitSpans(pages.join('\n\n'), pages).map((s) => s.page)).toEqual([1, 2]);
    expect(splitSpans('Just pasted text.')[0].page).toBeUndefined();
  });
});
