import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/api.router.js';
import { logger } from './utils/logger.js';

export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
// Resilient CORS Configuration supporting sanitized URLs, comma-separated lists, and Vercel domains
const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://gitmonitor.masfiqurnehal.com',
  'https://git-hub-project-monitoring-agent.vercel.app',
  'https://github-project-monitoring-agent.vercel.app',
  'https://github-project-monitoring-agent.onrender.com',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server, Render health checks)
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.trim().replace(/\/+$/, '');

    // Allow explicitly listed origins or any Vercel/masfiqurnehal deployment or localhost
    const isAllowed =
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.masfiqurnehal.com') ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1');

    if (isAllowed) {
      return callback(null, true);
    }

    logger.warn('CORS', `Blocked request from unauthorized origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-GitHub-Event',
    'X-GitHub-Delivery',
    'X-Hub-Signature-256',
  ],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions) as any);
app.use(express.json({
  limit: '50mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Descriptive HTTP Request Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
    const statusLabel = isSuccess ? `${res.statusCode} OK` : `${res.statusCode} ERROR`;
    
    logger.http(`${req.method} ${req.originalUrl} -> ${statusLabel} (${duration}ms) [Client IP: ${req.ip}]`);
  });
  next();
});

import { tenantAuthMiddleware } from './middleware/auth.middleware.js';

// Mount Tenant Auth & Data Isolation Middleware
app.use(tenantAuthMiddleware as any);

// Mount API Router under both /api and root for resilient client routing
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'GitHub Project Monitoring Agent Backend',
    version: '1.0.0',
    status: 'online',
    documentation: '/api/health',
  });
});

// Central Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('EXPRESS_SERVER', `Unhandled Error handling request ${req.method} ${req.url}: ${err.message}`, err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal Server Error',
    },
  });
});
