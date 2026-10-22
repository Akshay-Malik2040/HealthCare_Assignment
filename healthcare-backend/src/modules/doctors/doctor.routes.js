const express = require('express');
const doctorController = require('./doctor.controller');
const { validateDoctorBody, validateDoctorId } = require('./doctor.validation');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

// Require JWT authentication for all doctor endpoints
router.use(authenticate);

// Create doctor (POST /api/doctors and POST /api/doctors/)
router.post('/', validateDoctorBody, doctorController.create);

// List doctors (GET /api/doctors and GET /api/doctors/)
router.get('/', doctorController.list);

// Retrieve doctor by ID (GET /api/doctors/:id and GET /api/doctors/:id/)
router.get('/:id', validateDoctorId, doctorController.getById);

// Update doctor by ID (PUT /api/doctors/:id and PUT /api/doctors/:id/)
router.put('/:id', validateDoctorId, validateDoctorBody, doctorController.update);

// Delete doctor by ID (DELETE /api/doctors/:id and DELETE /api/doctors/:id/)
router.delete('/:id', validateDoctorId, doctorController.remove);

module.exports = router;
