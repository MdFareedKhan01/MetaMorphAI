import { z } from 'zod';
import { Classification, Config, ConfigOverrides } from './config';
import { FormatId } from './formats';
import { Claim, Span } from './claim';
import { Canonical } from './canonical';
import { Verification } from './verification';

export const LoginRequest = z.object({ name: z.string(), password: z.string() });
export const SignupRequest = z.object({
  name: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(128),
});
export const PasteSource = z.object({ text: z.string(), classification: Classification });

export const SourceRecord = z.object({
  id: z.string(),
  filename: z.string().nullable(),
  mime_type: z.string(),
  raw_content: z.string(),
  classification: Classification,
  spans: z.array(Span),
  canonical: Canonical.nullable(),
  source_hash: z.string(),
  created_at: z.string(),
});
export type SourceRecord = z.infer<typeof SourceRecord>;

export const BatchRequest = z.object({
  source_id: z.string().uuid(),
  global_config: Config,
  formats: z.array(z.object({ format_id: FormatId, overrides: ConfigOverrides.optional() }))
    .min(1).max(6),
}).refine((b) => new Set(b.formats.map((f) => f.format_id)).size === b.formats.length,
          { message: 'duplicate format_id' });
export type BatchRequest = z.infer<typeof BatchRequest>;

export const TaskStatus = z.enum(['waiting', 'running', 'validating', 'revising', 'ready', 'error']);
export const ReviewState = z.enum(['draft', 'submitted', 'approved', 'rejected']);
export const OverallStatus = z.enum(['queued', 'running', 'complete', 'partial', 'failed']);

export const ArtifactMeta = z.object({
  provider: z.enum(['cloud', 'local', 'cache']),
  model: z.string(),
  fallback_reason: z.enum(['policy', 'rate_limit', 'network']).nullable(),
  attempts: z.number(),
  latency_ms: z.number(),
  perturbed: z.boolean(),
});

export const Artifact = z.object({
  task_id: z.string(),
  batch_id: z.string(),
  format_id: FormatId,
  effective_config: Config,
  content: z.unknown().nullable(),
  claims: z.array(Claim),
  grounding_score: z.number().nullable(),
  verification: Verification.nullable(),
  meta: ArtifactMeta.nullable(),
  status: TaskStatus,
  review_state: ReviewState,
  review_comment: z.string().nullable(),
  error_log: z.string().nullable(),
  version: z.number(),
});
export type Artifact = z.infer<typeof Artifact>;

export const BatchCreated = z.object({
  batch_id: z.string(),
  stream_last_id: z.string(),
  tasks: z.array(z.object({ task_id: z.string(), format_id: FormatId, status: TaskStatus })),
});
export type BatchCreated = z.infer<typeof BatchCreated>;

export const BatchSnapshot = z.object({
  batch_id: z.string(),
  source_id: z.string(),
  global_config: Config,
  overall_status: OverallStatus,
  stream_last_id: z.string(),
  artifacts: z.array(Artifact),
});
export type BatchSnapshot = z.infer<typeof BatchSnapshot>;
