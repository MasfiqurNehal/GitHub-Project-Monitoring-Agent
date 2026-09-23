import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5001'),
  DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required in .env' }),
  REDIS_URL: z.string().optional(),
  GITHUB_API_URL: z.string().default('https://api.github.com'),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().default('super-secret-default-key'),
  ENCRYPTION_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  FASTAPI_URL: z.string().default('http://localhost:8000'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.warn('[Config Warning] Missing or unvalidated environment variables:', _env.error.format());
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  githubApiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  githubToken: process.env.GITHUB_TOKEN || '',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  fastapiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
};
