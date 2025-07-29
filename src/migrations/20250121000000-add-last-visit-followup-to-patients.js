'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Patients', 'lastVisit', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date of last medical visit/consultation'
    });

    await queryInterface.addColumn('Patients', 'lastFollowup', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date of last CCP followup completion'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Patients', 'lastVisit');
    await queryInterface.removeColumn('Patients', 'lastFollowup');
  }
};