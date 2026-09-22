import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export async function logTelemetry(req: Request, res: Response) {
  try {
    const { level, category, action, path, details } = req.body;
    const categoryName = category || 'UI_INTERACTION';
    const actionText = action || 'User Action';
    const currentPath = path || '/';

    const logMsg = `User Action: "${actionText}" [Page: ${currentPath}]`;

    if (level === 'ERROR') {
      logger.error('FRONTEND_UI', logMsg, details);
    } else if (level === 'WARN') {
      logger.warn('FRONTEND_UI', logMsg, details);
    } else {
      logger.frontend(categoryName, logMsg, details);
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
