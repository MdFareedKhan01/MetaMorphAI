// Tiny SVG diagram helpers. Output is plain SVG (no CSS classes, no <marker>, no foreignObject)
// so PowerPoint, Word, Keynote and browsers all render it the same way.

export const COLORS = {
  step:  { fill: '#FFFFFF', stroke: '#94A7BA', title: '#0F2B46', text: '#3B4A5A' },
  core:  { fill: '#E6F2F5', stroke: '#0E7490', title: '#0B3B4A', text: '#2F5560' },
  gate:  { fill: '#FDEDE6', stroke: '#C2410C', title: '#7A2E0A', text: '#7A3B1E' },
  model: { fill: '#F3F0FF', stroke: '#6D28D9', title: '#3B1A7A', text: '#4C3A7A' },
  ok:    { fill: '#E7F6EC', stroke: '#15803D', title: '#14532D', text: '#1F5A36' },
  warn:  { fill: '#FFF4DB', stroke: '#B45309', title: '#78350F', text: '#7A4A1A' },
  bad:   { fill: '#FDECEC', stroke: '#B91C1C', title: '#7F1D1D', text: '#7F2A2A' },
};
const FONT = "Segoe UI, Arial, Helvetica, sans-serif";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class Diagram {
  constructor(w, h, { titleSize = 27, bodySize = 21, lineGap = 1.32, pad = 20 } = {}) {
    this.w = w; this.h = h; this.titleSize = titleSize; this.bodySize = bodySize; this.lineGap = lineGap; this.pad = pad;
    this.parts = []; this.warnings = [];
  }
  add(s) { this.parts.push(s); }

  band(x, y, w, h, label, color = '#C7D3E0', tab = '#0F2B46') {
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#F7F9FB" stroke="${color}" stroke-width="2"/>`);
    this.add(`<rect x="${x}" y="${y}" width="46" height="${h}" rx="18" fill="${tab}"/>`);
    this.add(`<rect x="${x + 30}" y="${y}" width="16" height="${h}" fill="${tab}"/>`);
    const cx = x + 23, cy = y + h / 2;
    this.add(`<text x="${cx}" y="${cy}" transform="rotate(-90 ${cx} ${cy})" text-anchor="middle" dominant-baseline="central" ` +
             `font-family="${FONT}" font-size="21" font-weight="700" letter-spacing="1.5" fill="#FFFFFF">${esc(label)}</text>`);
  }

  /** A rounded box with a bold title and body lines. shape: 'box' | 'diamond'. */
  node(id, x, y, w, h, title, lines, kind = 'step', { shape = 'box', lineColors = {}, align = 'left', thick } = {}) {
    const c = COLORS[kind];
    const sw = thick ?? (kind === 'gate' ? 4 : kind === 'step' ? 2 : 3);
    if (shape === 'diamond') {
      this.add(`<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${sw}"/>`);
    } else {
      this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${sw}"/>`);
    }
    const pad = this.pad, ts = this.titleSize, bs = this.bodySize;
    const totalH = ts * 1.15 + (lines.length ? 8 : 0) + lines.length * bs * this.lineGap;
    let ty = y + (h - totalH) / 2 + ts * 0.95;
    const centre = shape === 'diamond' || align === 'centre';
    const tx = centre ? x + w / 2 : x + pad;
    const anchor = centre ? 'middle' : 'start';
    const inner = (shape === 'diamond' ? w * 0.5 : w - pad * 2);
    this.check(id, title, ts, true, inner);
    this.add(`<text x="${tx}" y="${ty}" text-anchor="${anchor}" font-family="${FONT}" font-size="${ts}" font-weight="700" fill="${c.title}">${esc(title)}</text>`);
    ty += 8;
    lines.forEach((ln, i) => {
      ty += bs * this.lineGap;
      this.check(id, ln, bs, false, inner);
      const col = lineColors[i] ?? c.text;
      this.add(`<text x="${tx}" y="${ty}" text-anchor="${anchor}" font-family="${FONT}" font-size="${bs}" fill="${col}">${esc(ln)}</text>`);
    });
    return { id, x, y, w, h };
  }

  check(id, text, size, bold, inner) {
    const est = text.length * size * (bold ? 0.6 : 0.53);
    if (est > inner) this.warnings.push(`${id}: "${text}" ~${Math.round(est)}px > ${Math.round(inner)}px`);
  }

  /** Free text label. */
  label(x, y, text, { size = 19, anchor = 'start', color = '#4A5A6B', bold = false, italic = false } = {}) {
    this.add(`<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" ` +
             `${bold ? 'font-weight="700" ' : ''}${italic ? 'font-style="italic" ' : ''}fill="${color}">${esc(text)}</text>`);
  }

  /** Orthogonal polyline with an explicit polygon arrowhead (PowerPoint drops <marker>). */
  arrow(points, { color = '#4A5A6B', width = 3, dash = null, head = true } = {}) {
    const pts = points.slice();
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    let end = pts[pts.length - 1], prev = pts[pts.length - 2];
    let ex = end[0], ey = end[1];
    const L = 15, W = 8;
    let dx = end[0] - prev[0], dy = end[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    if (head) { ex = end[0] - dx * L; ey = end[1] - dy * L; }
    for (let i = 1; i < pts.length - 1; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
    d += ` L ${ex} ${ey}`;
    this.add(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"` +
             `${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
    if (head) {
      const px = -dy, py = dx;
      this.add(`<polygon points="${end[0]},${end[1]} ${ex + px * W},${ey + py * W} ${ex - px * W},${ey - py * W}" fill="${color}"/>`);
    }
  }

  svg({ title = '', desc = '' } = {}) {
    const body = this.parts.join('\n  ');
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <desc>${esc(desc)}</desc>
  <rect width="${this.w}" height="${this.h}" fill="#FFFFFF"/>
  ${body}
</svg>
`;
  }
}
