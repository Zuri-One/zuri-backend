// src/models/doctor-availability.model.js
const { Model, DataTypes } = require('sequelize');

class DoctorAvailability extends Model {
  static schema = {
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
    // Regular weekly schedule
    weeklySchedule: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidSchedule(value) {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const required = ['startTime', 'endTime', 'isAvailable', 'slotDuration'];
          
          if (typeof value !== 'object') throw new Error('Weekly schedule must be an object');
          
          Object.keys(value).forEach(day => {
            if (!days.includes(day.toLowerCase())) {
              throw new Error(`Invalid day: ${day}`);
            }
            
            if (!Array.isArray(value[day])) {
              throw new Error(`Schedule for ${day} must be an array`);
            }

            value[day].forEach(slot => {
              required.forEach(field => {
                if (!(field in slot)) {
                  throw new Error(`Missing required field "${field}" in slot`);
                }
              });
            });
          });
        }
      }
    },
    // Special dates (holidays, time off, etc.)
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
    },
    // Default appointment duration in minutes
    defaultSlotDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    // Buffer time between appointments in minutes
    bufferTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5
    },
    // Maximum number of appointments per day
    maxDailyAppointments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20
    },
    // Whether the doctor is currently accepting new appointments
    isAcceptingAppointments: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  };

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'doctorId' });
  }
}

module.exports = DoctorAvailability;