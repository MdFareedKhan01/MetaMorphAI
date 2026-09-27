import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Redis } from 'ioredis';
import { splitSpans, type FormatId } from '@ps154/shared';
import { createEngine } from '@ps154/ai';

const file = process.argv[2] ?? 'samples/demo-incident.md';
let raw = '';
try {
  raw = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n'); // hash exactly what ingestion hashes
} catch {
  raw = 'Demo security incident: 37 organisations recorded indicators. Three confirmed compromise.';
}

const redis = new Redis(process.env.REDIS_URL!);
const engine = createEngine({ redis });
const source_hash = createHash('sha256').update(raw).digest('hex');
const source = {
  id: 'seed',
  classification: 'public' as const,
  spans: splitSpans(raw),
  raw_content: raw,
  source_hash,
};
const config = {
  audience: 'Senior government officials',
  tone: 'formal',
  detail: 'medium',
  language: 'en',
} as const;

try {
  const { canonical } = await engine.extractCanonical(source);
  for (const formatId of ['advisory', 'executive_summary', 'linkedin_post'] as FormatId[]) {
    const result = await engine.runFormat({
      format: formatId,
      source,
      canonical,
      config,
      classification: 'public',
      spans: source.spans,
    } as any);
    await redis.set(`cache:${source_hash}:${formatId}`, JSON.stringify(result));
    console.log(`cached ${formatId}: grounding ${(result as any).grounding?.grounded_count ?? 1}`);
  }
} catch (err: any) {
  console.warn('Seed pack notice:', err.message);
} finally {
  await redis.quit();
}
