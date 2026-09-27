import type {
  Claim,
  Finding,
  Span,
  Verification,
} from '@ps154/shared';

import {
  identifiers,
  hasHedge,
} from './identifiers';

import {
  terms,
} from './provenance';

const GROUNDING_THRESHOLD = 0.5;

/**
 * Calculate lexical overlap between a claim and a source span.
 *
 * This follows the guide's lexical grounding approach:
 * the source is already present in the prompt, so we do not
 * need embeddings for this verification step.
 */
function overlapScore(
  claimText: string,
  sourceText: string
): number {
  const claimTerms = terms(claimText);
  const sourceTerms = terms(sourceText);

  if (claimTerms.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const term of claimTerms) {
    if (sourceTerms.has(term)) {
      shared++;
    }
  }

  return shared / claimTerms.size;
}

/**
 * Find the strongest supporting source span for a claim.
 */
function bestGroundingScore(
  claim: Claim,
  spans: Span[]
): number {
  const spanMap = new Map(
    spans.map((span) => [
      span.span_id,
      span.text,
    ])
  );

  const citedSpans = claim.source_refs
    .map((ref) => spanMap.get(ref))
    .filter(
      (text): text is string =>
        typeof text === 'string'
    );

  if (citedSpans.length === 0) {
    return 0;
  }

  return Math.max(
    ...citedSpans.map((span) =>
      overlapScore(claim.text, span)
    )
  );
}

/**
 * Verify claim grounding and provenance.
 */
function verifyGrounding(
  claims: Claim[],
  spans: Span[]
): Finding[] {
  const findings: Finding[] = [];

  for (const claim of claims) {
    // Framing does not represent a factual assertion.
    if (claim.status === 'framing') {
      continue;
    }

    const score = bestGroundingScore(
      claim,
      spans
    );

    if (score < GROUNDING_THRESHOLD) {
      findings.push({
        check: 'grounding',
        key: claim.id,
        detail:
          `Claim is not sufficiently grounded in its cited source span(s). ` +
          `Best lexical overlap score: ${score.toFixed(2)}.`,
      });
    }
  }

  return findings;
}

/**
 * Verify that every source reference points to
 * an actual source span.
 */
function verifySourceReferences(
  claims: Claim[],
  spans: Span[]
): Finding[] {
  const findings: Finding[] = [];

  const validSpanIds = new Set(
    spans.map((span) => span.span_id)
  );

  for (const claim of claims) {
    for (const ref of claim.source_refs) {
      if (!validSpanIds.has(ref)) {
        findings.push({
          check: 'constraint',
          key: claim.id,
          detail:
            `Claim references unknown source span "${ref}".`,
        });
      }
    }
  }

  return findings;
}

/**
 * Verify that important identifiers appearing in
 * the generated claim are also supported by the
 * cited source span(s).
 */

function normalizeIdentifier(value: string): string {
  return value
    .toLowerCase()
    .replace(/\[\.\]/g, '.');
}

function verifyIdentifiers(
  claims: Claim[],
  spans: Span[]
): Finding[] {
  const findings: Finding[] = [];

  const spanMap = new Map(
    spans.map((span) => [
      span.span_id,
      span.text,
    ])
  );

  for (const claim of claims) {
    const claimIdentifiers =
      identifiers(claim.text);

    if (claimIdentifiers.length === 0) {
      continue;
    }

    const citedText = claim.source_refs
      .map((ref) => spanMap.get(ref))
      .filter(
        (text): text is string =>
          typeof text === 'string'
      )
      .join(' ');

    const sourceVocabulary =
      new Set(
        identifiers(citedText).map(
          (identifier) =>
            normalizeIdentifier(
              identifier.value
            )
        )
      );

    for (const identifier of claimIdentifiers) {
      const normalized =
        normalizeIdentifier(
          identifier.value
        );

      if (!sourceVocabulary.has(normalized)) {
        findings.push({
          check: 'identifier',
          key: claim.id,
          detail:
            `Identifier "${identifier.value}" ` +
            `is not present in the cited source span(s).`,
        });
      }
    }
  }

  return findings;
}

/**
 * Verify that uncertainty expressed by the source
 * has not been removed from a generated claim.
 *
 * This is intentionally conservative:
 * if the cited source contains hedging language and
 * the generated claim does not, flag it.
 */
function verifyHedges(
  claims: Claim[],
  spans: Span[]
): Finding[] {
  const findings: Finding[] = [];

  const spanMap = new Map(
    spans.map((span) => [
      span.span_id,
      span.text,
    ])
  );

  for (const claim of claims) {
    if (claim.status === 'framing') {
      continue;
    }

    const citedText = claim.source_refs
      .map((ref) => spanMap.get(ref))
      .filter(
        (text): text is string =>
          typeof text === 'string'
      )
      .join(' ');

    if (
      hasHedge(citedText) &&
      !hasHedge(claim.text)
    ) {
      findings.push({
        check: 'hedge',
        key: claim.id,
        detail:
          'The cited source contains uncertainty or ' +
          'confidence language that is not preserved ' +
          'in the generated claim.',
      });
    }
  }

  return findings;
}

/**
 * Run all currently implemented verifier checks.
 *
 * The verifier is intentionally deterministic.
 * It does not call an LLM.
 */
export function verifyClaims(
  claims: Claim[],
  spans: Span[]
): Verification {
  const findings: Finding[] = [
    ...verifySourceReferences(
      claims,
      spans
    ),
    ...verifyGrounding(
      claims,
      spans
    ),
    ...verifyIdentifiers(
      claims,
      spans
    ),
    ...verifyHedges(
      claims,
      spans
    ),
  ];

  return {
    passed: findings.length === 0,
    revised: false,
    fixes: [],
    open_issues: findings,
  };
}