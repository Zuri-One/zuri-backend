// src/models/appointment.model.js
const { Model, DataTypes } = require('sequelize');

class Appointment extends Model {
  static schema = {
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
      type: DataTypes.ENUM(
        'pending', 
        'confirmed', 
        'in-progress',
        'completed', 
        'cancelled',
        'no-show'
      ),
      defaultValue: 'pending'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    symptoms: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT
    },
    diagnosis: {
      type: DataTypes.TEXT
    },
    prescription: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    meetingLink: {
      type: DataTypes.STRING
    },
    meetingId: {
      type: DataTypes.STRING
    },
    meetingPassword: {
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
  };

  static associate(models) {
    this.belongsTo(models.User, { 
      as: 'patient',
      foreignKey: 'patientId'
    });
    this.belongsTo(models.User, { 
      as: 'doctor',
      foreignKey: 'doctorId'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'Appointment',
      tableName: 'Appointments',
      timestamps: true
    });
  }
}

module.exports = Appointment;