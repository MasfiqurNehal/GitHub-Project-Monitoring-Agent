import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId?: string;
  };
  organizationId?: string;
}

export function tenantAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = String(req.query.token);
  }

  if (token) {
    const payload = authService.verifyAccessToken(token);
    if (payload) {
      req.user = payload;
      req.organizationId = payload.organizationId;
    }
  }

  next();
}
