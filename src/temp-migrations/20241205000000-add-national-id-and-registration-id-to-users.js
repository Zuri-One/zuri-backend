'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      try {
        // Add nationalId column
        await queryInterface.addColumn(
          'Users',
          'nationalId',
          {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true,
            after: 'email' // Place after email column
          },
          { transaction }
        );

        // Add registrationId column
        await queryInterface.addColumn(
          'Users',
          'registrationId',
          {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true,
            after: 'nationalId' // Place after nationalId column
          },
          { transaction }
        );

        // Add indexes for better query performance
        await queryInterface.addIndex(
          'Users',
          ['nationalId'],
          {
            name: 'users_national_id_idx',
            unique: true,
            transaction
          }
        );

        await queryInterface.addIndex(
          'Users',
          ['registrationId'],
          {
            name: 'users_registration_id_idx',
            unique: true,
            transaction
          }
        );

      } catch (error) {
        console.error('Migration Error:', error);
        throw error;
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      try {
        // Remove indexes first
        await queryInterface.removeIndex('Users', 'users_national_id_idx', { transaction });
        await queryInterface.removeIndex('Users', 'users_registration_id_idx', { transaction });

        // Remove columns
        await queryInterface.removeColumn('Users', 'nationalId', { transaction });
        await queryInterface.removeColumn('Users', 'registrationId', { transaction });
      } catch (error) {
        console.error('Migration Rollback Error:', error);
        throw error;
      }
    });
  }
};