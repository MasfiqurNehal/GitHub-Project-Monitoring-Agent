import dotenv from 'dotenv';
import { app } from './app.js';
import { checkDatabaseHealth } from './db/connection.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  console.log('[Server] Checking Neon PostgreSQL database connection...');
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.isHealthy) {
    console.log('[Server] Successfully connected to Neon PostgreSQL Database.');
  } else {
    console.warn('[Server] Neon PostgreSQL Connection Error:', dbHealth.error);
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 GitHub Project Monitoring Backend Engine Running!`);
    console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

startServer();
