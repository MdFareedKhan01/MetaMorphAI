import { z } from 'zod';

import type {
  Canonical,
  Config,
  FormatId,
  Span,
  Claim,
  Finding,
} from '@ps154/shared';

import type { Router, Routed } from './router';

import {
  ADVISORY_SYSTEM,
  EXECUTIVE_SUMMARY_SYSTEM,
  LINKEDIN_SYSTEM,
} from './prompts';

import {
  getFormatSchema,
  isPhase1Format,
  type Phase1FormatId,
} from './formats';

import { parseModelJson } from './json';

import {
  collectClaims as collectProvenance,
  type Node,
} from './provenance';

import { verifyClaims } from './verifier';

import { reviseClaims } from './revise';

const PROMPTS: Record<
  Phase1FormatId,
  string
> = {
  advisory: ADVISORY_SYSTEM,
  executive_summary: EXECUTIVE_SUMMARY_SYSTEM,
  linkedin_post: LINKEDIN_SYSTEM,
};

export interface RunFormatInput {
  canonical: Canonical;
  spans: Span[];
  format: FormatId;
  config: Config;
  classification:
    | 'public'
    | 'internal'
    | 'restricted';
}

function getFormatCanonical(
  canonical: Canonical,
  format: Phase1FormatId
): Partial<Canonical> {
  switch (format) {
    case 'advisory':
      return {
        severity: canonical.severity,
        key_facts: canonical.key_facts,
        affected_systems:
          canonical.affected_systems,
        indicators:
          canonical.indicators,
        recommendations:
          canonical.recommendations,
      };

    case 'executive_summary':
      return {
        severity: canonical.severity,
        key_facts: canonical.key_facts,
        affected_systems:
          canonical.affected_systems,
        recommendations:
          canonical.recommendations,
      };

    case 'linkedin_post':
      return {
        severity: canonical.severity,
        key_facts: canonical.key_facts,
        affected_systems:
          canonical.affected_systems,
        recommendations:
          canonical.recommendations,
      };
  }
}

function nodesToClaims(
  nodes: Node[]
): Claim[] {
  return nodes.map((node) => ({
    id: node.id,
    text: node.text,
    source_refs: node.source_refs,
    status: node.status,
    grounded: node.grounded ?? false,
  }));
}

/**
 * Apply a revised claim back into the actual
 * artifact content.
 */
function replaceClaimNode(
  content: unknown,
  revised: Claim
): unknown {
  if (Array.isArray(content)) {
    return content.map((item) =>
      replaceClaimNode(
        item,
        revised
      )
    );
  }

  if (
    content &&
    typeof content === 'object'
  ) {
    const object =
      content as Record<string, unknown>;

    if (
      object.id === revised.id &&
      typeof object.text === 'string'
    ) {
      return {
        ...object,
        text: revised.text,
        source_refs:
          revised.source_refs,
        status: revised.status,
        grounded: false,
      };
    }

    return Object.fromEntries(
      Object.entries(object).map(
        ([key, value]) => [
          key,
          replaceClaimNode(
            value,
            revised
          ),
        ]
      )
    );
  }

  return content;
}

