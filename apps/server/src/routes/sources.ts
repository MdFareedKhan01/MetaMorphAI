import { Router, type Request } from 'express';
import multer from 'multer';
import { createHash } from 'node:crypto';
import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import { Classification, splitSpans } from '@ps154/shared';
import { prisma, json } from '../db';
import { engine } from '../engine';
import { appendAudit } from '../audit';
import { requireRole } from '../auth';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const sourcesRouter = Router();

// A paste arrives as JSON, a file as multipart with a "file" field. Multer ignores JSON.
sourcesRouter.post('/', requireRole('operator'), upload.single('file'), async (req, res) => {
  const classification = Classification.parse(req.body.classification);
  const input = await readInput(req);
  if (input.text.trim().length < 50) {
    res.status(400).json({ error: 'The source is too short to transform.' });
    return;
  }
  if (input.text.length > 50_000) {
    res.status(413).json({ error: 'Sources are limited to 50,000 characters.' });
    return;
  }

  const spans = splitSpans(input.text, input.pages);
  const source_hash = createHash('sha256').update(input.text).digest('hex');
  const source = await prisma.source.create({
    data: {
      filename: input.filename,
      mime_type: input.mime,
      raw_content: input.text,
      classification,
      spans: json(spans),
      source_hash,
      created_by: req.user!.id,
      purge_after: new Date(Date.now() + 30 * 24 * 3600 * 1000), // SRS §5.8
    },
  });
  await appendAudit(req.user!.id, source.id, 'source.ingested', {
    classification,
    source_hash,
    spans: spans.length,
  });

  try {
    const { canonical, meta } = await engine.extractCanonical({
      id: source.id,
      classification,
      spans,
      raw_content: input.text,
      source_hash,
    });
    const saved = await prisma.source.update({
      where: { id: source.id },
      data: { canonical: json(canonical) },
    });
    await appendAudit(req.user!.id, source.id, 'source.extracted', meta);
    res.status(201).json(saved);
  } catch (e: any) {
    res.status(502).json({ error: `Fact extraction failed: ${e.message}`, source_id: source.id });
  }
});

sourcesRouter.get('/:id', async (req, res) => {
  const source = await prisma.source.findUnique({ where: { id: req.params.id } });
  if (!source) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }
  res.json(source);
});

async function readInput(req: Request) {
  const f = req.file;
  if (!f) {
    return {
      text: String(req.body.text ?? '').replace(/\r\n?/g, '\n'),
      mime: 'text/plain',
      filename: null,
      pages: undefined,
    };
  }
  const name = f.originalname.toLowerCase();
  if (f.mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    const pdf = await getDocumentProxy(new Uint8Array(f.buffer));
    const { text } = await extractText(pdf, { mergePages: false }); // one string per page
    const pages = (text as string[]).map((p) => p.trim());
    return { text: pages.join('\n\n'), pages, mime: 'application/pdf', filename: f.originalname };
  }
  if (f.mimetype === DOCX || name.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer: f.buffer });
    return { text: value, mime: DOCX, filename: f.originalname, pages: undefined };
  }
  if (f.mimetype.startsWith('text/') || name.endsWith('.md') || name.endsWith('.txt')) {
    return {
      text: f.buffer.toString('utf8').replace(/\r\n?/g, '\n'),
      mime: 'text/plain',
      filename: f.originalname,
      pages: undefined,
    };
  }
  throw Object.assign(new Error('Unsupported file type. Use PDF, DOCX, TXT or MD.'), { status: 415 });
}
