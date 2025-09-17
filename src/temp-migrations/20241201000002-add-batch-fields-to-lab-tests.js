'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('LabTests', 'batchId', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Groups related tests together'
    });

    await queryInterface.addColumn('LabTests', 'parentTestId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'LabTests',
        key: 'id'
      },
      comment: 'Reference to parent test in batch'
    });

    await queryInterface.addColumn('LabTests', 'isParentTest', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indicates if this is the main test in a batch'
    });

    await queryInterface.addColumn('LabTests', 'sharedSampleId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Shared sample ID for batch tests'
    });

    await queryInterface.addColumn('LabTests', 'batchMetadata', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Additional batch-related metadata'
    });

    // Add index for batch queries
    await queryInterface.addIndex('LabTests', ['batchId'], {
      name: 'idx_lab_tests_batch_id'
    });

    await queryInterface.addIndex('LabTests', ['parentTestId'], {
      name: 'idx_lab_tests_parent_test_id'
    });

    await queryInterface.addIndex('LabTests', ['sharedSampleId'], {
      name: 'idx_lab_tests_shared_sample_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('LabTests', 'idx_lab_tests_batch_id');
    await queryInterface.removeIndex('LabTests', 'idx_lab_tests_parent_test_id');
    await queryInterface.removeIndex('LabTests', 'idx_lab_tests_shared_sample_id');
    
    await queryInterface.removeColumn('LabTests', 'batchId');
    await queryInterface.removeColumn('LabTests', 'parentTestId');
    await queryInterface.removeColumn('LabTests', 'isParentTest');
    await queryInterface.removeColumn('LabTests', 'sharedSampleId');
    await queryInterface.removeColumn('LabTests', 'batchMetadata');
  }
};