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
    spans.map(span => [
      span.span_id,
      span.text,
    ])
  );

  const citedSpans = claim.source_refs
    .map(ref => spanMap.get(ref))
    .filter(
      (text): text is string =>
        typeof text === 'string'
    );

  if (citedSpans.length === 0) {
    return 0;
  }

  const combinedSource = citedSpans.join(' ');

  return Math.max(
    ...citedSpans.map(span =>
      overlapScore(claim.text, span)
    ),
    overlapScore(
      claim.text,
      combinedSource
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
function verifyHedges(claims: Claim[], spans: Span[]): Finding[] {
  const findings: Finding[] = [];

  const spanMap = new Map(
    spans.map((span) => [span.span_id, span.text])
  );

  for (const claim of claims) {
    if (claim.status === 'framing') continue;

    const citedSpans = claim.source_refs
      .map((ref) => spanMap.get(ref))
      .filter((text): text is string => typeof text === 'string');

    if (citedSpans.length === 0) continue;

    /*
     * Only flag the claim if the uncertainty is present in the
     * source evidence that actually supports the claim.
     *
     * Previously we joined every cited span together. That meant:
     *
     *   span_19 = direct fact
     *   span_20 = contains "could"
     *   span_21 = direct fact
     *
     * could incorrectly cause the entire claim to receive a hedge
     * finding.
     */

    const claimTerms = terms(claim.text);

    const relevantSpans = citedSpans.filter((span) => {
      const sourceTerms = terms(span);

      if (claimTerms.size === 0 || sourceTerms.size === 0) {
        return false;
      }

      let shared = 0;

      for (const term of claimTerms) {
        if (sourceTerms.has(term)) {
          shared++;
        }
      }

      return shared / claimTerms.size >= GROUNDING_THRESHOLD;
    });

    /*
     * If none of the cited spans are sufficiently relevant,
     * don't manufacture a hedge finding.
     */
    if (relevantSpans.length === 0) continue;

    const sourceContainsHedge = relevantSpans.some((span) =>
      hasHedge(span)
    );

    if (sourceContainsHedge && !hasHedge(claim.text)) {
      findings.push({
        check: 'hedge',
        key: claim.id,
        detail:
          'The cited source contains uncertainty or confidence language that is not preserved in the generated claim.',
      });
    }
  }

  return findings;
}

/**
 * Verify basic grammatical completeness and detect
 * obviously truncated generated claims.
 *
 * This is intentionally deterministic and conservative.
 */
function verifyQuality(claims: Claim[]): Finding[] {
  const findings: Finding[] = [];

  for (const claim of claims) {
    const text = claim.text.trim();

    if (!text) {
      findings.push({
        check: 'quality',
        key: claim.id,
        detail: 'Claim is empty.',
      });
      continue;
    }

    // Obvious truncation: sentence ends with a dangling word.
    if (
      /\b(?:the|a|an|to|of|for|with|and|or|but|that|which|in|on|at|by|from|as|is|are|can|could|may|might|will|would|system|application|excessive)\s*$/i.test(
        text
      )
    ) {
      findings.push({
        check: 'quality',
        key: claim.id,
        detail:
          'Claim is incomplete or truncated. Reconstruct the entire claim from the cited source spans; do not preserve the truncated wording. Return a complete sentence or phrase supported by the source.',
      });
      continue;
    }

    // Obvious punctuation truncation.
    if (
      /[,;:/-]\s*$/.test(text)
    ) {
      findings.push({
        check: 'quality',
        key: claim.id,
        detail:
          'Claim appears to end with incomplete punctuation.',
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
    ...verifyQuality(
    claims
  ),
  ];

  return {
    passed: findings.length === 0,
    revised: false,
    fixes: [],
    open_issues: findings,
  };
}