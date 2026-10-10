import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';
import { logger } from '../utils/logger.js';

// Ensure table exists safety helper
async function ensureDemoRequestsTableExists() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS demo_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err: any) {
    logger.error('DEMO_REQUEST', `Error ensuring demo_requests table: ${err.message}`, err);
  }
}

// 1. Public Endpoint: Submit Demo Request
export async function createDemoRequest(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureDemoRequestsTableExists();

    const { name, email, phone, description } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Full Name is required.',
      });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Strict Gmail domain verification
    if (!trimmedEmail.endsWith('@gmail.com') || trimmedEmail.length <= 10) {
      return res.status(400).json({
        success: false,
        error: 'Only valid Gmail addresses (@gmail.com) are accepted for demo access requests.',
      });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone ? String(phone).trim() : null;
    const trimmedDesc = description ? String(description).trim() : null;

    const result = await pool.query(
      `INSERT INTO demo_requests (name, email, phone, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, description, status, created_at`,
      [trimmedName, trimmedEmail, trimmedPhone, trimmedDesc]
    );

    const createdRecord = result.rows[0];

    logger.info('DEMO_REQUEST', `New demo access request received from ${trimmedName} (${trimmedEmail})`);

    return res.status(201).json({
      success: true,
      message: 'Your response was received! System administrator will review your request and send login credentials to your Gmail.',
      data: createdRecord,
    });
  } catch (err: any) {
    logger.error('DEMO_REQUEST', `Failed to create demo request: ${err.message}`, err);
    next(err);
  }
}

// 2. Admin Endpoint: List Demo Requests
export async function listDemoRequests(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureDemoRequestsTableExists();
    const result = await pool.query(
      `SELECT id, name, email, phone, description, status, created_at, updated_at
       FROM demo_requests
       ORDER BY created_at DESC`
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err: any) {
    next(err);
  }
}
