const { z } = require('zod');

/**
 * Registration request body validation schema.
 * - Trims name and enforces 1-100 character bounds.
 * - Normalizes email to lowercase and validates RFC-compliant format.
 * - Enforces minimum 8 characters and maximum 72 characters for password.
 *   (Max 72 characters prevents bcrypt truncation and CPU-exhaustion DoS attacks).
 */
const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, { message: 'Name cannot be empty' })
    .max(100, { message: 'Name cannot exceed 100 characters' }),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email address format' })
    .max(255, { message: 'Email cannot exceed 255 characters' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(72, { message: 'Password cannot exceed 72 characters' }),
});

/**
 * Login request body validation schema.
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email address format' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, { message: 'Password cannot be empty' })
    .max(72, { message: 'Password cannot exceed 72 characters' }),
});

/**
 * Express middleware helper to validate req.body against a given Zod schema.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues || (Array.isArray(result.error.errors) ? result.error.errors : []);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
      });
    }
    // Assign validated and normalized data back to req.body
    req.body = result.data;
    return next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  validateBody,
};
