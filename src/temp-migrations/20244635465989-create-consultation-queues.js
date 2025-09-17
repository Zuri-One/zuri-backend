// migrations/[timestamp]-create-consultation-queues.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('consultation_queues', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      triageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Triages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      departmentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      doctorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      queueNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
        defaultValue: 'WAITING'
      },
      estimatedStartTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      actualStartTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completionTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('consultation_queues', ['departmentId', 'status']);
    await queryInterface.addIndex('consultation_queues', ['doctorId', 'status']);
    await queryInterface.addIndex('consultation_queues', ['patientId']);
    await queryInterface.addIndex('consultation_queues', ['queueNumber']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('consultation_queues');
  }
};