const HEDGE_ANY_CASE =
  /\b(?:possibl[ey]|potential(?:ly)?|suspect(?:ed)?|likely|unlikely|reportedly|alleged(?:ly)?|appears to|apparently|consistent with|moderate confidence|low confidence|not (?:been )?confirmed|unconfirmed|approximately|estimated|roughly)\b/i;

const HEDGE_LOWER =
  /\b(?:may|might|could)\b/;

const HEDGE_HI =
  /संभावित|संभवतः|शायद|संदिग्ध|अनुमानित|लगभग|पुष्टि नहीं/;

export const hasHedge = (s: string) =>
  HEDGE_ANY_CASE.test(s) ||
  HEDGE_LOWER.test(s) ||
  HEDGE_HI.test(s);

export interface Identifier {
  kind: string;
  value: string;
}

/**
 * Extract identifiers that should not be invented or altered.
 */
export function identifiers(
  text: string,
  options: { minNumber?: number } = {}
): Identifier[] {
  const result: Identifier[] = [];

  const add = (
    kind: string,
    value: string
  ) => {
    if (
      !result.some(
        (x) =>
          x.kind === kind &&
          x.value === value
      )
    ) {
      result.push({ kind, value });
    }
  };

  // CVE identifiers
  for (const m of text.matchAll(
    /\bCVE-\d{4}-\d{4,}\b/gi
  )) {
    add('cve', m[0]);
  }

  // IPv4 addresses
  for (const m of text.matchAll(
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
  )) {
    add('ip', m[0]);
  }

//email addresses
for (const m of text.matchAll(
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
)) {
  add('email', m[0]);
}
//domain
for (const m of text.matchAll(
  /(?<![@a-zA-Z0-9-])(?:[a-zA-Z0-9-]+(?:\.|\[.\]))+[a-zA-Z]{2,}(?![a-zA-Z0-9-])/g
)) {
  add('domain', m[0]);
}

  // SHA-256 / SHA-1 / MD5 style hashes
  for (const m of text.matchAll(
    /\b[a-fA-F0-9]{32}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{64}\b/g
  )) {
    add('hash', m[0]);
  }

  // Numbers
  const minNumber =
    options.minNumber ?? 0;

  for (const m of text.matchAll(
    /\b\d+(?:\.\d+)?\b/g
  )) {
    const value = m[0];
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= minNumber
    ) {
      add('number', value);
    }
  }

  return result;
}

/**
 * Build a vocabulary of exact identifiers/numbers
 * present in source text.
 */
export function vocabulary(
  text: string
): Set<string> {
  return new Set(
    identifiers(text).map(
      (i) => i.value
    )
  );
}