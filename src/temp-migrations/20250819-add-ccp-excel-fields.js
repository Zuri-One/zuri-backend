'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if columns exist before adding them
      const tableDescription = await queryInterface.describeTable('CCPs');
      
      const columnsToAdd = [];
      
      // Add previousFollowupFeedback if it doesn't exist
      if (!tableDescription.previousFollowupFeedback) {
        columnsToAdd.push({
          name: 'previousFollowupFeedback',
          definition: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Previous month followup feedback'
          }
        });
      }
      
      // Add labTestsPerformed if it doesn't exist
      if (!tableDescription.labTestsPerformed) {
        columnsToAdd.push({
          name: 'labTestsPerformed',
          definition: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: 'Lab tests performed during followup'
          }
        });
      }
      
      // Add medicationsPrescribed if it doesn't exist
      if (!tableDescription.medicationsPrescribed) {
        columnsToAdd.push({
          name: 'medicationsPrescribed',
          definition: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: 'Medications prescribed during followup'
          }
        });
      }
      
      // Add medicationDispenseStatus if it doesn't exist
      if (!tableDescription.medicationDispenseStatus) {
        columnsToAdd.push({
          name: 'medicationDispenseStatus',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Status of medication dispensing'
          }
        });
      }
      
      // Add refillFrequency if it doesn't exist
      if (!tableDescription.refillFrequency) {
        columnsToAdd.push({
          name: 'refillFrequency',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Medication refill frequency'
          }
        });
      }
      
      // Add nextRefillDate if it doesn't exist
      if (!tableDescription.nextRefillDate) {
        columnsToAdd.push({
          name: 'nextRefillDate',
          definition: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Next medication refill date'
          }
        });
      }
      
      // Add all missing columns
      for (const column of columnsToAdd) {
        await queryInterface.addColumn('CCPs', column.name, column.definition, { transaction });
        console.log(`Added column: ${column.name}`);
      }
      
      await transaction.commit();
      console.log('CCP Excel fields migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const columnsToRemove = [
        'previousFollowupFeedback',
        'labTestsPerformed',
        'medicationsPrescribed',
        'medicationDispenseStatus',
        'refillFrequency',
        'nextRefillDate'
      ];
      
      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('CCPs', column, { transaction });
          console.log(`Removed column: ${column}`);
        } catch (error) {
          console.log(`Column ${column} doesn't exist, skipping removal`);
        }
      }
      
      await transaction.commit();
      console.log('CCP Excel fields rollback completed');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};