'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'signatureUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'GCP Storage URL for user signature'
    });

    await queryInterface.addColumn('Users', 'signatureFileName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Original filename of signature'
    });

    await queryInterface.addColumn('Users', 'signatureUploadedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when signature was uploaded'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'signatureUrl');
    await queryInterface.removeColumn('Users', 'signatureFileName');
    await queryInterface.removeColumn('Users', 'signatureUploadedAt');
  }
};