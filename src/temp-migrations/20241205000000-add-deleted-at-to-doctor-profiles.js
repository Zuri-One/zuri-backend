// YYYYMMDDHHMMSS-add-deleted-at-to-doctor-profiles.js
// Example filename: 20241205000000-add-deleted-at-to-doctor-profiles.js

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('DoctorProfiles', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        after: 'updatedAt' // This will add the column after updatedAt
      });

      // Add an index to improve soft delete query performance
      await queryInterface.addIndex('DoctorProfiles', ['deletedAt'], {
        name: 'idx_doctor_profiles_deleted_at'
      });

      console.log('Successfully added deletedAt column to DoctorProfiles');
    } catch (error) {
      console.error('Error adding deletedAt column:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // First remove the index
      await queryInterface.removeIndex('DoctorProfiles', 'idx_doctor_profiles_deleted_at');
      
      // Then remove the column
      await queryInterface.removeColumn('DoctorProfiles', 'deletedAt');

      console.log('Successfully removed deletedAt column from DoctorProfiles');
    } catch (error) {
      console.error('Error removing deletedAt column:', error);
      throw error;
    }
  }
};