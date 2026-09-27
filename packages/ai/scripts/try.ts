import 'dotenv/config';

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';

import { createEngine } from '../src/index';

import type {
  Classification,
  Span,
} from '@ps154/shared';

function splitSpans(
  raw: string
): Span[] {
  return raw
    .split(/\r?\n/)
    .map((text, index) => ({
      span_id: `span_${index + 1}`,
      text,
      start_offset: 0,
      end_offset: text.length,
    }));
}

const args =
  process.argv.slice(2);

const [
  file,
  classification = 'public',
] = args;

if (!file) {
  console.error(
    'Usage: npm run try -- <file> <classification>'
  );

  process.exit(1);
}

if (
  ![
    'public',
    'internal',
    'restricted',
  ].includes(classification)
) {
  console.error(
    'Classification must be public, internal, or restricted'
  );

  process.exit(1);
}

const raw =
  fs.readFileSync(
    file,
    'utf8'
  );

const redis =
  new Redis(
    process.env.REDIS_URL ??
      'redis://localhost:6379'
  );

const engine =
  createEngine({ redis });

const source = {
  id: 'cli',

  classification:
    classification as Classification,

  spans:
    splitSpans(raw),

  raw_content: raw,

  source_hash:
    createHash('sha256')
      .update(raw)
      .digest('hex'),
};

try {
  /*
   * --------------------------------------------------
   * EXTRACTION
   * --------------------------------------------------
   */

  const extractionStart =
    Date.now();

  const {
    canonical,
    meta,
  } =
    await engine.extractCanonical(
      source
    );

  const extractionWallTime =
    Date.now() -
    extractionStart;

  console.log(
    '\n=== EXTRACTION MEASUREMENT ==='
  );

  console.log(
    `provider: ${meta.provider}`
  );

  console.log(
    `model: ${meta.model}`
  );

  console.log(
    `latency_ms: ${
      meta.latency_ms
    }`
  );

  console.log(
    `wall_time_ms: ${
      extractionWallTime
    }`
  );

  console.log(
    `fallback_reason: ${
      meta.fallback_reason ??
      'none'
    }`
  );

  console.log(
    `attempts: ${
      meta.attempts
    }`
  );

  /*
   * --------------------------------------------------
   * CONFIG
   * --------------------------------------------------
   */

  const config = {
    audience:
      'senior government officials',

    tone: 'formal' as const,

    detail: 'medium' as const,

    language: 'en' as const,
  };

  const formats = [
    'advisory',
    'executive_summary',
    'linkedin_post',
  ] as const;

  /*
   * --------------------------------------------------
   * FORMAT MEASUREMENTS
   * --------------------------------------------------
   */

  console.log(
    '\n=== FORMAT MEASUREMENTS ==='
  );

  for (const format of formats) {
    const result =
      await engine.runFormat({
        canonical,

        spans:
          source.spans,

        format,

        config,

        classification:
          source.classification,
      });

    const grounded =
      result.grounding
        .grounded_count;

    const total =
      result.grounding
        .total_claims;

    const groundingScore =
      total === 0
        ? 1
        : grounded / total;

    console.log(
      [
        format.toUpperCase(),

        `provider=${result.meta.provider}`,

        `model=${result.meta.model}`,

        `latency_ms=${result.meta.latency_ms}`,

        `grounding=${groundingScore.toFixed(2)}`,

        `grounded=${grounded}/${total}`,

        `revised=${result.verification.revised}`,

        `open_issues=${result.verification.open_issues.length}`,
      ].join(' | ')
    );
  }

  /*
   * --------------------------------------------------
   * COMPACT SUMMARY
   * --------------------------------------------------
   */

  console.log(
    '\n=== MEASUREMENT SUMMARY ==='
  );

  console.log(
    `EXTRACTION | ${meta.provider} | ${meta.model} | ${meta.latency_ms} ms`
  );

  /*
   * Run formats a second time? NO.
   *
   * We deliberately do not do that here because
   * every execution is supposed to represent one
   * measurement run.
   *
   * The format measurements above are the actual
   * generation calls for this run.
   */

} finally {
  await redis.quit();
}