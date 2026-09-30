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

function median(values: number[]): number {
  const sorted = [...values].sort(
    (a, b) => a - b
  );

  const mid =
    Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

const args = process.argv.slice(2);

const file =
  args[0] ?? 'samples/demo-incident.md';

const classification =
  args[1] ?? 'public';

const requestedFormat =
  args[2];

const RUNS = 3;

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

const config = {
  audience:
    'senior government officials',
  tone: 'formal' as const,
  detail: 'medium' as const,
  language: 'en' as const,
};

type Measurement = {
  wallTime: number;
  grounding: number;
  passed: boolean;
  revised: boolean;
  fixes: number;
  openIssues: number;
};

const measurements: Record<
  string,
  Measurement[]
> = {};

for (const format of formatsToRun) {
  measurements[format] = [];
}

try {
  // --------------------------------------------------
  // EXTRACTION
  // --------------------------------------------------

  console.log(
    `\n=== BENCHMARK ===`
  );

  console.log(
    `file: ${file}`
  );

  console.log(
    `classification: ${classification}`
  );

  console.log(
    `runs_per_format: ${RUNS}`
  );

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
  // FORMAT BENCHMARK
  // --------------------------------------------------

  for (const format of formatsToRun) {
    console.log(
      `\n=== ${format.toUpperCase()} ===`
    );

    for (
      let run = 1;
      run <= RUNS;
      run++
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

      const wallTime =
        performance.now() -
        start;

      const grounding =
        result.grounding.total_claims > 0
          ? result.grounding.grounded_count /
            result.grounding.total_claims
          : 1;

      const verification =
        result.verification;

      const measurement = {
        wallTime,
        grounding,
        passed:
          verification.passed,
        revised:
          verification.revised,
        fixes:
          verification.fixes.length,
        openIssues:
          verification.open_issues.length,
      };

      measurements[format].push(
        measurement
      );

      console.log(
        `run ${run}: ` +
        `wall=${Math.round(wallTime)}ms ` +
        `grounding=${grounding.toFixed(2)} ` +
        `passed=${verification.passed} ` +
        `revised=${verification.revised} ` +
        `fixes=${verification.fixes.length} ` +
        `open=${verification.open_issues.length}`
      );
    }
  }

  // --------------------------------------------------
  // MEDIANS
  // --------------------------------------------------

  console.log(
    '\n=== BENCHMARK MEDIANS ==='
  );

  for (const format of formatsToRun) {
    const runs =
      measurements[format];

    const medianWall =
      median(
        runs.map(
          r => r.wallTime
        )
      );

    const medianGrounding =
      median(
        runs.map(
          r => r.grounding
        )
      );

    const passedRuns =
      runs.filter(
        r => r.passed
      ).length;

    const revisedRuns =
      runs.filter(
        r => r.revised
      ).length;

    const totalFixes =
      runs.reduce(
        (sum, r) =>
          sum + r.fixes,
        0
      );

    const totalOpenIssues =
      runs.reduce(
        (sum, r) =>
          sum + r.openIssues,
        0
      );

    console.log(
      `\n${format}:`
    );

    console.log(
      `  median_wall_time_ms: ${Math.round(
        medianWall
      )}`
    );

    console.log(
      `  median_grounding: ${medianGrounding.toFixed(
        2
      )}`
    );

    console.log(
      `  passed_runs: ${passedRuns}/${RUNS}`
    );

    console.log(
      `  revised_runs: ${revisedRuns}/${RUNS}`
    );

    console.log(
      `  total_fixes: ${totalFixes}`
    );

    console.log(
      `  total_open_issues: ${totalOpenIssues}`
    );
  }

} finally {
  await redis.quit();
}