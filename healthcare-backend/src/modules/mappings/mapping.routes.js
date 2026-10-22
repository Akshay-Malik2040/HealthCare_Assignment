const express = require('express');
const mappingController = require('./mapping.controller');
const {
  validateCreateMapping,
  validatePatientParamId,
  validateMappingParamId,
} = require('./mapping.validation');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

// Require JWT authentication for all mapping endpoints
router.use(authenticate);

// Create mapping (POST /api/mappings and POST /api/mappings/)
router.post('/', validateCreateMapping, mappingController.create);

// List mappings (GET /api/mappings and GET /api/mappings/)
router.get('/', mappingController.list);

// Get doctors assigned to patient (GET /api/mappings/:patient_id and GET /api/mappings/:patient_id/)
router.get('/:patient_id', validatePatientParamId, mappingController.getDoctorsByPatient);

// Delete mapping (DELETE /api/mappings/:id and DELETE /api/mappings/:id/)
router.delete('/:id', validateMappingParamId, mappingController.remove);

module.exports = router;
