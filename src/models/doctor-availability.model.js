// src/models/doctor-availability.model.js
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class DoctorAvailability extends Model {}

DoctorAvailability.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    unique: true
  },
  // Store slots as JSONB for flexibility
  slots: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    validate: {
      isValidSlots(value) {
        if (!Array.isArray(value)) {
          throw new Error('Slots must be an array');
        }
        value.forEach(slot => {
          if (!slot.day || !slot.startTime || !slot.endTime) {
            throw new Error('Each slot must have day, startTime, and endTime');
          }
          if (!['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(slot.day.toLowerCase())) {
            throw new Error('Invalid day in slot');
          }
        });
      }
    }
  },
  // Store exceptions as JSONB
  exceptions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    validate: {
      isValidExceptions(value) {
        if (!Array.isArray(value)) {
          throw new Error('Exceptions must be an array');
        }
        value.forEach(exception => {
          if (!exception.date || typeof exception.isAvailable !== 'boolean') {
            throw new Error('Each exception must have date and isAvailable');
          }
        });
      }
    }
  }
}, {
  sequelize,
  modelName: 'DoctorAvailability',
  timestamps: true
});

module.exports = DoctorAvailability;