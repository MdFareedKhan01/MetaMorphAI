import 'dotenv/config';

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';

import { createEngine } from '../src/index';
import { createRouter } from '../src/router';
import { verifyClaims } from '../src/verifier';
import { reviseClaim } from '../src/revise';
import {
  collectClaims,
} from '../src/provenance';

import type {
  Classification,
  Span,
  Claim,
} from '@ps154/shared';

function splitSpans(raw: string): Span[] {
  return raw.split(/\r?\n/).map((text, index) => ({
    span_id: `span_${index + 1}`,
    text,
    start_offset: 0,
    end_offset: text.length,
  }));
}

function nodesToClaims(
  nodes: ReturnType<typeof collectClaims>['nodes']
): Claim[] {
  return nodes.map((node) => ({
    id: node.id,
    text: node.text,
    source_refs: node.source_refs,
    status: node.status,
    grounded: node.grounded ?? false,
  }));
}

const args = process.argv.slice(2);

const file =
  args[0] ?? 'samples/demo-incident.md';

const classification =
  (args[1] ?? 'public') as Classification;

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

const raw = fs.readFileSync(file, 'utf8');

const redis = new Redis(
  process.env.REDIS_URL ??
    'redis://localhost:6379'
);

const engine = createEngine({
  redis,
});

const router = createRouter(redis);

const source = {
  id: 'cli',
  classification,
  spans: splitSpans(raw),
  raw_content: raw,
  source_hash: createHash('sha256')
    .update(raw)
    .digest('hex'),
};

try {
  /*
   * --------------------------------------------------
   * 1. Extract canonical source
   * --------------------------------------------------
   */

  const { canonical } =
    await engine.extractCanonical(source);

  /*
   * --------------------------------------------------
   * 2. Generate a clean Advisory
   * --------------------------------------------------
   */

  const config = {
    audience:
      'senior government officials',
    tone: 'formal' as const,
    detail: 'medium' as const,
    language: 'en' as const,
  };

  const result =
    await engine.runFormat({
      canonical,
      spans: source.spans,
      format: 'advisory',
      config,
      classification,
    });

  console.log(
    '\n=== ORIGINAL VERIFICATION ==='
  );

  console.dir(
    result.verification,
    { depth: 8 }
  );

  if (!result.verification.passed) {
    throw new Error(
      'Clean Advisory failed verification'
    );
  }

  /*
   * --------------------------------------------------
   * 3. Collect provenance nodes
   * --------------------------------------------------
   *
   * This gives us c1, c2, c3...
   */

  const provenance =
    collectClaims(result.artifact);

  /*
   * --------------------------------------------------
   * 4. Find the CVE claim
   * --------------------------------------------------
   */

  const target =
    provenance.nodes.find((node) =>
      node.text.includes(
        'CVE-2026-31337'
      )
    );

  if (!target) {
    throw new Error(
      'Could not find claim containing CVE-2026-31337'
    );
  }

  console.log(
    '\n=== ORIGINAL CLAIM ==='
  );

  console.log({
    id: target.id,
    text: target.text,
    source_refs:
      target.source_refs,
  });

  /*
   * --------------------------------------------------
   * 5. Inject a deliberate identifier error
   * --------------------------------------------------
   */

  target.text =
    target.text.replace(
      'CVE-2026-31337',
      'CVE-2026-31338'
    );

  console.log(
    '\n=== CORRUPTED CLAIM ==='
  );

  console.log({
    id: target.id,
    text: target.text,
    source_refs:
      target.source_refs,
  });

  /*
   * --------------------------------------------------
   * 6. Convert corrupted node → Claim
   * --------------------------------------------------
   */

  const corruptedClaims =
    nodesToClaims(
      provenance.nodes
    );

  const corruptedClaim =
    corruptedClaims.find(
      (claim) =>
        claim.id === target.id
    );

  if (!corruptedClaim) {
    throw new Error(
      `Could not find corrupted claim ${target.id}`
    );
  }

  /*
   * --------------------------------------------------
   * 7. Verify corrupted claim
   * --------------------------------------------------
   */

  const corruptedVerification =
    verifyClaims(
      [corruptedClaim],
      source.spans
    );

  console.log(
    '\n=== CORRUPTED VERIFICATION ==='
  );

  console.dir(
    corruptedVerification,
    { depth: 8 }
  );

  if (
    corruptedVerification.passed
  ) {
    throw new Error(
      'FAIL: corrupted claim unexpectedly passed verification'
    );
  }

  /*
   * --------------------------------------------------
   * 8. Get only findings for this claim
   * --------------------------------------------------
   */

  const targetFindings =
    corruptedVerification.open_issues.filter(
      (finding) =>
        finding.key === target.id
    );

  console.log(
    '\n=== REVISION INPUT ==='
  );

  console.dir(
    {
      claim: corruptedClaim,
      findings: targetFindings,
    },
    { depth: 8 }
  );

  /*
   * --------------------------------------------------
   * 9. Targeted revision
   * --------------------------------------------------
   *
   * Only the bad claim, its findings, and its
   * relevant source spans are sent to the model.
   */

  const revision =
    await reviseClaim(
      router,
      {
        claim: corruptedClaim,
        findings: targetFindings,
        spans: source.spans,
        classification,
      }
    );

  console.log(
    '\n=== REVISED CLAIM ==='
  );

  console.dir(
    revision,
    { depth: 8 }
  );

  /*
   * --------------------------------------------------
   * 10. Verify the revised claim
   * --------------------------------------------------
   */

  const revisedVerification =
    verifyClaims(
      [revision.claim],
      source.spans
    );

  console.log(
    '\n=== REVISED VERIFICATION ==='
  );

  console.dir(
    revisedVerification,
    { depth: 8 }
  );

  if (
    !revisedVerification.passed
  ) {
    throw new Error(
      'FAIL: targeted revision did not repair the claim'
    );
  }

  /*
   * --------------------------------------------------
   * SUCCESS
   * --------------------------------------------------
   */

  console.log(
    '\n✅ Targeted revision successfully repaired the claim.'
  );
} finally {
  await redis.quit();
}