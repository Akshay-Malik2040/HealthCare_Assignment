const db = require('../../config/db');

/**
 * Normalizes input ID to an integer for SQL queries.
 * @param {string|number} id
 * @returns {number}
 */
function toIntegerId(id) {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid identifier: ${id}`);
  }
  return parsed;
}

/**
 * Creates a patient-doctor mapping in a transaction.
 * Confirms patient exists and belongs to the authenticated user.
 * Confirms doctor exists.
 * Prevents duplicate assignments with HTTP 409.
 *
 * @param {string|number} userId - Authenticated caller user ID
 * @param {object} mappingData - { patient_id, doctor_id }
 * @returns {Promise<object>} Created mapping record
 */
async function createMapping(userId, { patient_id, doctor_id }) {
  const ownerId = toIntegerId(userId);
  const patientId = toIntegerId(patient_id);
  const doctorId = toIntegerId(doctor_id);

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Confirm patient exists and belongs to the authenticated caller
    const patientResult = await client.query(
      'SELECT id FROM patients WHERE id = $1 AND user_id = $2 LIMIT 1;',
      [patientId, ownerId]
    );

    if (patientResult.rows.length === 0) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // 2. Confirm doctor exists in the shared doctor catalog
    const doctorResult = await client.query(
      'SELECT id FROM doctors WHERE id = $1 LIMIT 1;',
      [doctorId]
    );

    if (doctorResult.rows.length === 0) {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // 3. Check for existing mapping before insertion
    const existingMapping = await client.query(
      'SELECT id FROM patient_doctors WHERE patient_id = $1 AND doctor_id = $2 LIMIT 1;',
      [patientId, doctorId]
    );

    if (existingMapping.rows.length > 0) {
      const error = new Error('Patient is already assigned to this doctor');
      error.statusCode = 409;
      error.code = 'DUPLICATE_MAPPING';
      throw error;
    }

    // 4. Insert mapping with parameterized SQL
    const insertResult = await client.query(
      `INSERT INTO patient_doctors (patient_id, doctor_id)
       VALUES ($1, $2)
       RETURNING id, patient_id, doctor_id, created_at;`,
      [patientId, doctorId]
    );

    await client.query('COMMIT');
    return insertResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');

    // Handle database-level unique constraint violation (concurrent duplicate requests)
    if (error.code === '23505') {
      const duplicateError = new Error('Patient is already assigned to this doctor');
      duplicateError.statusCode = 409;
      duplicateError.code = 'DUPLICATE_MAPPING';
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Lists all patient-doctor mappings for patients owned by the authenticated user.
 * Avoids N+1 queries with a single SQL JOIN.
 *
 * @param {string|number} userId - Authenticated caller user ID
 * @returns {Promise<Array<object>>} List of mappings with patient and doctor details
 */
async function listMappings(userId) {
  const ownerId = toIntegerId(userId);

  const queryText = `
    SELECT
      pd.id,
      pd.patient_id,
      pd.doctor_id,
      pd.created_at,
      p.name AS patient_name,
      p.age AS patient_age,
      p.gender AS patient_gender,
      d.name AS doctor_name,
      d.specialization AS doctor_specialization,
      d.email AS doctor_email,
      d.phone AS doctor_phone
    FROM patient_doctors pd
    INNER JOIN patients p ON pd.patient_id = p.id
    INNER JOIN doctors d ON pd.doctor_id = d.id
    WHERE p.user_id = $1
    ORDER BY pd.created_at DESC, pd.id DESC;
  `;

  const result = await db.query(queryText, [ownerId]);
  return result.rows;
}

/**
 * Retrieves all doctors assigned to a patient, strictly enforcing that the patient
 * is owned by the authenticated caller.
 *
 * @param {string|number} userId - Authenticated caller user ID
 * @param {string|number} patientId - Target patient ID
 * @returns {Promise<Array<object>>} List of assigned doctors
 */
async function getDoctorsByPatientId(userId, patientId) {
  const ownerId = toIntegerId(userId);
  const targetPatientId = toIntegerId(patientId);

  // 1. Confirm patient exists and belongs to the authenticated caller
  const patientCheck = await db.query(
    'SELECT id FROM patients WHERE id = $1 AND user_id = $2 LIMIT 1;',
    [targetPatientId, ownerId]
  );

  if (patientCheck.rows.length === 0) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // 2. Query assigned doctors with mapping metadata
  const queryText = `
    SELECT
      pd.id AS mapping_id,
      pd.patient_id,
      pd.doctor_id,
      pd.created_at AS assigned_at,
      d.name AS doctor_name,
      d.specialization,
      d.email,
      d.phone
    FROM patient_doctors pd
    INNER JOIN doctors d ON pd.doctor_id = d.id
    WHERE pd.patient_id = $1
    ORDER BY pd.created_at DESC, pd.id DESC;
  `;

  const result = await db.query(queryText, [targetPatientId]);
  return result.rows;
}

/**
 * Deletes a mapping, enforcing ownership through SQL JOIN/USING.
 * Only deletes if the mapping belongs to a patient owned by the caller.
 * Never deletes the patient or doctor record.
 *
 * @param {string|number} userId - Authenticated caller user ID
 * @param {string|number} mappingId - Mapping identifier
 * @returns {Promise<boolean>} True if deleted, false if not found / unauthorized
 */
async function deleteMapping(userId, mappingId) {
  const ownerId = toIntegerId(userId);
  const targetMappingId = toIntegerId(mappingId);

  const queryText = `
    DELETE FROM patient_doctors pd
    USING patients p
    WHERE pd.id = $1 AND pd.patient_id = p.id AND p.user_id = $2
    RETURNING pd.id;
  `;

  const result = await db.query(queryText, [targetMappingId, ownerId]);
  return result.rows.length > 0;
}

module.exports = {
  createMapping,
  listMappings,
  getDoctorsByPatientId,
  deleteMapping,
};
