/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Phase 3 Migration: Create patients table with user ownership and constraints
 */
exports.up = (pgm) => {
  pgm.createTable(
    'patients',
    {
      id: 'id', // serial PRIMARY KEY
      user_id: {
        type: 'integer',
        notNull: true,
        references: 'users(id)',
        onDelete: 'CASCADE',
      },
      name: {
        type: 'varchar(255)',
        notNull: true,
      },
      age: {
        type: 'integer',
        notNull: true,
        check: 'age >= 0 AND age <= 150',
      },
      gender: {
        type: 'varchar(50)',
        notNull: false,
      },
      address: {
        type: 'text',
        notNull: false,
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

  // Index on user_id to accelerate tenant-isolated patient queries
  pgm.createIndex('patients', 'user_id', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('patients', { ifExists: true });
};
