import dotenv from 'dotenv';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

dotenv.config();

function loadPrivateKey(): string {
  if (process.env.GITHUB_PRIVATE_KEY && process.env.GITHUB_PRIVATE_KEY.trim() !== '') {
    return process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  const keyPath = process.env.GITHUB_PRIVATE_KEY_PATH;
  if (keyPath) {
    const candidatePaths = [
      path.resolve(process.cwd(), keyPath),
      path.resolve(process.cwd(), 'secrets', path.basename(keyPath)),
      path.resolve(process.cwd(), 'src', 'secrets', path.basename(keyPath)),
    ];

    for (const cand of candidatePaths) {
      if (fs.existsSync(cand)) {
        try {
          return fs.readFileSync(cand, 'utf8');
        } catch (err) {
          // continue checking
        }
      }
    }
  }

  return '';
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5001'),
  DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required in .env' }),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_API_URL: z.string().default('https://api.github.com'),
  GITHUB_API_VERSION: z.string().default('2022-11-28'),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_APP_SLUG: z.string().default('gitmonitor-ai'),
  GITHUB_APP_SETUP_PATH: z.string().default('/api/github/app/setup'),
  BACKEND_URL: z.string().default('http://localhost:5001'),
  JWT_SECRET: z.string().default('super-secret-default-key'),
  ENCRYPTION_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  FASTAPI_URL: z.string().default('http://localhost:8000'),
  GEMINI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.warn('[Config Warning] Missing or unvalidated environment variables:', _env.error.format());
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  githubAppId: process.env.GITHUB_APP_ID || '',
  githubAppSlug: process.env.GITHUB_APP_SLUG || 'gitmonitor-ai',
  githubAppSetupPath: process.env.GITHUB_APP_SETUP_PATH || '/api/github/app/setup',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  githubPrivateKey: loadPrivateKey(),
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  githubApiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  githubApiVersion: process.env.GITHUB_API_VERSION || '2022-11-28',
  githubToken: process.env.GITHUB_TOKEN || '',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5001',
  fastapiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  redisUrl: process.env.REDIS_URL || '',
};

