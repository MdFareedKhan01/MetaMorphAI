import { z } from 'zod';

export const Finding = z.object({
  check: z.enum([
    'schema',
    'identifier',
    'hedge',
    'global_identifier',
    'severity',
    'constraint',
    'grounding',
    'quality',
  ]),
  key: z.string(),
  detail: z.string(),
});

export type Finding = z.infer<typeof Finding>;

export const Verification = z.object({
  passed: z.boolean(),
  revised: z.boolean(),
  fixes: z.array(Finding),
  open_issues: z.array(Finding),
});

export type Verification = z.infer<typeof Verification>;