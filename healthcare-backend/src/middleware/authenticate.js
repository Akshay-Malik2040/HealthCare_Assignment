const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ALLOWED_ALGORITHMS = ['HS256'];

/**
 * Reusable JWT Authentication Middleware
 * Validates 'Bearer <token>' in the Authorization header.
 * Enforces signature validity, expiration, and HS256 algorithm.
 * Attaches verified { id, email } to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header is missing',
        details: null,
      },
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header must follow "Bearer <token>" format',
        details: null,
      },
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ALLOWED_ALGORITHMS,
    });

    if (!decoded.sub) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token subject is missing',
          details: null,
        },
      });
    }

    // Attach minimal verified user identity to req.user
    req.user = {
      id: decoded.sub,
      email: decoded.email,
    };

    return next();
  } catch (error) {
    let message = 'Invalid or expired token';
    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token signature or payload';
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
        details: null,
      },
    });
  }
}

module.exports = authenticate;
