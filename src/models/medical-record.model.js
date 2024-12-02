// src/models/medical-record.model.js
const { Model, DataTypes } = require('sequelize');

class MedicalRecord extends Model {
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
    visitDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    chiefComplaint: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    vitalSigns: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    symptoms: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    treatment: {
      type: DataTypes.TEXT
    },
    notes: {
      type: DataTypes.TEXT
    },
    attachments: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      defaultValue: []
    },
    followUpDate: {
      type: DataTypes.DATE
    },
    status: {
      type: DataTypes.ENUM('draft', 'final'),
      defaultValue: 'draft'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  };

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    this.belongsTo(models.User, {
      foreignKey: 'doctorId',
      as: 'doctor'
    });
  }
}

module.exports = MedicalRecord;