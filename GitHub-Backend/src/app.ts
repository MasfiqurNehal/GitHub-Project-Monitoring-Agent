import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/api.router.js';
import { logger } from './utils/logger.js';

export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

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

// Mount API Router
app.use('/api', apiRouter);

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
