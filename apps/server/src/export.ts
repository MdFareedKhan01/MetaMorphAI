const HIDDEN = new Set(['source_refs', 'id', 'grounded', 'status']);
const isClaim = (v: any) =>
  v && typeof v === 'object' && typeof v.text === 'string' && Array.isArray(v.source_refs);
const title = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** One line for a list item: a claim's text, or an object's visible values joined. */
function flat(x: unknown): string {
  if (isClaim(x)) return (x as any).text;
  if (x && typeof x === 'object') {
    return Object.entries(x)
      .filter(([k]) => !HIDDEN.has(k))
      .map(([, y]) => flat(y))
      .join(' · ');
  }
  return String(x);
}

function lines(v: unknown, depth: number): string[] {
  if (isClaim(v)) return [(v as any).text];
  if (v === null || v === undefined) return [];
  if (typeof v !== 'object') return [String(v)];
  if (Array.isArray(v)) return v.map((x) => `- ${flat(x)}`);
  return Object.entries(v)
    .filter(([k]) => !HIDDEN.has(k))
    .flatMap(([k, x]) => [
      `${'#'.repeat(Math.min(depth + 2, 4))} ${title(k)}`,
      '',
      ...lines(x, depth + 1),
      '',
    ]);
}

export const toMarkdown = (formatId: string, content: unknown) =>
  [`# ${title(formatId)}`, '', ...lines(content, 0)].join('\n');

export const toPlainText = (formatId: string, content: unknown) =>
  toMarkdown(formatId, content).replace(/^#+ /gm, '').replace(/^- /gm, '');
