const db = require('../../config/db');

/**
 * Normalizes input user ID to an integer for SQL queries.
 * @param {string|number} userId - The user ID from req.user
 * @returns {number}
 */
function toIntegerId(id) {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid user identifier: ${id}`);
  }
  return parsed;
}

/**
 * Creates a new patient owned by the authenticated user.
 * Ownership is established exclusively from the authenticated user token.
 */
async function createPatient(userId, { name, age, gender = null, address = null, phone = null }) {
  const ownerId = toIntegerId(userId);

  const queryText = `
    INSERT INTO patients (user_id, name, age, gender, address, phone)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, name, age, gender, address, phone, created_at, updated_at;
  `;

  const result = await db.query(queryText, [ownerId, name, age, gender, address, phone]);
  return result.rows[0];
}

/**
 * Lists all patients owned by the authenticated user.
 * Filters strictly by user_id to enforce multi-tenant authorization in SQL.
 */
async function listPatients(userId) {
  const ownerId = toIntegerId(userId);

  const queryText = `
    SELECT id, user_id, name, age, gender, address, phone, created_at, updated_at
    FROM patients
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;

  const result = await db.query(queryText, [ownerId]);
  return result.rows;
}

/**
 * Retrieves a single patient by ID, strictly constrained to the authenticated owner.
 * Returns null if the patient does not exist or is owned by another user.
 */
async function getPatientById(userId, patientId) {
  const ownerId = toIntegerId(userId);

  const queryText = `
    SELECT id, user_id, name, age, gender, address, phone, created_at, updated_at
    FROM patients
    WHERE id = $1 AND user_id = $2
    LIMIT 1;
  `;

  const result = await db.query(queryText, [patientId, ownerId]);
  return result.rows[0] || null;
}

/**
 * Fully updates an existing patient owned by the authenticated user.
 * Returns null if the patient does not exist or is owned by another user.
 */
async function updatePatient(userId, patientId, { name, age, gender = null, address = null, phone = null }) {
  const ownerId = toIntegerId(userId);

  const queryText = `
    UPDATE patients
    SET name = $1, age = $2, gender = $3, address = $4, phone = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6 AND user_id = $7
    RETURNING id, user_id, name, age, gender, address, phone, created_at, updated_at;
  `;

  const result = await db.query(queryText, [name, age, gender, address, phone, patientId, ownerId]);
  return result.rows[0] || null;
}

/**
 * Deletes a patient owned by the authenticated user.
 * Returns true if deleted, false if no record matched (404).
 */
async function deletePatient(userId, patientId) {
  const ownerId = toIntegerId(userId);

  const queryText = `
    DELETE FROM patients
    WHERE id = $1 AND user_id = $2
    RETURNING id;
  `;

  const result = await db.query(queryText, [patientId, ownerId]);
  return result.rows.length > 0;
}

module.exports = {
  createPatient,
  listPatients,
  getPatientById,
  updatePatient,
  deletePatient,
};
