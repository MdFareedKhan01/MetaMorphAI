// Regenerates the figures in docs/figures from code.   npm run docs:figures
// node build.mjs <outDir> [figure ...]   -> writes <name>.svg and <name>.png for each figure
// Needs Chrome for the PNGs; set CHROME=/path/to/chrome if it is not in the default Windows location.
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { aiFlow } from './ai-flow.mjs';
import { systemArch } from './system-arch.mjs';
import { noteSystem, noteAi } from './note-figs.mjs';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FIGURES = {
  'note-system': { png: false, make: noteSystem, title: 'System overview', desc: 'Browser, API, queue, worker with engine, and models, backed by PostgreSQL.' },
  'note-ai': { png: false, make: noteAi, title: 'AI engine overview', desc: 'Eight steps from ingest to a ready or flagged artefact.' },
  'system-architecture': { make: systemArch, title: 'System architecture', desc: 'Browser, API and worker sharing PostgreSQL and Redis, both calling one engine whose router decides between Groq in the cloud and Ollama on the host.' },
  'ai-system-flowchart': { make: aiFlow, title: 'AI engine flowchart', desc: 'Ingest and split, extract the canonical object, build the prompt, route through the egress gate to Groq or Ollama, parse, verify with four deterministic checks, and repair at most once.' },
};

const [outDir = '.', ...only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

for (const [name, { make, title, desc, png: wantPng = true }] of Object.entries(FIGURES)) {
  if (only.length && !only.includes(name)) continue;
  const d = make();
  const svg = d.svg({ title, desc });
  const svgPath = join(outDir, `${name}.svg`);
  writeFileSync(svgPath, svg);
  if (d.warnings.length) console.warn(`[${name}] text may overflow:\n  ` + d.warnings.join('\n  '));

  if (!wantPng) { console.log(`${name}: ${d.w}x${d.h} -> svg`); continue; }
  // Rasterise at 2x through headless Chrome so the PNG is as sharp as the vector.
  const html = join(outDir, `.${name}.html`);
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}svg{display:block}</style>${svg.replace(/^<\?xml[^>]*>\s*/, '')}`);
  const png = resolve(outDir, `${name}.png`);
  try {
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
      `--window-size=${d.w},${d.h}`, `--screenshot=${png}`, pathToFileURL(resolve(html)).href], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { console.error(String(e.stderr ?? e)); }
  try { unlinkSync(html); } catch { /* temp page already gone */ }
  if (!existsSync(png)) { console.error(`${name}: PNG was not written`); process.exitCode = 1; }
  else console.log(`${name}: ${d.w}x${d.h} -> svg + png (2x)`);
}
