// Regenerates docs/architecture-note.pdf and checks it is at most two pages.   npm run docs:figures
// node build-note.mjs <figDir> <outDir>  ->  architecture-note.html + architecture-note.pdf  (and prints the page count)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [figDir = 'out', outDir = 'out'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const inline = (file) => readFileSync(join(figDir, file), 'utf8')
  .replace(/^<\?xml[^>]*>\s*/, '')
  .replace(/ width="\d+" height="\d+"/, '');             // let CSS size it; the viewBox keeps the ratio
const html = readFileSync(join(here, 'note.template.html'), 'utf8')
  .replace('{{FIG1}}', inline('note-system.svg'))
  .replace('{{FIG2}}', inline('note-ai.svg'));

const htmlPath = resolve(outDir, 'architecture-note.html');
const pdfPath = resolve(outDir, 'architecture-note.pdf');
writeFileSync(htmlPath, html);
try {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href], { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (e) { console.error(String(e.stderr ?? e)); }
if (!existsSync(pdfPath)) { console.error('PDF was not written'); process.exit(1); }
const pdf = readFileSync(pdfPath, 'latin1');
const pages = (pdf.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
console.log(`architecture-note.pdf: ${pages} page(s), ${(readFileSync(pdfPath).length / 1024).toFixed(0)} KB`);
if (pages > 2) { console.error('TOO LONG: the problem statement allows at most 2 pages'); process.exitCode = 2; }
