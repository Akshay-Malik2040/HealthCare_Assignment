const doctorService = require('./doctor.service');

/**
 * Create a new doctor record.
 * POST /api/doctors/
 */
async function create(req, res, next) {
  try {
    const doctor = await doctorService.createDoctor(req.body);
    return res.status(201).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * List all doctor records under the shared-doctor model.
 * GET /api/doctors/
 */
async function list(req, res, next) {
  try {
    const doctors = await doctorService.listDoctors();
    return res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieve a specific doctor by ID.
 * GET /api/doctors/:id/
 */
async function getById(req, res, next) {
  try {
    const doctor = await doctorService.getDoctorById(req.doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Doctor not found',
          details: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Full replacement update of a doctor record.
 * PUT /api/doctors/:id/
 */
async function update(req, res, next) {
  try {
    const doctor = await doctorService.updateDoctor(req.doctorId, req.body);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Doctor not found',
          details: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete a doctor record.
 * DELETE /api/doctors/:id/
 */
async function remove(req, res, next) {
  try {
    const deleted = await doctorService.deleteDoctor(req.doctorId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Doctor not found',
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
