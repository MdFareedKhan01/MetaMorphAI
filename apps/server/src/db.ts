import { PrismaClient, Prisma } from '@prisma/client';
import { Redis } from 'ioredis';
import { env } from './env';

export const prisma = new PrismaClient();
// BullMQ requires maxRetriesPerRequest: null on every connection its workers use.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const json = (v: unknown) => v as Prisma.InputJsonValue;
