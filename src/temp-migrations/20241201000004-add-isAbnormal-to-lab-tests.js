'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('LabTests', 'isAbnormal', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if test results are abnormal'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('LabTests', 'isAbnormal');
  }
};