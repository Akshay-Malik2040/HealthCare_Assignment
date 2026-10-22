const patientService = require('./patient.service');

/**
 * Create a new patient record.
 * POST /api/patients/
 */
async function create(req, res, next) {
  try {
    const patient = await patientService.createPatient(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * List all patients owned by the authenticated user.
 * GET /api/patients/
 */
async function list(req, res, next) {
  try {
    const patients = await patientService.listPatients(req.user.id);
    return res.status(200).json({
      success: true,
      data: patients,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieve a specific patient by ID.
 * GET /api/patients/:id/
 */
async function getById(req, res, next) {
  try {
    const patient = await patientService.getPatientById(req.user.id, req.patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found',
          details: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Replace/Update an existing patient record.
 * PUT /api/patients/:id/
 */
async function update(req, res, next) {
  try {
    const patient = await patientService.updatePatient(req.user.id, req.patientId, req.body);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found',
          details: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete a patient record.
 * DELETE /api/patients/:id/
 */
async function remove(req, res, next) {
  try {
    const deleted = await patientService.deletePatient(req.user.id, req.patientId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found',
          details: null,
        },
      });
    }

    // HTTP 204 No Content
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
};
