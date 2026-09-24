import dotenv from 'dotenv';
import { app } from './app.js';
import { checkDatabaseHealth, closeDatabasePool } from './db/connection.js';
import { githubAppService } from './github/github-app.service.js';
import { authService } from './services/auth.service.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

dotenv.config();

const PORT = config.port || parseInt(process.env.PORT || '5001', 10);

async function startServer() {
  logger.info('SERVER', 'Starting backend engine initialization...');

  if (!config.databaseUrl) {
    logger.error('CONFIG', 'DATABASE_URL environment variable is missing in .env!');
    process.exit(1);
  }

  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.isHealthy) {
    logger.info('SERVER', 'Successfully connected to Neon PostgreSQL Database.');
    // Synchronize active GitHub App installations & users on startup
    githubAppService.syncInstallations().catch((err) => {
      logger.warn('SERVER', `Background GitHub App installations sync warning: ${err.message}`);
    });
    authService.syncUsersToDb().catch((err) => {
      logger.warn('SERVER', `Background users sync warning: ${err.message}`);
    });
  } else {
    logger.warn('SERVER', `Neon PostgreSQL Connection Warning: ${dbHealth.error}`);
  }

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 GitHub Project Monitoring Backend Engine Running!`);
    console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info('SERVER', `Received ${signal}. Closing HTTP server and PostgreSQL pool...`);
    server.close(async () => {
      logger.info('SERVER', 'Express HTTP server closed.');
      await closeDatabasePool();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
