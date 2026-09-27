// TEMP — remove this file once B/D add SourceRecord and BatchCreated to
// @ps154/shared (they own these: B defines the API/batch shapes, D the
// canonical object). Once added there, delete this file and change the
// import in Ingest.tsx / Confirm.tsx back to '@ps154/shared'.
//
// Shapes here are guesses based on what the guide describes for these
// objects (Step 1's table and Step 4's usage). They may not match exactly
// what B/D ship — that's expected and fine, this only exists to unblock
// local typecheck/build while we build the UI against mocks.

import type { Canonical, Claim, Config, Span, Verification } from '@ps154/shared';

export type SourceRecord = {
  id: string;
  raw_content: string;
  spans: Span[];
  canonical?: Canonical;
};

export type BatchCreated = {
  batch_id: string;
};

export type ArtifactStatus = 'waiting' | 'running' | 'validating' | 'revising' | 'ready' | 'error';

export type Artifact = {
  task_id: string;
  batch_id: string;
  format_id: string;
  effective_config: Config;
  status: ArtifactStatus;
  content?: any;
  claims?: Claim[];
  grounding_score?: number;
  verification?: Verification | null;
  meta?: { provider?: 'cloud' | 'local' | 'cache' };
  error_log?: string;
  version: number;
};

export type BatchSnapshot = {
  batch_id: string;
  source_id: string;
  overall_status: string;
  stream_last_id: string;
  global_config: Config;
  artifacts: Artifact[];
};

export type Frame =
  | { event: 'task.progress'; seq: string; task_id: string; status: ArtifactStatus; detail?: string }
  | { event: 'task.completed'; seq: string; task_id: string; artifact: Artifact }
  | { event: 'task.failed'; seq: string; task_id: string; error_code: string; message: string; retryable: boolean }
  | { event: 'batch.completed'; seq: string; batch_id?: string; overall_status: string; completed?: number; failed?: number };

/**
 * Test helper: splits `pages` of raw text into sentence-level spans with
 * absolute offsets into `raw`, tagging each with its page number. Stands in
 * for whatever splitter D/B ship — only used in tests, not in app code.
 */
export function splitSpans(raw: string, pages: string[]): Span[] {
  const spans: Span[] = [];
  let cursor = 0;
  let n = 0;
  pages.forEach((pageText, pageIdx) => {
    const pageStart = raw.indexOf(pageText, cursor);
    const start = pageStart >= 0 ? pageStart : cursor;
    const re = /[^.\n]+[.\n]?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(pageText))) {
      if (!m[0].trim()) continue;
      const absStart = start + m.index;
      spans.push({ span_id: `span_${++n}`, text: m[0].trim(),
        start_offset: absStart, end_offset: absStart + m[0].length, page: pageIdx + 1 });
    }
    cursor = start + pageText.length;
  });
  return spans;
}
