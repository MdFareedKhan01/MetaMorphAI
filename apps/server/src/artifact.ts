import type { Artifact } from '@ps154/shared';

export function toArtifact(a: any): Artifact {
  return {
    task_id: a.task_id,
    batch_id: a.batch_id,
    format_id: a.format_id,
    effective_config: a.effective_config,
    content: a.content ?? null,
    claims: (a.claims ?? []).map((c: any) => ({
      id: c.claim_key,
      text: c.text,
      source_refs: c.source_refs,
      status: c.status,
      grounded: c.grounded,
    })),
    grounding_score: a.grounding_score,
    verification: a.verification ?? null,
    meta: a.meta ?? null,
    status: a.status,
    review_state: a.review_state,
    review_comment: a.review_comment,
    // The stored log holds a stack trace; the client only ever sees its first line.
    error_log: a.error_log ? String(a.error_log).split('\n')[0] : null,
    version: a.version,
  };
}
