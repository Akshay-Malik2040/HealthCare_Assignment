/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Phase 5 Migration: Create patient_doctors junction table with referential integrity,
 * unique assignment constraint, and indexes.
 */
exports.up = (pgm) => {
  pgm.createTable(
    'patient_doctors',
    {
      id: 'id', // serial PRIMARY KEY
      patient_id: {
        type: 'integer',
        notNull: true,
        references: 'patients(id)',
        onDelete: 'CASCADE',
      },
      doctor_id: {
        type: 'integer',
        notNull: true,
        references: 'doctors(id)',
        onDelete: 'CASCADE',
      },
      created_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
    {
      ifNotExists: true,
      constraints: {
        unique: ['patient_id', 'doctor_id'],
      },
    }
  );

  // Indexes to accelerate lookups by patient and doctor
  pgm.createIndex('patient_doctors', 'patient_id', { ifNotExists: true });
  pgm.createIndex('patient_doctors', 'doctor_id', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('patient_doctors', { ifExists: true });
};
