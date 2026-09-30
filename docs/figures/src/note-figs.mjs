import { Diagram } from './lib.mjs';

const G = '#5A6B7B', T = '#0E7490', O = '#C2410C', P = '#6D28D9', OK = '#15803D', WARN = '#B45309';
// Sized for an A4 page: 1000 px wide prints at ~680 px, so 16 px body text lands near 8 pt.
const opts = { titleSize: 18, bodySize: 16, lineGap: 1.3, pad: 12 };

export function noteSystem() {
  const d = new Diagram(1000, 300, opts);
  const y = 14, h = 150, w = 175;
  d.node('web', 20, y, w, h, 'BROWSER', ['React 19 · Vite 8', 'card per artefact', 'claim → source'], 'step');
  d.node('api', 220, y, w, h, 'API', ['Express 5 · Zod 4', 'JWT · 3 roles', 'ingest + extract'], 'core');
  d.node('q', 420, y, w, h, 'QUEUE', ['Redis 7 · BullMQ', '1 job per format', '3 in flight'], 'step');
  d.node('wk', 620, y, w, h, 'WORKER', ['runs the engine:', 'router = gate,', 'verify, repair'], 'gate');
  d.node('m', 820, y, 160, h, 'MODELS', ['Gemini Flash-Lite', 'Ollama · Qwen 2.5', 'restricted → local'], 'model');
  d.arrow([[195, 89], [220, 89]], { color: G, width: 2.5 });
  d.arrow([[395, 89], [420, 89]], { color: G, width: 2.5 });
  d.arrow([[595, 89], [620, 89]], { color: G, width: 2.5 });
  d.arrow([[795, 89], [820, 89]], { color: P, width: 2.5 });
  d.node('pg', 220, 210, 575, 76, 'POSTGRESQL 16 · Prisma', ['sources · artefacts · claims · hash-chained audit log'], 'step');
  d.arrow([[307, 164], [307, 210]], { color: G, width: 2.5 });
  d.arrow([[707, 164], [707, 210]], { color: G, width: 2.5 });
  d.label(322, 192, 'API and worker both write', { size: 14, italic: true });
  return d;
}

export function noteAi() {
  const d = new Diagram(1000, 440, opts);
  const w = 225, h = 118;
  const X = [20, 265, 510, 755];
  // row 1 : left → right
  d.node('n1', X[0], 14, w, h, '1 INGEST', ['unpdf · mammoth', 'Intl.Segmenter spans', 'SHA-256 · tier stored'], 'step');
  d.node('n2', X[1], 14, w, h, '2 EXTRACT', ['extractCanonical()', 'cited fact index', 'keepKnownRefs()'], 'core');
  d.node('n3', X[2], 14, w, h, '3 PROMPT', ['rules + canonical', '+ JSON Schema', 'config in user msg'], 'step');
  d.node('n4', X[3], 14, w, h, '4 ROUTER · GATE', ['restricted → Ollama', 'rate limit → Ollama', 'internal: mask user'], 'gate');
  d.arrow([[245, 73], [265, 73]], { color: G, width: 2.5 });
  d.arrow([[490, 73], [510, 73]], { color: G, width: 2.5 });
  d.arrow([[735, 73], [755, 73]], { color: G, width: 2.5 });
  // row 2 : right → left
  d.node('n5', X[3], 172, w, h, '5 MODEL CALL', ['Gemini Flash-Lite', 'Ollama qwen2.5:7b', 'temperature 0, JSON'], 'model');
  d.node('n6', X[2], 172, w, h, '6 PARSE', ['Zod safeParse', 'invalid → error', 'no repair'], 'step', { lineColors: { 1: '#B91C1C', 2: '#B91C1C' } });
  d.node('n7', X[1], 172, w, h, '7 VERIFY', ['① refs exist', '② grounding ≥ 0.5', '③ identifiers ④ hedges'], 'core');
  d.node('n8', X[0], 172, w, h, '8 REPAIR × 1', ['only if findings', 'failing claims + spans', 'then re-verify'], 'gate');
  d.arrow([[867, 132], [867, 172]], { color: O, width: 2.5 });
  d.arrow([[755, 231], [735, 231]], { color: P, width: 2.5 });
  d.arrow([[510, 231], [490, 231]], { color: G, width: 2.5 });
  d.arrow([[265, 231], [245, 231]], { color: O, width: 2.5 });
  // outcome row
  d.node('out', 20, 340, 470, 84, 'READY · FLAGGED', ['clean or repaired → READY', 'findings left → FLAGGED for the reviewer'], 'ok');
  d.arrow([[377, 290], [377, 340]], { color: OK, width: 2.5 });
  d.label(388, 320, 'none', { size: 14, color: OK, bold: true });
  d.arrow([[132, 290], [132, 340]], { color: WARN, width: 2.5 });
  d.label(143, 320, 'after repair', { size: 14, color: WARN, bold: true });
  d.label(510, 372, 'Steps 1–2 run once per source, in the API.', { size: 15, color: '#3B4A5A' });
  d.label(510, 394, 'Steps 3–8 run per artefact, in a BullMQ worker.', { size: 15, color: '#3B4A5A' });
  d.label(510, 416, 'Verification is code. No second model.', { size: 15, color: '#0E7490', bold: true });
  return d;
}
