const db = require('../../config/db');

/**
 * Normalizes input ID to an integer for SQL queries.
 * @param {string|number} id - Doctor identifier
 * @returns {number}
 */
function toIntegerId(id) {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid doctor identifier: ${id}`);
  }
  return parsed;
}

/**
 * Finds a doctor by normalized email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function getDoctorByEmail(email) {
  const queryText = `
    SELECT id, name, specialization, email, phone, created_at, updated_at
    FROM doctors
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
  `;
  const result = await db.query(queryText, [email]);
  return result.rows[0] || null;
}

/**
 * Creates a new doctor record.
 * Checks for duplicate email to ensure HTTP 409 response.
 * Uses parameterized SQL and never accepts client-supplied IDs or timestamps.
 * @param {object} doctorData
 * @returns {Promise<object>}
 */
async function createDoctor({ name, specialization, email, phone = null }) {
  const normalizedEmail = email.trim().toLowerCase();

  // Application-level check for duplicate email
  const existing = await getDoctorByEmail(normalizedEmail);
  if (existing) {
    const error = new Error('Email is already registered');
    error.statusCode = 409;
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const queryText = `
    INSERT INTO doctors (name, specialization, email, phone)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, specialization, email, phone, created_at, updated_at;
  `;

  try {
    const result = await db.query(queryText, [name, specialization, normalizedEmail, phone]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      const conflictError = new Error('Email is already registered');
      conflictError.statusCode = 409;
      conflictError.code = 'EMAIL_EXISTS';
      throw conflictError;
    }
    throw error;
  }
}

/**
 * Lists all doctor records under the assignment's shared-doctor model.
 * Deterministic ordering: newest first.
 * @returns {Promise<Array<object>>}
 */
async function listDoctors() {
  const queryText = `
    SELECT id, name, specialization, email, phone, created_at, updated_at
    FROM doctors
    ORDER BY created_at DESC, id DESC;
  `;

  const result = await db.query(queryText);
  return result.rows;
}

/**
 * Retrieves a single doctor by ID.
 * @param {string|number} doctorId
 * @returns {Promise<object|null>}
 */
async function getDoctorById(doctorId) {
  const id = toIntegerId(doctorId);

  const queryText = `
    SELECT id, name, specialization, email, phone, created_at, updated_at
    FROM doctors
    WHERE id = $1
    LIMIT 1;
  `;

  const result = await db.query(queryText, [id]);
  return result.rows[0] || null;
}

/**
 * Updates an existing doctor with full replacement semantics.
 * Rejects duplicate emails if belonging to another doctor.
 * Updates updated_at timestamp.
 * @param {string|number} doctorId
 * @param {object} updateData
 * @returns {Promise<object|null>}
 */
async function updateDoctor(doctorId, { name, specialization, email, phone = null }) {
  const id = toIntegerId(doctorId);
  const normalizedEmail = email.trim().toLowerCase();

  // Verify doctor exists first
  const existingDoctor = await getDoctorById(id);
  if (!existingDoctor) {
    return null;
  }

  // Check if another doctor already uses this email
  const existingWithEmail = await getDoctorByEmail(normalizedEmail);
  if (existingWithEmail && existingWithEmail.id !== id) {
    const error = new Error('Email is already registered to another doctor');
    error.statusCode = 409;
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const queryText = `
    UPDATE doctors
    SET name = $1, specialization = $2, email = $3, phone = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, name, specialization, email, phone, created_at, updated_at;
  `;

  try {
    const result = await db.query(queryText, [name, specialization, normalizedEmail, phone, id]);
    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      const conflictError = new Error('Email is already registered to another doctor');
      conflictError.statusCode = 409;
      conflictError.code = 'EMAIL_EXISTS';
      throw conflictError;
    }
    throw error;
  }
}

/**
 * Deletes a doctor by ID.
 * Prevents deletion if existing assignments/mappings reference this doctor (HTTP 409).
 * @param {string|number} doctorId
 * @returns {Promise<boolean>}
 */
async function deleteDoctor(doctorId) {
  const id = toIntegerId(doctorId);

  const queryText = `
    DELETE FROM doctors
    WHERE id = $1
    RETURNING id;
  `;

  try {
    const result = await db.query(queryText, [id]);
    return result.rows.length > 0;
  } catch (error) {
    if (error.code === '23503') {
      const conflictError = new Error('Cannot delete doctor: record is referenced by existing patient assignments');
      conflictError.statusCode = 409;
      conflictError.code = 'DELETE_CONFLICT';
      throw conflictError;
    }
    throw error;
  }
}

module.exports = {
  createDoctor,
  listDoctors,
  getDoctorById,
  getDoctorByEmail,
  updateDoctor,
  deleteDoctor,
};
