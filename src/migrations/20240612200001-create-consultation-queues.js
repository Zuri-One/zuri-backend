'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ConsultationQueues', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      // Core References
      triageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Triages',
          key: 'id'
        }
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      departmentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Departments',
          key: 'id'
        }
      },
      doctorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      // Queue Management
      queueNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      tokenNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '0: Normal, 1: High, 2: Urgent, 3: Emergency'
      },
      status: {
        type: Sequelize.ENUM(
          'WAITING',
          'CALLED',
          'IN_PROGRESS',
          'COMPLETED',
          'CANCELLED',
          'NO_SHOW',
          'RESCHEDULED',
          'ON_HOLD'
        ),
        defaultValue: 'WAITING'
      },
      // Timing Information
      checkInTime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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
      waitingTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Waiting time in minutes'
      },
      consultationDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Actual consultation duration in minutes'
      },
      // Patient Information
      patientCondition: {
        type: Sequelize.JSONB,
        defaultValue: {
          triageCategory: null,
          vitalSigns: {},
          primaryComplaint: '',
          urgencyLevel: ''
        }
      },
      // Consultation Details
      consultationType: {
        type: Sequelize.STRING,
        defaultValue: 'REGULAR',
        comment: 'REGULAR, FOLLOW_UP, EMERGENCY, SPECIALIST'
      },
      consultationRoom: {
        type: Sequelize.STRING,
        allowNull: true
      },
      // Notes and Communication
      notes: {
        type: Sequelize.JSONB,
        defaultValue: {
          triageNotes: '',
          nurseNotes: '',
          specialInstructions: '',
          patientRequirements: []
        }
      },
      // Status Updates
      statusHistory: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Array of status changes with timestamp and user'
      },
      // Notification Management
      notifications: {
        type: Sequelize.JSONB,
        defaultValue: {
          notified: false,
          lastNotification: null,
          notificationCount: 0,
          notificationMethods: []
        }
      },
      // Queue Analytics
      metrics: {
        type: Sequelize.JSONB,
        defaultValue: {
          expectedDuration: 0,
          delayFactor: 0,
          priorityChanges: 0
        }
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      // Tracking
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('ConsultationQueues', ['patientId']);
    await queryInterface.addIndex('ConsultationQueues', ['doctorId']);
    await queryInterface.addIndex('ConsultationQueues', ['departmentId']);
    await queryInterface.addIndex('ConsultationQueues', ['status']);
    await queryInterface.addIndex('ConsultationQueues', ['priority']);
    await queryInterface.addIndex('ConsultationQueues', ['estimatedStartTime']);
    await queryInterface.addIndex('ConsultationQueues', ['tokenNumber']);
    await queryInterface.addIndex('ConsultationQueues', ['checkInTime']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ConsultationQueues');
  }
};