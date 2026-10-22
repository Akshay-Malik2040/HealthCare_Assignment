const express = require('express');
const patientController = require('./patient.controller');
const { validatePatientBody, validatePatientId } = require('./patient.validation');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

// Require JWT authentication for all patient endpoints
router.use(authenticate);

// Create patient (POST /api/patients and POST /api/patients/)
router.post('/', validatePatientBody, patientController.create);

// List patients (GET /api/patients and GET /api/patients/)
router.get('/', patientController.list);

// Retrieve patient by ID (GET /api/patients/:id and GET /api/patients/:id/)
router.get('/:id', validatePatientId, patientController.getById);

// Update patient by ID (PUT /api/patients/:id and PUT /api/patients/:id/)
router.put('/:id', validatePatientId, validatePatientBody, patientController.update);

// Delete patient by ID (DELETE /api/patients/:id and DELETE /api/patients/:id/)
router.delete('/:id', validatePatientId, patientController.remove);

module.exports = router;
