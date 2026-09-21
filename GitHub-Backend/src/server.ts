import { app } from './app.js';
import { config } from './config/index.js';
import { prisma } from './db/prisma.js';

async function main() {
  try {
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL successfully.');

    app.listen(config.port, () => {
      console.log(`[Server] GitHub Monitoring Backend running on http://localhost:${config.port}`);
    });
  } catch (error: any) {
    console.error('[Server] Failed to initialize server:', error.message);
  }
}

main();
