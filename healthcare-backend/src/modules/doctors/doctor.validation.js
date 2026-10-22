const { z } = require('zod');

/**
 * Phone number regex allowing digits, optional leading +, spaces, hyphens, and parentheses.
 * Preserves leading zeros and supports international formats.
 */
const PHONE_REGEX = /^[+0-9\s\-()]+$/;

/**
 * Zod schema for doctor creation and full replacement (PUT).
 * - name: required string, trimmed, 1-100 characters.
 * - specialization: required string, trimmed, 1-100 characters.
 * - email: required valid email, trimmed, normalized to lowercase, max 255.
 * - phone: optional string up to 30 characters matching valid phone characters.
 * - Unknown fields are stripped to prevent mass assignment of id, created_at, updated_at.
 */
const doctorSchema = z.object({
  name: z
    .string({ required_error: 'Doctor name is required' })
    .trim()
    .min(1, { message: 'Doctor name cannot be empty' })
    .max(100, { message: 'Doctor name cannot exceed 100 characters' }),
  specialization: z
    .string({ required_error: 'Doctor specialization is required' })
    .trim()
    .min(1, { message: 'Doctor specialization cannot be empty' })
    .max(100, { message: 'Doctor specialization cannot exceed 100 characters' }),
  email: z
    .string({ required_error: 'Doctor email is required' })
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email address format' })
    .max(255, { message: 'Email address cannot exceed 255 characters' }),
  phone: z
    .string()
    .trim()
    .max(30, { message: 'Phone number cannot exceed 30 characters' })
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: 'Phone number can only contain digits, spaces, hyphens, parentheses, and an optional leading +',
    })
    .optional()
    .nullable()
    .or(z.literal('')),
});

/**
 * Validates request body against doctor schema.
 * Rejects invalid inputs with HTTP 400 and normalizes empty string fields to null.
 */
function validateDoctorBody(req, res, next) {
  const result = doctorSchema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || (Array.isArray(result.error.errors) ? result.error.errors : []);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid doctor data',
        details: issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    });
  }

  // Normalize empty strings to null for clean database storage and normalize email
  req.body = {
    name: result.data.name,
    specialization: result.data.specialization,
    email: result.data.email.toLowerCase(),
    phone: result.data.phone || null,
  };

  return next();
}

/**
 * Validates that req.params.id is a valid positive integer.
 * Prevents PostgreSQL type error crashes and returns clean HTTP 400.
 */
function validateDoctorId(req, res, next) {
  const { id } = req.params;
  const numId = Number(id);

  if (!id || !/^\d+$/.test(id) || !Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Doctor ID must be a positive integer',
        details: null,
      },
    });
  }

  req.doctorId = numId;
  return next();
}

module.exports = {
  doctorSchema,
  validateDoctorBody,
  validateDoctorId,
};
