import 'dotenv/config';

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';

import { createEngine } from '../src/index';
import type {
  Classification,
  Span,
} from '@ps154/shared';

function splitSpans(raw: string): Span[] {
  return raw.split(/\r?\n/).map((text, index) => ({
    span_id: `span_${index + 1}`,
    text,
    start_offset: 0,
    end_offset: text.length,
  }));
}

const args = process.argv.slice(2);

const file =
  args[0] ?? 'samples/demo-incident.md';

const classification =
  args[1] ?? 'public';

const requestedFormat =
  args[2];

if (
  !['public', 'internal', 'restricted'].includes(
    classification
  )
) {
  console.error(
    'Classification must be public, internal, or restricted'
  );
  process.exit(1);
}

const formats = [
  'advisory',
  'executive_summary',
  'linkedin_post',
] as const;

if (
  requestedFormat &&
  !formats.includes(
    requestedFormat as typeof formats[number]
  )
) {
  console.error(
    `Format must be one of: ${formats.join(', ')}`
  );
  process.exit(1);
}

const formatsToRun =
  requestedFormat
    ? [
        requestedFormat as typeof formats[number],
      ]
    : formats;

const raw =
  fs.readFileSync(file, 'utf8');

const redis = new Redis(
  process.env.REDIS_URL ??
    'redis://localhost:6379'
);

const engine =
  createEngine({ redis });

const source = {
  id: 'cli',
  classification:
    classification as Classification,
  spans: splitSpans(raw),
  raw_content: raw,
  source_hash: createHash('sha256')
    .update(raw)
    .digest('hex'),
};

try {
  // --------------------------------------------------
  // EXTRACTION
  // --------------------------------------------------

  const extractionStart =
    performance.now();

  const {
    canonical,
    meta,
  } =
    await engine.extractCanonical(
      source
    );

  const extractionWallTime =
    performance.now() -
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
    `latency_ms: ${meta.latency_ms}`
  );

  console.log(
    `wall_time_ms: ${Math.round(
      extractionWallTime
    )}`
  );

  console.log(
    `fallback_reason: ${
      meta.fallback_reason ?? 'none'
    }`
  );

  console.log(
    `attempts: ${meta.attempts}`
  );

  // --------------------------------------------------
  // FORMATS
  // --------------------------------------------------

  const config = {
    audience:
      'senior government officials',
    tone: 'formal' as const,
    detail: 'medium' as const,
    language: 'en' as const,
  };

  console.log(
    '\n=== FORMAT MEASUREMENTS ==='
  );

  for (
    const format of formatsToRun
  ) {
    const start =
      performance.now();

    const result =
      await engine.runFormat({
        canonical,
        spans: source.spans,
        format,
        config,
        classification:
          source.classification,
      });

      const grounding =
        result.grounding.total_claims > 0
          ? result.grounding.grounded_count /
            result.grounding.total_claims
          : 1;

    const wallTime =
      performance.now() -
      start;

    const groundingClaims =
      result.verification;

    const totalFindings =
      groundingClaims.fixes.length +
      groundingClaims.open_issues.length;

    console.log(
      `\n${format}:`
    );
    console.log(
            `  grounding: ${grounding.toFixed(2)}`
          );
    console.log(
      `  wall_time_ms: ${Math.round(
        wallTime
      )}`
    );

    console.log(
      `  passed: ${groundingClaims.passed}`
    );

    console.log(
      `  revised: ${groundingClaims.revised}`
    );

    console.log(
      `  fixes: ${groundingClaims.fixes.length}`
    );

    console.log(
      `  open_issues: ${groundingClaims.open_issues.length}`
    );

    console.log(
      `  total_findings: ${totalFindings}`
    );
  }

} finally {
  await redis.quit();
}