export async function runFormat(
  router: Router,
  input: RunFormatInput
) {
  if (!isPhase1Format(input.format)) {
    throw new Error(
      `Format "${input.format}" is not available in Phase 1`
    );
  }

  const schema = getFormatSchema(
    input.format
  );



  const formatCanonical =
  getFormatCanonical(
    input.canonical,
    input.format
  );

const system = PROMPTS[input.format]
  .replace(
    '{{canonical}}',
    JSON.stringify(
      formatCanonical
    )
  )
  .replace(
    '{{schema}}',
    JSON.stringify(
      z.toJSONSchema(schema)
    )
  );

  const user = JSON.stringify({
    audience:
      input.config.audience,
    tone: input.config.tone,
    detail:
      input.config.detail,
    language:
      input.config.language,
  });

  const res: Routed =
    await router.call({
      system,
      user,
      jsonSchema:
        z.toJSONSchema(schema),
      classification:
        input.classification,
    });

  const parsed = schema.safeParse(
    parseModelJson(res.text)
  );

  if (!parsed.success) {
    throw Object.assign(
      new Error(
        `Format "${input.format}" failed validation`
      ),
      {
        code: 'FORMAT_INVALID',
        issues:
          parsed.error.issues,
      }
    );
  }

  /*
   * --------------------------------------------------
   * Sunday Step 6:
   * Provenance / Claim IDs
   * --------------------------------------------------
   */

  const provenance =
    collectProvenance(
      parsed.data
    );

  let artifact =
    provenance.content;

  /*
   * --------------------------------------------------
   * Convert ClaimNodes → server Claims
   * --------------------------------------------------
   */

  let claims =
    nodesToClaims(
      provenance.nodes
    );

  /*
   * --------------------------------------------------
   * Sunday Step 6:
   * First verification
   * --------------------------------------------------
   */

  let verification =
    verifyClaims(
      claims,
      input.spans
    );

  let revised = false;
  let fixedFindings: Finding[] = [];
if (
  process.env.DEMO_PERTURB === '1'
) {
  const target =
    claims.find((claim) =>
      claim.text.includes(
        'CVE-2026-31337'
      )
    );

  if (target) {
    target.text =
      target.text.replace(
        'CVE-2026-31337',
        'CVE-2026-31338'
      );

    verification =
      verifyClaims(
        claims,
        input.spans
      );

    console.log(
      '\n[DEMO] Injected bad CVE:',
      target.text
    );
  }
}

  /*
   * --------------------------------------------------
   * Sunday Step 7:
   * ONE targeted revision
   * --------------------------------------------------
   */

  if (!verification.passed) {
    const initialFindings = verification.open_issues;
    /*
     * Collect ALL claims affected by the
     * first verification.
     *
     * There is still only ONE revision
     * generation call.
     */
    const issueKeys =
      new Set(
        verification.open_issues.map(
          (issue) =>
            issue.key
        )
      );

    const targets =
      claims
        .filter((claim) =>
          issueKeys.has(
            claim.id
          )
        )
        .map((claim) => ({
          claim,
          findings:
            verification.open_issues.filter(
              (issue) =>
                issue.key ===
                claim.id
            ),
        }));

    if (targets.length > 0) {
      /*
       * ONE model call for ALL affected
       * claims.
       */
      const revision =
        await reviseClaims(
          router,
          {
            targets,
            spans:
              input.spans,
            classification:
              input.classification,
          }
        );

      /*
       * Apply every revised ClaimNode
       * returned by the single revision call.
       */
      for (const revisedClaim of revision.claims) {
        artifact =
          replaceClaimNode(
            artifact,
            revisedClaim
          );
      }

      revised = true;

      /*
       * Rebuild provenance after the
       * complete revision pass.
       */
      const revisedProvenance =
        collectProvenance(
          artifact
        );

      artifact =
        revisedProvenance.content;

      /*
       * Recreate server-side Claims.
       */
      claims =
        nodesToClaims(
          revisedProvenance.nodes
        );

      /*
       * ONE final verification.
       *
       * No second revision is allowed.
       */
      verification =
        verifyClaims(
          claims,
          input.spans
        );

      const remainingKeys =
          new Set(
            verification.open_issues.map(
              (issue) =>
                `${issue.check}:${issue.key}`
            )
          );

        fixedFindings =
          initialFindings.filter(
            (finding) =>
              !remainingKeys.has(
                `${finding.check}:${finding.key}`
              )
            );
    }
  }

  /*
   * --------------------------------------------------
   * Apply final grounding verdicts
   * --------------------------------------------------
   */

  const groundingIssues =
    new Set(
      verification.open_issues
        .filter(
          (issue) =>
            issue.check ===
            'grounding'
        )
        .map(
          (issue) =>
            issue.key
        )
    );

  artifact =
    markGrounding(
      artifact,
      claims,
      groundingIssues
    );

  claims =
    claims.map(
      (claim) => ({
        ...claim,
        grounded:
          !groundingIssues.has(
            claim.id
          ),
      })
    );

  /*
   * --------------------------------------------------
   * Final result
   * --------------------------------------------------
   */

  const scores =
    Object.fromEntries(
      claims.map(
        (claim) => [
          claim.id,
          claim.grounded
            ? 1
            : 0,
        ]
      )
    );

  return {
    format:
      input.format,

    artifact,

    claims,

    grounding: {
      scores,

      grounded_count:
        claims.filter(
          (claim) =>
            claim.grounded
        ).length,

      total_claims:
        claims.length,
    },

    verification: {
      ...verification,
      revised,
      fixes: fixedFindings,
    },

    meta: {
      provider:
        res.provider,
      model:
        res.model,
      fallback_reason:
        res.fallback_reason,
      latency_ms:
        res.latency_ms,
    },
  };
}

/**
 * Add the final grounding verdict to
 * ClaimNodes inside the artifact.
 */
function markGrounding(
  content: unknown,
  claims: Claim[],
  groundingIssues: Set<string>
): unknown {
  if (Array.isArray(content)) {
    return content.map(
      (item) =>
        markGrounding(
          item,
          claims,
          groundingIssues
        )
    );
  }

  if (
    content &&
    typeof content === 'object'
  ) {
    const object =
      content as Record<string, unknown>;

    if (
      typeof object.id === 'string' &&
      typeof object.text === 'string'
    ) {
      const claim =
        claims.find(
          (candidate) =>
            candidate.id ===
            object.id
        );

      if (claim) {
        return {
          ...object,
          grounded:
            !groundingIssues.has(
              claim.id
            ),
        };
      }
    }

    return Object.fromEntries(
      Object.entries(object).map(
        ([key, value]) => [
          key,
          markGrounding(
            value,
            claims,
            groundingIssues
          ),
        ]
      )
    );
  }

  return content;
}