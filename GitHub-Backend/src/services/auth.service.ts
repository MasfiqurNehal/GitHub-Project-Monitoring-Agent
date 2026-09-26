import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool } from '../db/connection.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { cloudinaryService } from './cloudinary.service.js';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: string;
  organizationId?: string;
}

// Token Lifespans as specified:
// Access Token: 3 Days (259200 Seconds)
// Refresh Token: 30 Days (2592000 Seconds)
const ACCESS_TOKEN_EXPIRY = 3 * 24 * 60 * 60;
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60;

export class AuthService {
  private getUsersJsonPath(): string {
    const candidatePaths = [
      path.resolve(process.cwd(), 'config', 'users.json'),
      path.resolve(process.cwd(), 'src', 'config', 'users.json'),
      path.resolve(process.cwd(), '..', 'GitHub-Backend', 'config', 'users.json'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return candidatePaths[0];
  }

  // Load configured users from config/users.json
  public loadUsersFromFile(): UserAccount[] {
    try {
      const filePath = this.getUsersJsonPath();
      if (!fs.existsSync(filePath)) {
        logger.warn('AUTH_SERVICE', `users.json not found at ${filePath}. Returning empty list.`);
        return [];
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (err: any) {
      logger.error('AUTH_SERVICE', `Failed to read config/users.json: ${err.message}`);
      return [];
    }
  }

  // Sync users from config/users.json into Neon PostgreSQL DB
  public async syncUsersToDb(): Promise<void> {
    try {
      const users = this.loadUsersFromFile();
      for (const u of users) {
        if (!u.email) continue;
        const cleanEmail = u.email.toLowerCase().trim();
        const userId = u.id || `usr-${crypto.randomBytes(6).toString('hex')}`;
        const userName = u.name || cleanEmail.split('@')[0];
        const userRole = u.role || 'admin';
        const githubLogin = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');

        // Determine or create tenant organization ID
        let orgId = u.organizationId;
        if (!orgId) {
          if (cleanEmail === 'admin1@masfiqurnehal.com') orgId = 'org-masfiqurnehal';
          else if (cleanEmail === 'admin@betopia.com') orgId = 'org-betopia-1';
          else if (cleanEmail === 'admin2@betopia.com') orgId = 'org-betopia-2';
          else orgId = `org-${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24)}`;
        }

        const orgName = (u as any).organization || `${userName}'s Organization`;
        await pool.query(
          `INSERT INTO saas_organizations (id, name, slug, plan, updated_at)
           VALUES ($1, $2, $3, 'enterprise', NOW())
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
          [orgId, orgName, orgId]
        );

        await pool.query(
          `INSERT INTO users (id, github_login, name, email, role, password_hash, organization_id, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             organization_id = EXCLUDED.organization_id,
             updated_at = NOW()`,
          [userId, githubLogin, userName, cleanEmail, userRole, u.password || 'password', orgId]
        );
      }
      logger.info('AUTH_SERVICE', `Synced ${users.length} tenant users into Neon PostgreSQL DB`);
    } catch (err: any) {
      logger.error('AUTH_SERVICE', `Failed to sync users to Neon DB: ${err.message}`);
    }
  }

  // Generate lightweight JWT access token (3 Days lifespan)
  public generateAccessToken(payload: object): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = { ...payload, type: 'access', iat: now, exp: now + ACCESS_TOKEN_EXPIRY };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // Generate and store Refresh Token (30 Days lifespan in Neon DB)
  public async createRefreshToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const rawToken = `rfr_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const id = `rt-${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000);

    await pool.query(
      `INSERT INTO user_refresh_tokens (id, user_id, token_hash, expires_at, created_by_ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, tokenHash, expiresAt, ipAddress || '127.0.0.1', userAgent || 'Unknown']
    );

    return rawToken;
  }

  // Verify JWT access token
  public verifyAccessToken(token: string): any {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', config.jwtSecret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null;
      }

      return payload;
    } catch (err) {
      return null;
    }
  }

  // Handle User Login
  public async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const cleanEmail = String(email || '').toLowerCase().trim();
    const cleanPassword = String(password || '');

    // 1. Search in config/users.json (live read)
    const fileUsers = this.loadUsersFromFile();
    let matchedUser = fileUsers.find(
      (u) => u.email.toLowerCase().trim() === cleanEmail && u.password === cleanPassword
    );

    // 2. Fallback search in DB users table
    if (!matchedUser) {
      const dbRes = await pool.query(
        `SELECT id, email, name, role, password_hash, organization_id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [cleanEmail]
      );
      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        if (row.password_hash === cleanPassword) {
          matchedUser = {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role,
            organizationId: row.organization_id,
          };
        }
      }
    }

    const isSuccess = Boolean(matchedUser);
    const dbUserId = matchedUser ? matchedUser.id : null;
    const dbName = matchedUser ? matchedUser.name : cleanEmail.split('@')[0];
    const dbRole = matchedUser ? matchedUser.role : 'admin';
    let dbOrgId = matchedUser ? matchedUser.organizationId : null;

    if (dbUserId && !dbOrgId) {
      try {
        const uRes = await pool.query(`SELECT organization_id FROM users WHERE id = $1`, [dbUserId]);
        dbOrgId = uRes.rows[0]?.organization_id || null;
      } catch (e) {}
    }
    if (!dbOrgId) {
      if (cleanEmail === 'admin1@masfiqurnehal.com') dbOrgId = 'org-masfiqurnehal';
      else if (cleanEmail === 'admin@betopia.com') dbOrgId = 'org-betopia-1';
      else if (cleanEmail === 'admin2@betopia.com') dbOrgId = 'org-betopia-2';
      else dbOrgId = `org-${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24)}`;
    }

    try {
      await pool.query(
        `INSERT INTO saas_organizations (id, name, slug, plan, updated_at)
         VALUES ($1, $2, $3, 'enterprise', NOW())
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
        [dbOrgId, `${dbName}'s Organization`, dbOrgId]
      );
    } catch (err: any) {
      logger.warn('AUTH_SERVICE', `Could not create/update saas_organization in DB: ${err.message}`);
    }

    // 3. Log login attempt in Neon DB (user_login_logs)
    const logId = `log-${crypto.randomBytes(8).toString('hex')}`;
    try {
      await pool.query(
        `INSERT INTO user_login_logs (id, user_id, email, status, ip_address, user_agent, login_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [logId, dbUserId, cleanEmail, isSuccess ? 'SUCCESS' : 'FAILED', ipAddress || '127.0.0.1', userAgent || 'Unknown']
      );
    } catch (err: any) {
      logger.error('AUTH_SERVICE', `Failed to record login audit log in Neon DB: ${err.message}`);
    }

    if (!isSuccess || !dbUserId) {
      throw new Error('INVALID_CREDENTIALS: Incorrect email or password');
    }

    // 4. Update last_login_at in Neon DB users table
    try {
      await pool.query(
        `INSERT INTO users (id, github_login, name, email, role, password_hash, organization_id, last_login_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET last_login_at = NOW(), organization_id = EXCLUDED.organization_id, updated_at = NOW()`,
        [dbUserId, cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_'), dbName, cleanEmail, dbRole, cleanPassword, dbOrgId]
      );
    } catch (err: any) {
      logger.warn('AUTH_SERVICE', `Could not update last_login_at in DB: ${err.message}`);
    }

    // 5. Fetch full user profile from Neon DB (with avatarUrl, designation, companyName, phoneNumber, contactEmail)
    const fullProfile = await this.getUserProfile(dbUserId);
    const userToReturn = {
      ...(fullProfile || {
        id: dbUserId,
        email: cleanEmail,
        name: dbName,
        role: dbRole,
      }),
      organizationId: fullProfile?.organizationId || dbOrgId,
    };

    // 6. Generate Access Token (3 Days) & Refresh Token (30 Days)
    const accessToken = this.generateAccessToken({
      id: userToReturn.id,
      email: userToReturn.email,
      name: userToReturn.name,
      role: userToReturn.role,
      organizationId: userToReturn.organizationId,
    });

    const refreshToken = await this.createRefreshToken(dbUserId, ipAddress, userAgent);

    logger.info('AUTH_SERVICE', `User ${cleanEmail} logged in successfully [Org: ${userToReturn.organizationId}, Access Token: 3d, Refresh Token: 30d]`);

    return {
      user: userToReturn,
      accessToken,
      refreshToken,
      expiresInSeconds: ACCESS_TOKEN_EXPIRY,
    };
  }

  // Refresh Session using Refresh Token (30 Days expiration check)
  public async refreshTokens(rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!rawRefreshToken) {
      throw new Error('INVALID_REFRESH_TOKEN: Refresh token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const res = await pool.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked, u.email, u.name, u.role
       FROM user_refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 LIMIT 1`,
      [tokenHash]
    );

    if (res.rows.length === 0) {
      throw new Error('INVALID_REFRESH_TOKEN: Token not found');
    }

    const row = res.rows[0];

    if (row.revoked) {
      throw new Error('REVOKED_REFRESH_TOKEN: Token has been revoked');
    }

    if (new Date(row.expires_at) < new Date()) {
      throw new Error('EXPIRED_REFRESH_TOKEN: Refresh token expired');
    }

    // Revoke old refresh token (Token Rotation for security)
    await pool.query(`UPDATE user_refresh_tokens SET revoked = TRUE WHERE id = $1`, [row.id]);

    // Issue new 3-day Access Token & 30-day Refresh Token with full profile
    const fullProfile = await this.getUserProfile(row.user_id);
    const userToReturn = fullProfile || {
      id: row.user_id,
      email: row.email,
      name: row.name,
      role: row.role,
      organizationId: (row as any).organization_id || null,
    };

    const accessToken = this.generateAccessToken({
      id: userToReturn.id,
      email: userToReturn.email,
      name: userToReturn.name,
      role: userToReturn.role,
      organizationId: userToReturn.organizationId,
    });

    const newRefreshToken = await this.createRefreshToken(row.user_id, ipAddress, userAgent);

    return {
      user: userToReturn,
      accessToken,
      refreshToken: newRefreshToken,
      expiresInSeconds: ACCESS_TOKEN_EXPIRY,
    };
  }

  // Revoke Refresh Token on Logout
  public async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await pool.query(`UPDATE user_refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, [tokenHash]);
  }

  // Fetch Full User Profile from Neon DB
  public async getUserProfile(userId: string) {
    const res = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.designation, u.company_name, u.phone_number, u.contact_email, u.organization_id, o.name as organization_name
       FROM users u
       LEFT JOIN saas_organizations o ON o.id = u.organization_id
       WHERE u.id = $1 LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name || row.email.split('@')[0],
      role: row.role || 'admin',
      avatarUrl: row.avatar_url || null,
      designation: row.designation || 'Engineering Executive',
      companyName: row.company_name || row.organization_name || 'Betopia Global',
      phoneNumber: row.phone_number || '',
      contactEmail: row.contact_email || row.email,
      organizationId: row.organization_id,
      organizationName: row.organization_name || 'Betopia Global',
    };
  }

  // Update User Profile in Neon DB
  public async updateUserProfile(userId: string, data: {
    name?: string;
    avatarUrl?: string;
    designation?: string;
    companyName?: string;
    phoneNumber?: string;
    contactEmail?: string;
  }) {
    const current = await this.getUserProfile(userId);
    if (!current) throw new Error('USER_NOT_FOUND: User does not exist');

    const name = data.name !== undefined ? data.name : current.name;
    let avatarUrl = current.avatarUrl;
    if (data.avatarUrl !== undefined) {
      if (data.avatarUrl && (data.avatarUrl.startsWith('data:image/') || data.avatarUrl.startsWith('data:application/'))) {
        try {
          avatarUrl = await cloudinaryService.uploadImage(data.avatarUrl, 'github_monitoring/profiles');
        } catch (uploadErr: any) {
          logger.error('AUTH_SERVICE', `Cloudinary upload failed, keeping fallback: ${uploadErr.message}`);
          avatarUrl = data.avatarUrl;
        }
      } else {
        avatarUrl = data.avatarUrl;
      }
    }

    const designation = data.designation !== undefined ? data.designation : current.designation;
    const companyName = data.companyName !== undefined ? data.companyName : current.companyName;
    const phoneNumber = data.phoneNumber !== undefined ? data.phoneNumber : current.phoneNumber;
    const contactEmail = data.contactEmail !== undefined ? data.contactEmail : current.contactEmail;

    await pool.query(
      `UPDATE users 
       SET name = $1, avatar_url = $2, designation = $3, company_name = $4, phone_number = $5, contact_email = $6, updated_at = NOW()
       WHERE id = $7`,
      [name, avatarUrl, designation, companyName, phoneNumber, contactEmail, userId]
    );

    if (current.organizationId && companyName) {
      await pool.query(`UPDATE saas_organizations SET name = $1, updated_at = NOW() WHERE id = $2`, [companyName, current.organizationId]);
    }

    return this.getUserProfile(userId);
  }

  // Register / Add Client Credentials dynamically to Neon DB
  public async createUser(account: UserAccount): Promise<UserAccount> {
    const userId = account.id || `usr-${crypto.randomBytes(6).toString('hex')}`;
    const cleanEmail = account.email.toLowerCase().trim();
    const userName = account.name || cleanEmail.split('@')[0];
    const userRole = account.role || 'client_user';
    const githubLogin = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');

    let orgId = account.organizationId;
    if (!orgId) {
      orgId = `org-${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24)}`;
    }

    try {
      await pool.query(
        `INSERT INTO saas_organizations (id, name, slug, plan, updated_at)
         VALUES ($1, $2, $3, 'enterprise', NOW())
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
        [orgId, `${userName}'s Organization`, orgId]
      );
    } catch (err: any) {
      logger.warn('AUTH_SERVICE', `Could not create saas_organization in DB: ${err.message}`);
    }

    await pool.query(
      `INSERT INTO users (id, github_login, name, email, role, password_hash, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         password_hash = EXCLUDED.password_hash,
         organization_id = EXCLUDED.organization_id,
         updated_at = NOW()`,
      [userId, githubLogin, userName, cleanEmail, userRole, account.password || 'password', orgId]
    );

    return {
      id: userId,
      email: cleanEmail,
      name: userName,
      role: userRole,
      organizationId: orgId,
    };
  }

  // Get recent login logs audit trail
  public async getLoginHistory(limit = 30) {
    const res = await pool.query(
      `SELECT l.id, l.email, l.status, l.ip_address, l.user_agent, l.login_at, u.name as user_name
       FROM user_login_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.login_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}

export const authService = new AuthService();
