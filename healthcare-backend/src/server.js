const app = require('./app');
const env = require('./config/env');
const { checkDbConnection, closeDb } = require('./config/db');

async function startServer() {
  console.log('====================================================');
  console.log('  Healthcare Management Backend - Phase 1 Foundation');
  console.log('====================================================');

  // Verify database connectivity before opening the network port
  console.log('[DATABASE] Verifying initial connection to PostgreSQL...');
  const dbHealth = await checkDbConnection();

  if (!dbHealth.ok) {
    console.error(`[FATAL] Unable to connect to PostgreSQL: ${dbHealth.error}`);
    console.error('[FATAL] Application cannot start without a reachable database.');
    console.error('[FATAL] Please verify your DATABASE_URL or DB_* settings in .env.');
    process.exit(1);
  }

  console.log(`[DATABASE] Connection established successfully (${dbHealth.latencyMs}ms latency).`);

  const HOST = process.env.HOST || '0.0.0.0';
  const server = app.listen(env.PORT, HOST, () => {
    console.log(`[SERVER] Express server running at http://${HOST}:${env.PORT} in ${env.NODE_ENV} mode.`);
    console.log(`[SERVER] Health Check: http://localhost:${env.PORT}/api/health`);
    console.log(`[SERVER] API Root:     http://localhost:${env.PORT}/api`);
  });

  // Graceful shutdown handling
  let isShuttingDown = false;

  async function handleGracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[SHUTDOWN] Received ${signal}. Closing server gracefully...`);

    // Force exit if graceful shutdown takes more than 10 seconds
    const forceExitTimer = setTimeout(() => {
      console.error('[SHUTDOWN] Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    server.close(async (err) => {
      if (err) {
        console.error('[SHUTDOWN] Error closing HTTP server:', err);
        process.exit(1);
      }
      console.log('[SHUTDOWN] HTTP server closed. Disconnecting database pool...');

      try {
        await closeDb();
        console.log('[SHUTDOWN] Database pool closed successfully.');
        process.exit(0);
      } catch (poolErr) {
        console.error('[SHUTDOWN] Error closing database pool:', poolErr);
        process.exit(1);
      }
    });
  }

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[FATAL] Unhandled error during server startup:', err);
  process.exit(1);
});
