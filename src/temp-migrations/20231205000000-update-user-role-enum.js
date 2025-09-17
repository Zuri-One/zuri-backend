'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Get all enum types in the database
      const [enumTypes] = await queryInterface.sequelize.query(`
        SELECT t.typname as enum_name,
               array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        GROUP BY t.typname;
      `);

      console.log('Found enum types:', enumTypes);

      // After seeing what enums exist, we can create a new enum if needed
      if (enumTypes.length === 0 || !enumTypes.some(e => e.enum_name.toLowerCase().includes('role'))) {
        // Create a new enum type with all our values
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Users_role') THEN
              CREATE TYPE "enum_Users_role" AS ENUM (
                'ADMIN',
                'DOCTOR',
                'NURSE',
                'RECEPTIONIST',
                'LAB_TECHNICIAN',
                'PHARMACIST',
                'RADIOLOGIST',
                'PHYSIOTHERAPIST',
                'CARDIOLOGIST',
                'NEUROLOGIST',
                'PEDIATRICIAN',
                'PSYCHIATRIST',
                'SURGEON',
                'ANESTHESIOLOGIST',
                'EMERGENCY_PHYSICIAN',
                'PATIENT',
                'WARD_MANAGER',
                'BILLING_STAFF'
              );
            END IF;
          END
          $$;
        `);
        
        console.log('Created new enum type');
      }
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // We don't want to drop the enum type as it might be in use
    console.log('Skipping down migration');
  }
};