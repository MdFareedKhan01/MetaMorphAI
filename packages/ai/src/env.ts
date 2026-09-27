import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  GROQ_API_KEY: z.string().default('gsk_placeholder'),
  CLOUD_MODEL: z.string().default('llama-3.3-70b-versatile'),
  CLOUD_RPM: z.coerce.number().positive().default(10),

  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  LOCAL_MODEL: z.string().default('qwen2.5:7b'),
  LOCAL_NUM_CTX: z.coerce.number().positive().default(8192),
  LOCAL_TIMEOUT_MS: z.coerce.number().positive().default(180000),

  REDACT_TERMS: z.string().optional().default(''),
  DEMO_PERTURB: z.coerce.number().default(0),
});

export const env = Env.parse(process.env);

export const redactTerms = env.REDACT_TERMS
  .split(',')
  .map((term) => term.trim())
  .filter(Boolean);