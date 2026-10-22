/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Phase 4 Migration: Create doctors table with constraints and indexes
 */
exports.up = (pgm) => {
  pgm.createTable(
    'doctors',
    {
      id: 'id', // serial PRIMARY KEY
      name: {
        type: 'varchar(255)',
        notNull: true,
      },
      specialization: {
        type: 'varchar(255)',
        notNull: true,
      },
      email: {
        type: 'varchar(255)',
        notNull: true,
        unique: true,
      },
      phone: {
        type: 'varchar(50)',
        notNull: false,
      },
      created_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
      updated_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
    { ifNotExists: true }
  );

  // Explicit index on normalized email for fast lookup and uniqueness enforcement
  pgm.createIndex('doctors', 'email', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('doctors', { ifExists: true });
};
