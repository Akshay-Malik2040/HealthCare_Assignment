/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Phase 2 Migration: Create users table with constraints
 */
exports.up = (pgm) => {
  pgm.createTable(
    'users',
    {
      id: 'id', // generates serial PRIMARY KEY
      name: {
        type: 'varchar(255)',
        notNull: true,
      },
      email: {
        type: 'varchar(255)',
        notNull: true,
        unique: true,
      },
      password_hash: {
        type: 'varchar(255)',
        notNull: true,
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

  // Create an explicit index on normalized email for rapid query lookup
  pgm.createIndex('users', 'email', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('users', { ifExists: true });
};
