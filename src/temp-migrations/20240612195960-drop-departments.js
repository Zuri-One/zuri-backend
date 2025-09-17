'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "departments_code";
      DROP INDEX IF EXISTS "departments_type";
      DROP INDEX IF EXISTS "departments_status";
      DROP INDEX IF EXISTS "departments_isactive";
    `);

    // Drop the table if it exists
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "Departments" CASCADE;');
    
    // Drop the ENUMs if they exist
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS "enum_Departments_type" CASCADE;
        DROP TYPE IF EXISTS "enum_Departments_status" CASCADE;
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // No down migration needed as the next migration will recreate the table
  }
};