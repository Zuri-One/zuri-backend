// src/models/appointment.model.js
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Appointment extends Model {}

Appointment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  dateTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('in-person', 'video'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  meetingLink: {
    type: DataTypes.STRING
  },
  cancelledById: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  cancelReason: {
    type: DataTypes.TEXT
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'refunded'),
    defaultValue: 'pending'
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(10, 2)
  }
}, {
  sequelize,
  modelName: 'Appointment',
  timestamps: true,
  indexes: [
    {
      fields: ['patientId', 'dateTime']
    },
    {
      fields: ['doctorId', 'dateTime']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Appointment;