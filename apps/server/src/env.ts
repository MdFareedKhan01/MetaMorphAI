import 'dotenv/config';
import { z } from 'zod';

export const env = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  PORT: z.coerce.number().default(8080),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
}).parse(process.env);
