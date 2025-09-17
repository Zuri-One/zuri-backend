// src/migrations/20241117000000-initial-setup.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Users table
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('PATIENT', 'DOCTOR', 'admin', 'staff'),
        defaultValue: 'PATIENT'
      },
      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      emailVerificationToken: Sequelize.STRING,
      emailVerificationCode: Sequelize.STRING,
      emailVerificationExpires: Sequelize.DATE,
      resetPasswordToken: Sequelize.STRING,
      resetPasswordExpires: Sequelize.DATE,
      twoFactorSecret: Sequelize.STRING,
      twoFactorEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      lastLogin: Sequelize.DATE,
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      loginAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lockUntil: Sequelize.DATE,
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.createTable('DoctorProfiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        unique: true
      },
      specialization: {
        type: Sequelize.STRING,
        allowNull: false
      },
      licenseNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      qualifications: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      experience: {
        type: Sequelize.INTEGER
      },
      consultationFee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      bio: {
        type: Sequelize.TEXT
      },
      languagesSpoken: {
        type: Sequelize.JSONB,
        defaultValue: ['English']
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      totalReviews: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      isAvailableForVideo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });


    // Appointments table
    await queryInterface.createTable('Appointments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      patientId: {
        type: Sequelize.UUID,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      doctorId: {
        type: Sequelize.UUID,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      dateTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('in-person', 'video'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
        defaultValue: 'pending'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      notes: Sequelize.TEXT,
      meetingLink: Sequelize.STRING,
      cancelledById: {
        type: Sequelize.UUID,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      cancelReason: Sequelize.TEXT,
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // DoctorAvailability table
    await queryInterface.createTable('DoctorAvailabilities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      doctorId: {
        type: Sequelize.UUID,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        unique: true
      },
      weeklySchedule: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      exceptions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      defaultSlotDuration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      bufferTime: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      maxDailyAppointments: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 16
      },
      isAcceptingAppointments: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      lastUpdated: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('Users', ['email']);
    await queryInterface.addIndex('DoctorProfiles', ['userId']);
    await queryInterface.addIndex('DoctorProfiles', ['licenseNumber']);
    await queryInterface.addIndex('Appointments', ['patientId', 'dateTime']);
    await queryInterface.addIndex('Appointments', ['doctorId', 'dateTime']);
    await queryInterface.addIndex('Appointments', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DoctorAvailabilities');
    await queryInterface.dropTable('Appointments');
    await queryInterface.dropTable('DoctorProfiles');
    await queryInterface.dropTable('Users');
  }
};