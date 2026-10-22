const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const env = require('../../config/env');

const BCRYPT_SALT_ROUNDS = 10;
const JWT_ALGORITHM = 'HS256';

/**
 * Custom application error class for domain errors with HTTP status codes.
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Registers a new user.
 * - Hashes password using bcrypt.
 * - Safely inserts user using parameterized SQL.
 * - Handles concurrent race conditions via database unique constraint (23505).
 * - Sanitizes response to never expose password or hash.
 */
async function registerUser({ name, email, password }) {
  // Pre-check for duplicate email
  const existingUser = await db.query(
    'SELECT id FROM users WHERE email = $1 LIMIT 1;',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  // Hash password with bcrypt
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  try {
    const insertResult = await db.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at;`,
      [name, email, passwordHash]
    );

    const newUser = insertResult.rows[0];

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.created_at,
    };
  } catch (error) {
    // Catch PostgreSQL unique constraint violation (code 23505) for concurrent requests
    if (error.code === '23505') {
      throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
    }
    throw error;
  }
}

/**
 * Authenticates user credentials and signs a JWT access token.
 * - Constant generic error message for missing user or wrong password (prevents user enumeration).
 * - Issues token with user ID as subject (sub) using explicit HS256 algorithm.
 * - Sanitizes response to return only token and public user metadata.
 */
async function loginUser({ email, password }) {
  const genericAuthError = new AppError(
    'Invalid email or password',
    401,
    'INVALID_CREDENTIALS'
  );

  const result = await db.query(
    `SELECT id, name, email, password_hash
     FROM users
     WHERE email = $1
     LIMIT 1;`,
    [email]
  );

  if (result.rows.length === 0) {
    throw genericAuthError;
  }

  const user = result.rows[0];

  // Compare submitted plaintext password with stored bcrypt hash
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw genericAuthError;
  }

  // Sign JWT access token with user ID as subject (sub)
  const payload = {
    sub: String(user.id),
    email: user.email,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
  AppError,
  BCRYPT_SALT_ROUNDS,
  JWT_ALGORITHM,
};
