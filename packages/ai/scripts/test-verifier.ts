import 'dotenv/config';

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';

import { createEngine } from '../src/index';
import { verifyClaims } from '../src/verifier';
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

const file =
  process.argv[2] ??
  'samples/demo-incident.md';

const classification =
  (process.argv[3] ?? 'public') as Classification;

const raw = fs.readFileSync(file, 'utf8');

const redis = new Redis(
  process.env.REDIS_URL ??
    'redis://localhost:6379'
);

const engine = createEngine({ redis });

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
  const { canonical } =
    await engine.extractCanonical(source);

  const config = {
    audience: 'senior government officials',
    tone: 'formal' as const,
    detail: 'medium' as const,
    language: 'en' as const,
  };

  /*
   * Generate a clean Advisory first.
   */
  const result = await engine.runFormat({
    canonical,
    spans: source.spans,
    format: 'advisory',
    config,
    classification,
  });

  console.log(
    '\n=== CLEAN VERIFICATION ==='
  );

  console.dir(
    result.verification,
    { depth: 8 }
  );

  /*
   * Recreate ClaimNodes from the generated
   * artifact so we can deliberately tamper
   * with one claim.
   */
  const provenance =
    collectClaims(result.artifact);

  /*
   * Find the claim containing the CVE.
   */
  const target =
  provenance.nodes.find((node) =>
    node.text.includes(
      'CVE-2026-31337'
    )
  );

if (!target) {
  throw new Error(
    'Could not find a claim containing CVE-2026-31337'
  );
}

if (
  !target.text.includes(
    'CVE-2026-31337'
  )
) {
  throw new Error(
    `Claim c3 does not contain the expected CVE. Got: ${target.text}`
  );
}
/*
 * --------------------------------------------------
   * Fault Injection #1: Corrupt the CVE identifier
   * --------------------------------------------------
*/
  console.log(
    '\n=== BEFORE FAULT INJECTION ==='
  );
  console.log({
    id: target.id,
    text: target.text,
  });

  /*
   * Deliberately corrupt the identifier.
   */
  target.text = target.text.replace(
    'CVE-2026-31337',
    'CVE-2026-31338'
  );

  const corruptedClaims =
    nodesToClaims(
      provenance.nodes
    );

  console.log(
    '\n=== AFTER FAULT INJECTION ==='
  );

  console.log({
    id: target.id,
    text: target.text,
  });

/*
   * Run the deterministic verifier against
   * the corrupted claim.
   */
  const verification =
    verifyClaims(
      corruptedClaims,
      source.spans
    );

  console.log(
    '\n=== CORRUPTED VERIFICATION ==='
  );

  console.dir(
    verification,
    { depth: 8 }
  );

  if (
    verification.passed
  ) {
    throw new Error(
      'FAIL: verifier did not detect the corrupted identifier'
    );
  }

  const identifierFinding =
    verification.open_issues.find(
      (issue) =>
        issue.check === 'identifier' &&
        issue.key === target.id
    );

  if (!identifierFinding) {
    throw new Error(
      'FAIL: verifier failed to report an identifier finding'
    );
  }

  console.log(
    '\n✅ Identifier fault injection detected successfully.'
  );

  /*
   * --------------------------------------------------
   * Fault Injection #2: Remove uncertainty
   * --------------------------------------------------
   *
   * The source says:
   *
   *   "consistent with a possible phishing campaign"
   *
   * We deliberately remove the uncertainty and make
   * the claim stronger.
   */

  const hedgeTarget =
  provenance.nodes.find((node) =>
    node.text.includes(
      'possible phishing campaign'
    )
  );

if (!hedgeTarget) {
  throw new Error(
    'Could not find the claim containing "possible phishing campaign"'
  );
}

  console.log(
    '\n=== BEFORE HEDGE FAULT INJECTION ==='
  );

  console.log({
    id: hedgeTarget.id,
    text: hedgeTarget.text,
  });

  hedgeTarget.text =
    hedgeTarget.text
      .replace(
        'consistent with a possible phishing campaign',
        'recorded a phishing campaign'
      );

  const hedgeCorruptedClaims =
    nodesToClaims(
      provenance.nodes
    );

  console.log(
    '\n=== AFTER HEDGE FAULT INJECTION ==='
  );

  console.log({
    id: hedgeTarget.id,
    text: hedgeTarget.text,
  });

  const hedgeVerification =
    verifyClaims(
      hedgeCorruptedClaims,
      source.spans
    );

  console.log(
    '\n=== HEDGE CORRUPTED VERIFICATION ==='
  );

  console.dir(
    hedgeVerification,
    { depth: 8 }
  );

  if (
    hedgeVerification.passed
  ) {
    throw new Error(
      'FAIL: verifier did not detect removed uncertainty'
    );
  }

  const hedgeFinding =
    hedgeVerification.open_issues.find(
      (issue) =>
        issue.check === 'hedge' &&
        issue.key === hedgeTarget.id
    );

  if (!hedgeFinding) {
    throw new Error(
      'FAIL: verifier failed to report a hedge finding'
    );
  }

  console.log(
    '\n✅ Hedge fault injection detected successfully.'
  );

 /*
 * --------------------------------------------------
 * Fault Injection #3: Break grounding
 * --------------------------------------------------
 *
 * Keep the claim text intact, but replace its valid
 * source reference with a different source span.
 */

const groundingTarget =
  provenance.nodes.find((node) =>
    node.text.includes(
      'confirmed credential compromise'
    )
  );

if (!groundingTarget) {
  throw new Error(
    'Could not find a claim for grounding fault injection'
  );
}

console.log(
  '\n=== BEFORE GROUNDING FAULT INJECTION ==='
);

console.log({
  id: groundingTarget.id,
  text: groundingTarget.text,
  source_refs:
    groundingTarget.source_refs,
});

/*
 * Deliberately point the claim at the wrong span.
 */
groundingTarget.source_refs = [
  'span_1',
];

const groundingCorruptedClaims =
  nodesToClaims(
    provenance.nodes
  );

console.log(
  '\n=== AFTER GROUNDING FAULT INJECTION ==='
);

console.log({
  id: groundingTarget.id,
  text: groundingTarget.text,
  source_refs:
    groundingTarget.source_refs,
});

const groundingVerification =
  verifyClaims(
    groundingCorruptedClaims,
    source.spans
  );

console.log(
  '\n=== GROUNDING CORRUPTED VERIFICATION ==='
);

console.dir(
  groundingVerification,
  { depth: 8 }
);

if (
  groundingVerification.passed
) {
  throw new Error(
    'FAIL: verifier did not detect broken grounding'
  );
}

const groundingFinding =
  groundingVerification.open_issues.find(
    (issue) =>
      issue.check === 'grounding' &&
      issue.key === groundingTarget.id
  );

if (!groundingFinding) {
  throw new Error(
    'FAIL: verifier failed to report a grounding finding'
  );
}

console.log(
  '\n✅ Grounding fault injection detected successfully.'
); 

} finally {
  await redis.quit();
}