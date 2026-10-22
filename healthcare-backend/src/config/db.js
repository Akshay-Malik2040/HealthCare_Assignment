const { Pool } = require('pg');
const env = require('./env');

let poolInstance = null;

/**
 * Parses SSL configuration from environment settings.
 * Supports both local development (SSL disabled) and cloud providers like Render (SSL required).
 * Ensures TLS certificate verification is NOT disabled blindly in production.
 */
function getSslConfig() {
  const sslMode = String(env.DATABASE_SSL || 'false').toLowerCase();
  const isEnabled = sslMode === 'true' || sslMode === 'require' || sslMode === '1';

  if (!isEnabled) {
    return false;
  }

  // If SSL is enabled, configure secure verification options
  const rejectUnauthorized = env.DATABASE_SSL_REJECT_UNAUTHORIZED !== false;

  return {
    rejectUnauthorized,
  };
}

/**
 * Builds the pg.Pool configuration object.
 * Reads DATABASE_URL from process.env, configures timeouts and SSL.
 */
function createPoolConfig() {
  const sslConfig = getSslConfig();

  const baseConfig = {
    max: env.DB_MAX_CONNECTIONS,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  };

  if (sslConfig) {
    baseConfig.ssl = sslConfig;
  }

  // Prefer full DATABASE_URL from process.env if available
  const connectionUrl = process.env.DATABASE_URL || env.DATABASE_URL;

  if (connectionUrl) {
    return {
      ...baseConfig,
      connectionString: connectionUrl,
    };
  }

  // Fallback to discrete parameters without hardcoding localhost or credentials
  return {
    ...baseConfig,
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  };
}

/**
 * Returns a singleton instance of pg.Pool.
 * Prevents spawning duplicate pools when imported across tests, migrations, and modules.
 */
function getPool() {
  if (!poolInstance) {
    poolInstance = new Pool(createPoolConfig());

    // Idle client error handling to prevent uncaught process crashes
    poolInstance.on('error', (err) => {
      console.error('[DATABASE POOL ERROR] Unexpected idle client error:', err.message);
    });
  }
  return poolInstance;
}

const pool = getPool();

/**
 * Parameterized query runner.
 * Ensures all SQL operations are safely parameterized to prevent SQL injection.
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameter values
 */
async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Verifies database connectivity using a lightweight query.
 * Safe for readiness checks: returns boolean and latency without exposing credentials.
 * @returns {Promise<{ ok: boolean, latencyMs: number, error?: string }>}
 */
async function checkDbConnection() {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT 1 AS healthy');
    const latencyMs = Date.now() - start;
    const ok = Boolean(result && result.rows && result.rows[0] && result.rows[0].healthy === 1);
    return { ok, latencyMs };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Closes the active pool cleanly (for graceful shutdown and test teardowns).
 */
async function closeDb() {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

module.exports = {
  pool,
  getPool,
  query,
  checkDbConnection,
  closeDb,
};
