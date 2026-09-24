import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

// 1. POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    const result = await authService.login(email, password, String(ipAddress), String(userAgent));

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('INVALID_CREDENTIALS')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. Access denied.',
      });
    }
    next(err);
  }
}

// 2. POST /api/auth/refresh (Exchange Refresh Token for new Access & Refresh Token)
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: rawRefreshToken } = req.body || {};
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    if (!rawRefreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const result = await authService.refreshTokens(String(rawRefreshToken), String(ipAddress), String(userAgent));

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err.message || 'Invalid or expired refresh token',
    });
  }
}

// 3. GET /api/auth/me (Verify token & get full authenticated user profile)
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = String(req.query.token);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token missing',
      });
    }

    const userPayload = authService.verifyAccessToken(token);
    if (!userPayload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token',
      });
    }

    const fullProfile = await authService.getUserProfile(userPayload.id);

    res.json({
      success: true,
      data: {
        user: fullProfile || {
          id: userPayload.id,
          email: userPayload.email,
          name: userPayload.name,
          role: userPayload.role,
          organizationId: userPayload.organizationId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// 4. PUT /api/auth/profile (Update user profile in Neon DB)
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication token missing' });
    }

    const userPayload = authService.verifyAccessToken(token);
    if (!userPayload) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
    }

    const { name, avatarUrl, designation, companyName, phoneNumber, contactEmail } = req.body || {};

    const updated = await authService.updateUserProfile(userPayload.id, {
      name,
      avatarUrl,
      designation,
      companyName,
      phoneNumber,
      contactEmail,
    });

    logger.info('AUTH_CONTROLLER', `Updated profile for user ${userPayload.email} in Neon DB`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updated },
    });
  } catch (err) {
    next(err);
  }
}

// 4. POST /api/auth/logout
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: rawRefreshToken } = req.body || {};
    if (rawRefreshToken) {
      await authService.revokeRefreshToken(String(rawRefreshToken));
    }
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
}

// 5. POST /api/auth/users (Create client login credentials for SaaS multi-tenancy)
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, role, organizationId } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required to create client credential',
      });
    }

    const newUser = await authService.createUser({
      id: '',
      email,
      password,
      name,
      role: role || 'client_user',
      organizationId,
    });

    res.status(201).json({
      success: true,
      message: 'Client credential created successfully',
      data: newUser,
    });
  } catch (err) {
    next(err);
  }
}

// 6. GET /api/auth/logins (Get recent login audit history)
export async function getLoginLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const logs = await authService.getLoginHistory(30);
    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
}
