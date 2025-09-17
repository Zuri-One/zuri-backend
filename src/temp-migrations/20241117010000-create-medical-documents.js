// src/migrations/YYYYMMDDHHMMSS-create-medical-documents.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First create the ENUM type
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_medical_documents_category AS ENUM (
        'GENERAL',
        'SCANS',
        'PRESCRIPTIONS',
        'LAB_RESULTS',
        'INSURANCE',
        'RECEIPTS',
        'REPORTS',
        'OTHER'
      );
    `).catch(err => {
      // Ignore error if ENUM already exists
      if (err.original.code !== '42710') throw err;
    });

    await queryInterface.createTable('medical_documents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      uploaded_by_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      category: {
        type: 'enum_medical_documents_category',
        allowNull: false
      },
      document_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_key: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      content_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      is_archived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('medical_documents', ['patient_id']);
    await queryInterface.addIndex('medical_documents', ['uploaded_by_id']);
    await queryInterface.addIndex('medical_documents', ['category']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('medical_documents');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_medical_documents_category;');
  }
};