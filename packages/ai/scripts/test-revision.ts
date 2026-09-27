import 'dotenv/config';

import Redis from 'ioredis';

import { createRouter } from '../src/router';
import { verifyClaims } from '../src/verifier';
import { reviseClaims } from '../src/revise';

import type {
  Claim,
  Span,
} from '@ps154/shared';

const redis = new Redis(
  process.env.REDIS_URL ??
    'redis://localhost:6379'
);

const router = createRouter(redis);

const spans: Span[] = [
  {
    span_id: 'span_1',
    text:
      'In the three confirmed cases, attackers used stolen credentials to access edge VPN concentrators running firmware version 9.4.2, which is affected by CVE-2026-31337.',
    start_offset: 0,
    end_offset: 150,
  },
];

const corruptedClaim: Claim = {
  id: 'c1',
  text:
    'Attackers used stolen credentials to access edge VPN concentrators affected by CVE-2026-31338.',
  source_refs: ['span_1'],
  status: 'fact',
  grounded: false,
};

try {
  // --------------------------------------------------
  // 1. Verify deliberately corrupted claim
  // --------------------------------------------------

  console.log(
    '\n=== CORRUPTED CLAIM ==='
  );

  console.dir(
    corruptedClaim,
    { depth: 8 }
  );

  const corruptedVerification =
    verifyClaims(
      [corruptedClaim],
      spans
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

  // --------------------------------------------------
  // 2. Collect findings for the target
  // --------------------------------------------------

  const findings =
    corruptedVerification.open_issues.filter(
      (finding) =>
        finding.key === corruptedClaim.id
    );

  console.log(
    '\n=== REVISION INPUT ==='
  );

  console.dir(
    {
      targets: [
        {
          claim: corruptedClaim,
          findings,
        },
      ],
    },
    { depth: 8 }
  );

  // --------------------------------------------------
  // 3. ONE targeted revision call
  // --------------------------------------------------

  const revision =
    await reviseClaims(
      router,
      {
        targets: [
          {
            claim: corruptedClaim,
            findings,
          },
        ],
        spans,
        classification: 'public',
      }
    );

  console.log(
    '\n=== REVISED CLAIM ==='
  );

  console.dir(
    revision,
    { depth: 8 }
  );

  const revisedClaim =
    revision.claims.find(
      (claim) =>
        claim.id === corruptedClaim.id
    );

  if (!revisedClaim) {
    throw new Error(
      'FAIL: revision did not return target claim'
    );
  }

  // --------------------------------------------------
  // 4. Verify repaired claim
  // --------------------------------------------------

  const revisedVerification =
    verifyClaims(
      [revisedClaim],
      spans
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

  // --------------------------------------------------
  // 5. Final assertions
  // --------------------------------------------------

  if (
    revisedClaim.text.includes(
      'CVE-2026-31338'
    )
  ) {
    throw new Error(
      'FAIL: corrupted CVE-2026-31338 remains'
    );
  }

  if (
    !revisedClaim.text.includes(
      'CVE-2026-31337'
    )
  ) {
    throw new Error(
      'FAIL: original CVE-2026-31337 was not restored'
    );
  }

  console.log(
    '\n✅ Targeted revision successfully repaired the corrupted claim.'
  );

} finally {
  await redis.quit();
}