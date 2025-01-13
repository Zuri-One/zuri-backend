'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add new columns
      await queryInterface.addColumn('Users', 'surname', {
        type: Sequelize.STRING,
        allowNull: true, // temporarily true for existing records
      }, { transaction });

      await queryInterface.addColumn('Users', 'otherNames', {
        type: Sequelize.STRING,
        allowNull: true, // temporarily true for existing records
      }, { transaction });

      await queryInterface.addColumn('Users', 'telephone1', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'telephone2', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'postalAddress', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'postalCode', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'occupation', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'idType', {
        type: Sequelize.ENUM('NATIONAL_ID', 'PASSPORT', 'MILITARY_ID', 'ALIEN_ID'),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'idNumber', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'nationality', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'town', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'areaOfResidence', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'nextOfKin', {
        type: Sequelize.JSONB,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Users', 'patientNumber', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      }, { transaction });

      // Add index for patientNumber
      await queryInterface.addIndex('Users', ['patientNumber'], {
        unique: true,
        transaction
      });

      // Update the existing ENUM type for 'status' if needed
      await queryInterface.changeColumn('Users', 'status', {
        type: Sequelize.ENUM('active', 'suspended', 'on_leave', 'terminated'),
        defaultValue: 'active'
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove columns in reverse order
      await queryInterface.removeColumn('Users', 'patientNumber', { transaction });
      await queryInterface.removeColumn('Users', 'nextOfKin', { transaction });
      await queryInterface.removeColumn('Users', 'areaOfResidence', { transaction });
      await queryInterface.removeColumn('Users', 'town', { transaction });
      await queryInterface.removeColumn('Users', 'nationality', { transaction });
      await queryInterface.removeColumn('Users', 'idNumber', { transaction });
      await queryInterface.removeColumn('Users', 'idType', { transaction });
      await queryInterface.removeColumn('Users', 'occupation', { transaction });
      await queryInterface.removeColumn('Users', 'postalCode', { transaction });
      await queryInterface.removeColumn('Users', 'postalAddress', { transaction });
      await queryInterface.removeColumn('Users', 'telephone2', { transaction });
      await queryInterface.removeColumn('Users', 'telephone1', { transaction });
      await queryInterface.removeColumn('Users', 'otherNames', { transaction });
      await queryInterface.removeColumn('Users', 'surname', { transaction });

      // Remove the ENUM type for idType
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_idType";', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};