const { z } = require('zod');

/**
 * Zod schema for patient creation and replacement (PUT).
 * - Trims name and requires 1-100 characters.
 * - Enforces integer age between 0 and 150.
 * - Optional gender, address, and phone with sensible length constraints.
 * - Strips unknown fields to prevent mass assignment of user_id, id, timestamps.
 */
const patientSchema = z.object({
  name: z
    .string({ required_error: 'Patient name is required' })
    .trim()
    .min(1, { message: 'Patient name cannot be empty' })
    .max(100, { message: 'Patient name cannot exceed 100 characters' }),
  age: z
    .number({ required_error: 'Patient age is required', invalid_type_error: 'Age must be an integer' })
    .int({ message: 'Age must be an integer' })
    .min(0, { message: 'Age cannot be negative' })
    .max(150, { message: 'Age cannot exceed 150 years' }),
  gender: z
    .string()
    .trim()
    .toLowerCase()
    .max(50, { message: 'Gender cannot exceed 50 characters' })
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z
    .string()
    .trim()
    .max(500, { message: 'Address cannot exceed 500 characters' })
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .max(30, { message: 'Phone number cannot exceed 30 characters' })
    .optional()
    .nullable()
    .or(z.literal('')),
});

/**
 * Validates request body against patient schema.
 */
function validatePatientBody(req, res, next) {
  const result = patientSchema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || (Array.isArray(result.error.errors) ? result.error.errors : []);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid patient data',
        details: issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    });
  }

  // Normalize empty strings to null for clean database storage
  req.body = {
    name: result.data.name,
    age: result.data.age,
    gender: result.data.gender || null,
    address: result.data.address || null,
    phone: result.data.phone || null,
  };

  return next();
}

/**
 * Validates that req.params.id is a valid positive integer.
 * Prevents PostgreSQL type error crashes and returns clean HTTP 400.
 */
function validatePatientId(req, res, next) {
  const { id } = req.params;
  const numId = Number(id);

  if (!id || !/^\d+$/.test(id) || !Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Patient ID must be a positive integer',
        details: null,
      },
    });
  }

  req.patientId = numId;
  return next();
}

module.exports = {
  patientSchema,
  validatePatientBody,
  validatePatientId,
};
