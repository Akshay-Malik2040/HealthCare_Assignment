const { z } = require('zod');

/**
 * Zod schema for patient-doctor mapping creation.
 * - patient_id: required positive integer.
 * - doctor_id: required positive integer.
 * - Strips unexpected client fields (id, created_at, user_id, etc.).
 */
const createMappingSchema = z.object({
  patient_id: z
    .number({
      required_error: 'patient_id is required',
      invalid_type_error: 'patient_id must be a number',
    })
    .int({ message: 'patient_id must be an integer' })
    .positive({ message: 'patient_id must be a positive integer' }),
  doctor_id: z
    .number({
      required_error: 'doctor_id is required',
      invalid_type_error: 'doctor_id must be a number',
    })
    .int({ message: 'doctor_id must be an integer' })
    .positive({ message: 'doctor_id must be a positive integer' }),
});

/**
 * Middleware validating request body for mapping creation.
 */
function validateCreateMapping(req, res, next) {
  const result = createMappingSchema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || (Array.isArray(result.error.errors) ? result.error.errors : []);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid mapping request payload',
        details: issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    });
  }

  req.body = {
    patient_id: result.data.patient_id,
    doctor_id: result.data.doctor_id,
  };

  return next();
}

/**
 * Middleware validating that req.params.patient_id is a positive integer.
 */
function validatePatientParamId(req, res, next) {
  const { patient_id } = req.params;
  const numId = Number(patient_id);

  if (!patient_id || !/^\d+$/.test(patient_id) || !Number.isInteger(numId) || numId <= 0) {
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

/**
 * Middleware validating that req.params.id is a positive integer.
 */
function validateMappingParamId(req, res, next) {
  const { id } = req.params;
  const numId = Number(id);

  if (!id || !/^\d+$/.test(id) || !Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Mapping ID must be a positive integer',
        details: null,
      },
    });
  }

  req.mappingId = numId;
  return next();
}

module.exports = {
  createMappingSchema,
  validateCreateMapping,
  validatePatientParamId,
  validateMappingParamId,
};
