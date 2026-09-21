import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRouter } from './routes/api.router.js';

export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Mount API Router
app.use('/api', apiRouter);

// Root Status Page
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'GitHub Project Monitoring Backend Engine',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ServerError]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});
