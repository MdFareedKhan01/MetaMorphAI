import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import Redis from 'ioredis';

import { extractCanonical } from '../src/extract';
import { runFormat } from '../src/generate';
import { createRouter } from '../src/router';

import type {
  FormatId,
  Classification,
  Config,
  Span,
} from '@ps154/shared';

const file = process.argv[2];

const classification =
  (process.argv[3] as Classification | undefined) ??
  'public';

if (!file) {
  console.error(
    'Usage: npm run try -- <source-file> <public|internal|restricted>'
  );
  process.exit(1);
}

/*
 * --------------------------------------------------
 * Read source
 * --------------------------------------------------
 */

const rawContent = await fs.readFile(file, 'utf8');

/*
 * --------------------------------------------------
 * Build source spans
 *
 * The extraction pipeline expects spans to already
 * exist on SourceForAI.
 *
 * Keep the same simple span representation used by
 * the demo source.
 * --------------------------------------------------
 */

const lines = rawContent.split(/\r?\n/);

const spans: Span[] = [];

let offset = 0;

for (let i = 0; i < lines.length; i++) {
  const text = lines[i];

  if (text.trim().length > 0) {
    spans.push({
      span_id: `span_${spans.length + 1}`,
      text,
      start_offset: offset,
      end_offset: offset + text.length,
    });
  }

  offset += text.length + 1;
}

/*
 * --------------------------------------------------
 * Source hash
 * --------------------------------------------------
 */

const sourceHash = crypto
  .createHash('sha256')
  .update(rawContent)
  .digest('hex');

/*
 * --------------------------------------------------
 * Redis + Router
 * --------------------------------------------------
 */

const redis = new Redis();

const router = createRouter(redis);

/*
 * --------------------------------------------------
 * Config
 *
 * Same Phase-1 configuration used by the
 * generation pipeline.
 * --------------------------------------------------
 */

const config: Config = {
  audience: 'general',
  tone: 'formal',
  detail: 'medium',
  language: 'en',
};

/*
 * --------------------------------------------------
 * Source object
 * --------------------------------------------------
 */

const source = {
  id: file,
  classification,
  spans,
  raw_content: rawContent,
  source_hash: sourceHash,
};

/*
 * --------------------------------------------------
 * Extraction
 * --------------------------------------------------
 */

console.log('\n=== SOURCE ===');
console.log(`file: ${file}`);
console.log(`classification: ${classification}`);
console.log(`spans: ${spans.length}`);

console.log('\n=== EXTRACTION ===');

const extractionStart = Date.now();

const extraction = await extractCanonical(
  router,
  source
);

const extractionWallTime =
  Date.now() - extractionStart;

console.log(
  `provider: ${extraction.meta.provider}`
);

console.log(
  `model: ${extraction.meta.model}`
);

console.log(
  `latency_ms: ${extraction.meta.latency_ms}`
);

console.log(
  `wall_time_ms: ${extractionWallTime}`
);

console.log(
  `fallback_reason: ${
    extraction.meta.fallback_reason ?? 'none'
  }`
);

console.log(
  `attempts: ${extraction.meta.attempts}`
);

/*
 * --------------------------------------------------
 * Canonical output
 * --------------------------------------------------
 */

console.log('\n=== CANONICAL ===');

console.dir(
  extraction.canonical,
  { depth: null }
);

/*
 * --------------------------------------------------
 * Phase 1 formats
 * --------------------------------------------------
 */

const formats: FormatId[] = [
  'advisory',
  'executive_summary',
  'linkedin_post',
];

/*
 * --------------------------------------------------
 * Generate all three
 * --------------------------------------------------
 */

console.log('\n=== GENERATED OUTPUTS ===');

for (const format of formats) {
  console.log(
    `\n${'='.repeat(70)}`
  );

  console.log(
    `FORMAT: ${format}`
  );

  console.log(
    '='.repeat(70)
  );

  const start = Date.now();

  const result = await runFormat(
    router,
    {
      format,
      canonical:
        extraction.canonical,
      spans,
      config,
      classification,
    }
  );

  const wallTime =
    Date.now() - start;

  /*
   * ----------------------------------------------
   * Artifact
   * ----------------------------------------------
   */

  console.log('\n--- ARTIFACT ---');

  console.dir(
    result.artifact,
    { depth: null }
  );

  /*
   * ----------------------------------------------
   * Claims
   * ----------------------------------------------
   */

  console.log('\n--- CLAIMS ---');

  console.dir(
    result.claims,
    { depth: null }
  );

  /*
   * ----------------------------------------------
   * Grounding
   * ----------------------------------------------
   */

  console.log('\n--- GROUNDING ---');

  const grounding =
    result.grounding.total_claims === 0
      ? 1
      : result.grounding.grounded_count /
        result.grounding.total_claims;

  console.log(
    `grounded: ${result.grounding.grounded_count}/${result.grounding.total_claims}`
  );

  console.log(
    `score: ${grounding.toFixed(2)}`
  );

  /*
   * ----------------------------------------------
   * Verification
   * ----------------------------------------------
   */

  console.log('\n--- VERIFICATION ---');

  console.log(
    `passed: ${result.verification.passed}`
  );

  console.log(
    `revised: ${result.verification.revised}`
  );

  console.log(
    `fixes: ${result.verification.fixes.length}`
  );

  console.log(
    `open_issues: ${result.verification.open_issues.length}`
  );

  if (
    result.verification.fixes.length > 0
  ) {
    console.log('\nFixes:');

    console.dir(
      result.verification.fixes,
      { depth: null }
    );
  }

  if (
    result.verification.open_issues.length > 0
  ) {
    console.log('\nOpen issues:');

    console.dir(
      result.verification.open_issues,
      { depth: null }
    );
  }

  /*
   * ----------------------------------------------
   * Generation metadata
   * ----------------------------------------------
   */

  console.log('\n--- META ---');

  console.log(
    `provider: ${result.meta.provider}`
  );

  console.log(
    `model: ${result.meta.model}`
  );

  console.log(
    `fallback_reason: ${
      result.meta.fallback_reason ?? 'none'
    }`
  );

  console.log(
    `latency_ms: ${result.meta.latency_ms}`
  );

  console.log(
    `wall_time_ms: ${wallTime}`
  );
}

/*
 * --------------------------------------------------
 * Close Redis connection
 * --------------------------------------------------
 */

await redis.quit();