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

export function requireTenantAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.organizationId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Missing or invalid organization session/JWT token.',
      },
    });
  }
  next();
}

