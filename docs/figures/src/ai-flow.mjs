import { Diagram, COLORS } from './lib.mjs';

/** The AI engine as it actually runs in packages/ai (verified against the source, 29 Sep 2026). */
export function aiFlow() {
  const d = new Diagram(2100, 1080);
  const G = '#5A6B7B';   // neutral arrows
  const T = '#0E7490';   // teal arrows
  const O = '#C2410C';   // orange arrows

  // ── bands ────────────────────────────────────────────────────────────────
  d.band(30, 20, 2040, 265, 'ONCE PER SOURCE');
  d.band(30, 325, 2040, 285, 'ROUTE + GENERATE');
  d.band(30, 650, 2040, 360, 'VERIFY + REPAIR ONCE');

  // ── band 1 : left → right ────────────────────────────────────────────────
  d.node('ingest', 100, 40, 590, 225, '1  INGEST · SPLIT', [
    'unpdf (per page) · mammoth · UTF-8, CRLF → LF',
    "Intl.Segmenter('sentence') → span_id, offsets, page",
    'SHA-256 source_hash · classification stored',
    '50 – 50,000 characters, else HTTP 400 / 413',
  ], 'step');
  d.node('extract', 780, 40, 590, 225, '2  EXTRACT · extractCanonical()', [
    'source sits in the user role, one [span_id] per line',
    'z.toJSONSchema(Canonical) in the prompt',
    'safeParse, one retry that quotes the Zod issues',
    'keepKnownRefs() drops any span id the model invents',
  ], 'core');
  d.node('canon', 1460, 40, 590, 225, 'CANONICAL OBJECT · JSONB', [
    'severity · entities · events · affected_systems',
    'indicators · key_facts (fact | inference)',
    'recommendations — each item cites source_refs',
    'stored once; formats read this, not the raw text',
  ], 'core');
  d.arrow([[690, 152], [780, 152]], { color: G });
  d.arrow([[1370, 152], [1460, 152]], { color: T });

  // ── band 1 → band 2 ──────────────────────────────────────────────────────
  d.arrow([[1825, 265], [1825, 345]], { color: T });
  d.label(1808, 311, 'worker loads sources.canonical', { anchor: 'end', size: 18, italic: true });

  // ── band 2 : right → left ────────────────────────────────────────────────
  d.node('prompt', 1600, 345, 450, 245, '3  BUILD PROMPT', [
    'one system prompt per format:',
    'advisory · executive summary · LinkedIn',
    'system = rules + canonical + JSON Schema',
    'user = audience · tone · detail · language',
    'X thread, video package: not built yet',
  ], 'step', { lineColors: { 4: '#B45309' } });
  d.node('router', 1120, 345, 400, 245, '4  ROUTER · EGRESS GATE', [
    'restricted → Ollama  (policy)',
    'INCR ratelimit:provider:cloud, 60 s',
    'over CLOUD_RPM → Ollama  (rate_limit)',
    'internal → Redactor masks the user',
    'message: IP · URL · email · domain',
  ], 'gate');
  d.node('gemini', 580, 345, 460, 105, '5a  GEMINI · cloud', [
    'GEMINI_MODEL · temperature 0',
    'responseSchema · 3 tries, 500·2ⁿ ms',
  ], 'model');
  d.node('ollama', 580, 485, 460, 105, '5b  OLLAMA · on the host', [
    'qwen2.5:7b · num_ctx 8192 · format = schema',
    '180 s timeout · used for restricted + fallback',
  ], 'model');
  d.node('parse', 100, 345, 410, 245, '6  PARSE · VALIDATE', [
    'parseModelJson() → outermost { }',
    'format schema .safeParse()',
    'invalid → FORMAT_INVALID',
    'schema failures get no repair',
  ], 'step', { lineColors: { 2: '#B91C1C', 3: '#B91C1C' } });

  d.arrow([[1600, 467], [1520, 467]], { color: G });
  d.arrow([[1120, 398], [1040, 398]], { color: '#6D28D9' });
  d.label(1080, 386, 'cloud', { anchor: 'middle', size: 17 });
  d.arrow([[1120, 537], [1040, 537]], { color: '#6D28D9' });
  d.label(1080, 525, 'local', { anchor: 'middle', size: 17 });
  d.arrow([[810, 450], [810, 485]], { color: O, dash: '6 4' });
  d.label(826, 473, '429 · 3 failures', { size: 17, color: O });
  d.arrow([[580, 398], [510, 398]], { color: G });
  d.arrow([[580, 537], [510, 537]], { color: G });

  // ── band 2 → band 3 ──────────────────────────────────────────────────────
  d.arrow([[250, 590], [250, 720]], { color: T });
  d.label(270, 636, 'schema-valid artefact', { size: 18, italic: true });

  // ── band 3 : left → right ────────────────────────────────────────────────
  d.node('ids', 100, 720, 300, 210, '7  CLAIM IDS', [
    'collectClaims()',
    'c1 … cn, reading order',
    'fact | inference | framing',
  ], 'step');
  d.node('verify', 480, 700, 430, 280, '8  VERIFY · verifyClaims()', [
    '① every source_ref exists',
    '② lexical grounding ≥ 0.5',
    '③ identifiers ⊆ cited span',
    '④ source hedges preserved',
    'plain code · no model call',
  ], 'core', { lineColors: { 4: '#0E7490' } });
  d.node('find', 990, 765, 210, 140, '9  findings?', [], 'gate', { shape: 'diamond' });
  d.node('repair', 1280, 700, 430, 280, '10  REPAIR · ONE call', [
    'reviseClaims(): failing claims',
    '+ their findings + only their',
    'cited spans, strict JSON schema',
    'replaceClaimNode(), then re-verify',
    'no second repair, ever',
  ], 'gate', { lineColors: { 4: '#B91C1C' } });
  d.node('ready', 1790, 715, 260, 110, 'READY', [
    'passed · fixes[] kept',
  ], 'ok');
  d.node('flag', 1790, 860, 260, 110, 'FLAGGED', [
    'open_issues[] → reviewer',
  ], 'warn');

  d.arrow([[400, 825], [480, 825]], { color: G });
  d.arrow([[910, 835], [990, 835]], { color: T });
  d.arrow([[1200, 835], [1280, 835]], { color: O });
  d.label(1240, 822, 'yes', { anchor: 'middle', size: 18, color: O, bold: true });
  d.arrow([[1095, 765], [1095, 682], [1920, 682], [1920, 715]], { color: '#15803D' });
  d.label(1500, 674, 'no findings', { anchor: 'middle', size: 18, color: '#15803D', bold: true });
  d.arrow([[1710, 770], [1790, 770]], { color: '#15803D' });
  d.label(1750, 760, 'clean', { anchor: 'middle', size: 17, color: '#15803D' });
  d.arrow([[1710, 915], [1790, 915]], { color: '#B45309' });
  d.label(1750, 905, 'fails', { anchor: 'middle', size: 17, color: '#B45309' });

  // ── footer ───────────────────────────────────────────────────────────────
  const legend = [['core', 'deterministic code'], ['gate', 'policy / decision'], ['model', 'model call'], ['ok', 'ready'], ['warn', 'flagged']];
  let lx = 100;
  legend.forEach(([k, t]) => {
    d.add(`<rect x="${lx}" y="1032" width="22" height="22" rx="5" fill="${COLORS[k].fill}" stroke="${COLORS[k].stroke}" stroke-width="3"/>`);
    d.label(lx + 32, 1050, t, { size: 19 });
    lx += 40 + t.length * 10.5 + 44;
  });
  d.label(2050, 1050, 'steps 1–2 run in the API · steps 3–10 in a BullMQ worker · one job per format · 3 in flight', { anchor: 'end', size: 19 });

  return d;
}
