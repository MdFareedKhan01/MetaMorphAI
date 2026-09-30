import type {
  Claim,
  Finding,
  Span,
} from '@ps154/shared';

import type { Router } from './router';
import { parseModelJson } from './json';

export interface RevisionTarget {
  claim: Claim;
  findings: Finding[];
}

export interface RevisionInput {
  targets: RevisionTarget[];
  spans: Span[];
  classification:
    | 'public'
    | 'internal'
    | 'restricted';
}

export interface RevisionResult {
  claims: Claim[];
  revised: boolean;
}

const REVISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    revisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
          },
          text: {
            type: 'string',
          },
          source_refs: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          status: {
            type: 'string',
            enum: [
              'fact',
              'inference',
              'framing',
            ],
          },
        },
        required: [
          'id',
          'text',
          'source_refs',
          'status',
        ],
      },
    },
  },
  required: ['revisions'],
};

/**
 * Perform ONE revision call for all claims
 * affected by the verifier.
 *
 * The model receives:
 *   - every problematic claim
 *   - findings for every problematic claim
 *   - only the source spans cited by those claims
 *
 * The model returns all revised ClaimNodes
 * in a single response.
 */
export async function reviseClaims(
  router: Router,
  input: RevisionInput
): Promise<RevisionResult> {
  const targetSpanIds =
    new Set<string>();

  for (const target of input.targets) {
    for (const ref of target.claim.source_refs) {
      targetSpanIds.add(ref);
    }
  }

  const relevantSpans =
    input.spans.filter((span) =>
      targetSpanIds.has(span.span_id)
    );

  const system = `
You are performing ONE targeted correction pass
over generated claims.

Your task is to correct ALL supplied problematic claims
according to their verifier findings while remaining
strictly grounded in the supplied source spans.

This is ONE revision call. Correct every supplied target
claim that can be corrected from the provided evidence.

RULES:

1. Use ONLY the supplied source spans.
2. Do not introduce new facts.
3. Do not introduce new identifiers.
4. Preserve uncertainty from the source.
5. Keep each claim's meaning as close to the original as possible.

   EXCEPTION: when a verifier finding reports quality, truncation,
   incompleteness, or malformed wording, the original wording is
   considered unreliable. Reconstruct the claim from the supplied
   source spans instead of preserving the malformed wording.

   Always prioritize:
   1. complete grammar,
   2. source support,
   3. uncertainty preservation,
   4. verifier requirements,
   5. similarity to the original wording.
5a. For a hedge finding, preserve the uncertainty explicitly
    expressed in the cited source span. Do not turn "could",
    "may", "potential", "likely", etc. into an unconditional
    statement.
5b. For a grounding finding, rewrite the claim so that its
    wording is directly supported by the cited source span.
    Prefer wording from the source over paraphrases that add
    unsupported meaning.
5c. Every revised claim must be a complete, grammatical sentence
    or phrase appropriate for its output field. Do not splice
    unrelated facts together in a way that produces an incomplete
    or malformed sentence. If combining multiple source facts,
    preserve the natural sentence structure of the original facts.
5d. For a quality finding indicating truncation or incompleteness:

    The original claim text may be unusable. Do NOT preserve its
    truncated structure.

    Reconstruct the ENTIRE claim from the supplied source spans.

    Required procedure:
    1. Read all supplied source spans completely.
    2. Ignore the incomplete ending of the original claim.
    3. Identify the complete proposition expressed by the source.
    4. Rewrite the claim from scratch as one complete sentence or phrase.
    5. Preserve every uncertainty or attribution marker required by
       the source, including "could", "may", "might", "potentially",
       "reported", "suspected", etc.
    6. Use all source_refs necessary to support the complete proposition.
    7. The final claim MUST NOT end with a dangling word or fragment.
    8. The final claim must be grammatically complete.
    9. Do not shorten the reconstructed proposition merely to resemble
       the original truncated text.

    Example:
    If the original claim ends with:
      "... consume excessive system"

    and the supplied source says:
      "... consume excessive system resources or potentially execute
       arbitrary code on the targeted system."

    the corrected claim must reconstruct the complete proposition,
    rather than extending the truncated text mechanically.
6. Do not broaden any claim.
7. Use only source_refs that actually exist in the
   supplied source spans.
8. Return exactly one JSON object.
9. Do not return markdown or explanation.
10. Return one revision for every supplied target claim.
11. Preserve each claim's original id exactly.
12. Do not modify claims that are not supplied as targets.

TARGET CLAIMS AND FINDINGS:
${JSON.stringify(
  input.targets.map((target) => ({
    claim: target.claim,
    findings: target.findings.map((finding) => ({
      check: finding.check,
      key: finding.key,
      detail: finding.detail,
    })),
  }))
)}

RELEVANT SOURCE SPANS:
${JSON.stringify(relevantSpans)}

JSON SCHEMA:
${JSON.stringify(REVISION_SCHEMA)}
`;

  const response =
    await router.call({
      system,
      user:
        'Correct all supplied claims according to their verifier findings.',
      jsonSchema: REVISION_SCHEMA,
      classification:
        input.classification,
    });

  const parsed =
    parseModelJson(response.text);

  if (
    !parsed ||
    typeof parsed !== 'object'
  ) {
    throw new Error(
      'Targeted revision returned invalid JSON'
    );
  }

  const value =
    parsed as Record<string, unknown>;

  if (
    !Array.isArray(value.revisions)
  ) {
    throw new Error(
      'Targeted revision returned invalid revisions'
    );
  }

  const targetIds =
    new Set(
      input.targets.map(
        (target) =>
          target.claim.id
      )
    );

  const revisedClaims: Claim[] = [];

  for (const item of value.revisions) {
    if (
      !item ||
      typeof item !== 'object'
    ) {
      throw new Error(
        'Targeted revision returned an invalid revision item'
      );
    }

    const revision =
      item as Record<string, unknown>;

    if (
      typeof revision.id !== 'string' ||
      typeof revision.text !== 'string' ||
      !Array.isArray(
        revision.source_refs
      ) ||
      typeof revision.status !== 'string'
    ) {
      throw new Error(
        'Targeted revision returned an invalid ClaimNode'
      );
    }

    if (
      !targetIds.has(
        revision.id
      )
    ) {
      throw new Error(
        `Targeted revision returned unknown claim id "${revision.id}"`
      );
    }

    if (
      ![
        'fact',
        'inference',
        'framing',
      ].includes(
        revision.status
      )
    ) {
      throw new Error(
        `Targeted revision returned invalid status for "${revision.id}"`
      );
    }

    revisedClaims.push({
      id: revision.id,
      text: revision.text,
      source_refs:
        revision.source_refs as string[],
      status:
        revision.status as Claim['status'],
      grounded: false,
    });
  }

  const returnedIds =
    new Set(
      revisedClaims.map(
        (claim) =>
          claim.id
      )
    );

  for (const target of input.targets) {
    if (
      !returnedIds.has(
        target.claim.id
      )
    ) {
      throw new Error(
        `Targeted revision did not return claim "${target.claim.id}"`
      );
    }
  }

  return {
    claims: revisedClaims,
    revised: true,
  };
}