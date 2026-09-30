import { Diagram, COLORS } from './lib.mjs';

/** System architecture as implemented (verified against the source, 29 Sep 2026). */
export function systemArch() {
  const d = new Diagram(2100, 990);
  const G = '#5A6B7B', T = '#0E7490', P = '#6D28D9', O = '#C2410C';

  d.band(30, 20, 2040, 150, 'CLIENT');
  d.band(30, 200, 2040, 315, 'SERVER + DATA');
  d.band(30, 545, 2040, 170, 'ENGINE');
  d.band(30, 745, 2040, 170, 'MODELS');

  // client
  d.node('web', 100, 40, 1950, 110, 'BROWSER · React 19 · Vite 8 · Tailwind 4', [
    'Login · Signup · Ingest · Confirm · Workspace · Gallery — one independent card per artefact, every claim clickable to its source passage',
    'JWT in localStorage · the WebSocket resumes from the last seq after a drop',
  ], 'step');

  // server + data : API | DATA | WORKER
  d.node('api', 100, 225, 640, 265, 'API · Express 5 · Zod 4', [
    'auth: JWT 12 h · bcrypt · three roles',
    'POST /sources: unpdf · mammoth · spans',
    'extractCanonical() runs inside the request',
    'POST /jobs/batch → 202, then enqueue',
    'review · export · audit · WebSocket stream',
  ], 'core');
  d.node('pg', 860, 225, 380, 125, 'POSTGRESQL 16 · Prisma 6', [
    'users · sources · batches',
    'artefacts · claims · audit_log',
  ], 'step');
  d.node('redis', 860, 365, 380, 125, 'REDIS 7 · ioredis 6', [
    'BullMQ queue · rate counter',
    'task locks · event Streams',
  ], 'step');
  d.node('worker', 1360, 225, 690, 265, 'WORKER · BullMQ 6 · 3 concurrent', [
    'lock:task:{id} · one job per artefact',
    'engine.runFormat() → save content + claims',
    'XADD progress frames · audit rows',
    'offline stub if no key, or on any failure',
  ], 'core', { lineColors: { 3: '#B45309' } });

  // engine
  d.node('engine', 100, 570, 1950, 125, 'ENGINE · packages/ai — imported by the API and by the worker', [
    'router.call() is the only way a prompt leaves: restricted → Ollama · rate limit → Ollama · internal → masked user message',
    'extractCanonical · runFormat · verifyClaims · reviseClaims — GeminiAdapter and OllamaAdapter behind one LLMAdapter interface',
  ], 'gate');

  // models
  d.node('gemini', 100, 770, 940, 120, 'GEMINI · cloud', [
    'GEMINI_MODEL — public and internal sources',
    '429 or three transport failures → Ollama',
  ], 'model');
  d.node('ollama', 1110, 770, 940, 120, 'OLLAMA · on the host', [
    'qwen2.5:7b — restricted sources, and fallback',
    'runs outside Docker so model weights survive a rebuild',
  ], 'model');

  // arrows
  d.arrow([[420, 150], [420, 225]], { color: G });
  d.arrow([[420, 225], [420, 150]], { color: G });
  d.label(438, 190, 'REST + WebSocket frames', { size: 19, italic: true });

  d.arrow([[740, 287], [860, 287]], { color: G });
  d.arrow([[860, 287], [740, 287]], { color: G });
  d.arrow([[740, 427], [860, 427]], { color: G });
  d.arrow([[860, 427], [740, 427]], { color: G });
  d.arrow([[1360, 287], [1240, 287]], { color: G });
  d.arrow([[1240, 287], [1360, 287]], { color: G });
  d.arrow([[1360, 427], [1240, 427]], { color: G });
  d.arrow([[1240, 427], [1360, 427]], { color: G });

  d.arrow([[420, 490], [420, 570]], { color: O });
  d.label(438, 535, 'extractCanonical()', { size: 19, italic: true });
  d.arrow([[1700, 490], [1700, 570]], { color: O });
  d.label(1718, 535, 'runFormat()', { size: 19, italic: true });

  d.arrow([[570, 695], [570, 770]], { color: P });
  d.label(588, 738, 'public · internal', { size: 19, italic: true });
  d.arrow([[1580, 695], [1580, 770]], { color: P });
  d.label(1598, 738, 'restricted · fallback', { size: 19, italic: true });

  // legend
  const legend = [['core', 'application process'], ['gate', 'egress gate lives here'], ['model', 'model provider'], ['step', 'client / data store']];
  let lx = 100;
  legend.forEach(([k, t]) => {
    d.add(`<rect x="${lx}" y="938" width="22" height="22" rx="5" fill="${COLORS[k].fill}" stroke="${COLORS[k].stroke}" stroke-width="3"/>`);
    d.label(lx + 32, 956, t, { size: 19 });
    lx += 40 + t.length * 10.5 + 44;
  });
  d.label(2050, 956, 'development topology: API, worker and web on the host · PostgreSQL and Redis in Docker Compose', { anchor: 'end', size: 19 });
  return d;
}
