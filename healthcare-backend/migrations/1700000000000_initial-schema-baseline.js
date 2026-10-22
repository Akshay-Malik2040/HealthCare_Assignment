/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Phase 1 Initial Baseline Migration
 * Creates a minimal schema_baseline tracking table without domain business tables.
 * Domain tables (patients, doctors, appointments, etc.) are strictly reserved for Phase 2.
 */
exports.up = (pgm) => {
  pgm.createTable(
    'schema_baseline',
    {
      id: 'id',
      phase: { type: 'varchar(50)', notNull: true },
      description: { type: 'text', notNull: true },
      installed_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
    { ifNotExists: true }
  );

  pgm.sql(`
    INSERT INTO schema_baseline (phase, description)
    VALUES ('Phase 1', 'Healthcare Management System foundation baseline initialized');
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('schema_baseline', { ifExists: true });
};
