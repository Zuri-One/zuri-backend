'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Create ENUM types with exact case matching
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_Departments_type" AS ENUM(
            'CLINICAL', 
            'NON_CLINICAL', 
            'ADMINISTRATIVE', 
            'EMERGENCY',
            'DIAGNOSTIC',
            'THERAPEUTIC',
            'SUPPORT'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_Departments_status" AS ENUM(
            'ACTIVE',
            'INACTIVE',
            'MAINTENANCE',
            'EMERGENCY_ONLY'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Drop any existing indexes
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "departments_code";
        DROP INDEX IF EXISTS "departments_type";
        DROP INDEX IF EXISTS "departments_status";
        DROP INDEX IF EXISTS "departments_isactive";
      `);

      // Create the Departments table
      await queryInterface.createTable('Departments', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        type: {
          type: Sequelize.ENUM(
            'CLINICAL', 
            'NON_CLINICAL', 
            'ADMINISTRATIVE', 
            'EMERGENCY',
            'DIAGNOSTIC',
            'THERAPEUTIC',
            'SUPPORT'
          ),
          defaultValue: 'CLINICAL'
        },
        status: {
          type: Sequelize.ENUM(
            'ACTIVE',
            'INACTIVE',
            'MAINTENANCE',
            'EMERGENCY_ONLY'
          ),
          defaultValue: 'ACTIVE'
        },
        specialties: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          defaultValue: []
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        location: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {
            building: '',
            floor: '',
            wing: '',
            roomNumbers: [],
            waitingArea: '',
            nursingStation: ''
          }
        },
        operatingHours: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {}
        },
        capacity: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        contactInfo: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        metrics: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        appointmentSettings: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      });

      // Create indexes
      await queryInterface.addIndex('Departments', ['code'], { name: 'departments_code' });
      await queryInterface.addIndex('Departments', ['type'], { name: 'departments_type' });
      await queryInterface.addIndex('Departments', ['status'], { name: 'departments_status' });
      await queryInterface.addIndex('Departments', ['isActive'], { name: 'departments_isactive' });

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Departments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Departments_type" CASCADE;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Departments_status" CASCADE;');
  }
};