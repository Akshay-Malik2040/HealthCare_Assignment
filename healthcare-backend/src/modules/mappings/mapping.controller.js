const mappingService = require('./mapping.service');

/**
 * Assign a doctor to a patient.
 * POST /api/mappings/
 */
async function create(req, res, next) {
  try {
    const mapping = await mappingService.createMapping(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * List all mappings for patients owned by the caller.
 * GET /api/mappings/
 */
async function list(req, res, next) {
  try {
    const mappings = await mappingService.listMappings(req.user.id);
    return res.status(200).json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all doctors assigned to a specific patient.
 * GET /api/mappings/:patient_id/
 */
async function getDoctorsByPatient(req, res, next) {
  try {
    const doctors = await mappingService.getDoctorsByPatientId(req.user.id, req.patientId);
    return res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete a patient-doctor mapping.
 * DELETE /api/mappings/:id/
 */
async function remove(req, res, next) {
  try {
    const deleted = await mappingService.deleteMapping(req.user.id, req.mappingId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Mapping not found',
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
  getDoctorsByPatient,
  remove,
};
