// src/migrations/[timestamp]-fix-appointments-schema.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if endTime column exists
      const tableInfo = await queryInterface.describeTable('Appointments');
      
      // Drop columns if they exist
      if (tableInfo.endTime) {
        await queryInterface.removeColumn('Appointments', 'endTime');
      }

      // Add new columns
      const columns = ['symptoms', 'diagnosis', 'prescription'];
      for (const column of columns) {
        if (!tableInfo[column]) {
          await queryInterface.addColumn('Appointments', column, {
            type: Sequelize.JSONB,
            defaultValue: []
          });
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove added columns
      await queryInterface.removeColumn('Appointments', 'symptoms');
      await queryInterface.removeColumn('Appointments', 'diagnosis');
      await queryInterface.removeColumn('Appointments', 'prescription');

      // Add back endTime if needed
      await queryInterface.addColumn('Appointments', 'endTime', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};