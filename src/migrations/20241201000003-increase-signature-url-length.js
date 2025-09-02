'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Users', 'signatureUrl', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'GCP Storage URL for user signature (can be long signed URL)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Users', 'signatureUrl', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'GCP Storage URL for user signature'
    });
  }
};