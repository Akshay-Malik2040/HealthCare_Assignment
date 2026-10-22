const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Locate and load .env file from current working directory or repository root
const envSearchPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of envSearchPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Discrete database parameters
let DB_HOST = process.env.DB_HOST || (NODE_ENV === 'test' ? 'localhost' : undefined);
let DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
let DB_USER = process.env.DB_USER || (NODE_ENV === 'test' ? 'postgres' : undefined);
let DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
let DB_NAME = process.env.DB_NAME || (NODE_ENV === 'test' ? 'healthcare_test' : undefined);

// SSL configuration for cloud providers (e.g. Render, Supabase, Neon, AWS RDS)
const DATABASE_SSL = process.env.DATABASE_SSL || 'false';
const DATABASE_SSL_REJECT_UNAUTHORIZED = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

// Read or synchronize DATABASE_URL
let DATABASE_URL = process.env.DATABASE_URL;

if (DATABASE_URL) {
  try {
    const parsedUrl = new URL(DATABASE_URL);
    if (!DB_HOST) DB_HOST = parsedUrl.hostname;
    if (parsedUrl.port) DB_PORT = parseInt(parsedUrl.port, 10);
    if (!DB_USER && parsedUrl.username) DB_USER = decodeURIComponent(parsedUrl.username);
    if (!DB_PASSWORD && parsedUrl.password) DB_PASSWORD = decodeURIComponent(parsedUrl.password);
    if (!DB_NAME && parsedUrl.pathname && parsedUrl.pathname.length > 1) {
      DB_NAME = parsedUrl.pathname.substring(1);
    }
  } catch (err) {
    // If not a standard URL protocol, let pg driver attempt parsing
  }
} else if (DB_HOST && DB_NAME && DB_USER) {
  // Construct DATABASE_URL from discrete parameters with URL encoding
  const encodedUser = encodeURIComponent(DB_USER);
  const encodedPass = DB_PASSWORD ? encodeURIComponent(DB_PASSWORD) : '';
  const auth = encodedPass ? `${encodedUser}:${encodedPass}` : encodedUser;
  DATABASE_URL = `postgres://${auth}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

  if (DATABASE_SSL === 'true' || DATABASE_SSL === 'require') {
    DATABASE_URL += '?sslmode=require';
  }

  process.env.DATABASE_URL = DATABASE_URL;
}

// Connection pool options
const DB_MAX_CONNECTIONS = process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 10;
const DB_IDLE_TIMEOUT_MS = process.env.DB_IDLE_TIMEOUT_MS ? parseInt(process.env.DB_IDLE_TIMEOUT_MS, 10) : 30000;
const DB_CONNECTION_TIMEOUT_MS = process.env.DB_CONNECTION_TIMEOUT_MS ? parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10) : 5000;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'test' ? 'test_jwt_secret_must_be_at_least_32_characters_long_for_security' : undefined);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Validates the current environment variables.
 * @throws {Error} If required configurations are missing or invalid (except in 'test' mode).
 */
function validateEnv(envOverride = {}) {
  const currentEnv = {
    PORT: envOverride.PORT !== undefined ? envOverride.PORT : PORT,
    NODE_ENV: envOverride.NODE_ENV !== undefined ? envOverride.NODE_ENV : NODE_ENV,
    DATABASE_URL: envOverride.DATABASE_URL !== undefined ? envOverride.DATABASE_URL : DATABASE_URL,
    DB_HOST: envOverride.DB_HOST !== undefined ? envOverride.DB_HOST : DB_HOST,
    DB_NAME: envOverride.DB_NAME !== undefined ? envOverride.DB_NAME : DB_NAME,
    DB_USER: envOverride.DB_USER !== undefined ? envOverride.DB_USER : DB_USER,
    JWT_SECRET: envOverride.JWT_SECRET !== undefined ? envOverride.JWT_SECRET : JWT_SECRET,
  };

  const errors = [];

  const portNum = Number(currentEnv.PORT);
  if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
    errors.push(`PORT must be a valid number between 1 and 65535 (received: ${currentEnv.PORT})`);
  }

  const hasDbUrl = Boolean(currentEnv.DATABASE_URL && String(currentEnv.DATABASE_URL).trim());
  const hasDiscreteConfig = Boolean(currentEnv.DB_HOST && currentEnv.DB_NAME && currentEnv.DB_USER);

  if (!hasDbUrl && !hasDiscreteConfig) {
    errors.push(
      'Missing PostgreSQL database configuration. Please set DATABASE_URL or discrete variables (DB_HOST, DB_NAME, DB_USER).'
    );
  }

  // Validate JWT Secret
  if (currentEnv.NODE_ENV === 'production') {
    if (!currentEnv.JWT_SECRET || currentEnv.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long in production.');
    }
  } else if (currentEnv.NODE_ENV !== 'test') {
    if (!currentEnv.JWT_SECRET) {
      errors.push('JWT_SECRET is missing. Set a cryptographically secure secret (e.g. openssl rand -base64 32).');
    }
  }

  if (errors.length > 0) {
    const message = `[ENVIRONMENT ERROR] Invalid configuration:\n  - ${errors.join('\n  - ')}`;
    throw new Error(message);
  }

  return true;
}

// Fail fast in non-test environments if config is missing or invalid
if (NODE_ENV !== 'test') {
  validateEnv();
}

module.exports = {
  NODE_ENV,
  PORT,
  CORS_ORIGIN,
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_MAX_CONNECTIONS,
  DB_IDLE_TIMEOUT_MS,
  DB_CONNECTION_TIMEOUT_MS,
  DATABASE_SSL,
  DATABASE_SSL_REJECT_UNAUTHORIZED,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  validateEnv,
};
