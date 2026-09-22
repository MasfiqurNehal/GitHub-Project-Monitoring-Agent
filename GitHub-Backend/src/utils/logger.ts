import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../../logs');
const logFilePath = path.join(logsDir, 'logger.txt');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Single precise timestamp format: DD/MM/YYYY - HH:mm:ss.SSSSSS
export function getFormattedTimestamp(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  const hrTime = process.hrtime();
  const nanoseconds = String(hrTime[1]).padStart(9, '0').slice(0, 6);

  return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}.${milliseconds}${nanoseconds}`;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'HTTP' | 'DATABASE' | 'GITHUB' | 'SYNC' | 'FRONTEND' | 'FASTAPI';

export function writeLog(level: LogLevel, category: string, message: string, meta?: any) {
  const timestamp = getFormattedTimestamp();
  let detailsStr = '';

  if (meta) {
    if (meta instanceof Error) {
      detailsStr = ` | Error: ${meta.message} [Stack: ${meta.stack}]`;
    } else if (typeof meta === 'object') {
      // Remove duplicate timestamp properties from meta object
      const cleanMeta = { ...meta };
      delete cleanMeta.timestamp;
      delete cleanMeta.time;

      const keys = Object.keys(cleanMeta);
      if (keys.length > 0) {
        const keyVals = keys.map((k) => `${k}=${typeof cleanMeta[k] === 'object' ? JSON.stringify(cleanMeta[k]) : cleanMeta[k]}`).join(', ');
        detailsStr = ` | Details: [${keyVals}]`;
      }
    } else {
      detailsStr = ` | Details: [${meta}]`;
    }
  }

  const logEntry = `[${timestamp}] [${level.padEnd(8)}] [${category}] ${message}${detailsStr}\n`;

  // Output directly to stdout
  process.stdout.write(logEntry);

  // Append synchronously to logs/logger.txt
  try {
    fs.appendFileSync(logFilePath, logEntry);
  } catch (err: any) {
    console.error('[Logger Write Failure]', err.message);
  }
}

export const logger = {
  info: (category: string, message: string, meta?: any) => writeLog('INFO', category, message, meta),
  warn: (category: string, message: string, meta?: any) => writeLog('WARN', category, message, meta),
  error: (category: string, message: string, meta?: any) => writeLog('ERROR', category, message, meta),
  http: (message: string, meta?: any) => writeLog('HTTP', 'EXPRESS_SERVER', message, meta),
  db: (message: string, meta?: any) => writeLog('DATABASE', 'NEON_POSTGRES', message, meta),
  github: (message: string, meta?: any) => writeLog('GITHUB', 'OCTOKIT_API', message, meta),
  sync: (message: string, meta?: any) => writeLog('SYNC', 'HISTORICAL_SYNC', message, meta),
  frontend: (category: string, message: string, meta?: any) => writeLog('FRONTEND', category, message, meta),
  fastapi: (message: string, meta?: any) => writeLog('FASTAPI', 'AI_ENGINE', message, meta),
};
