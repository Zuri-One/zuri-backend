// models/medical-record.model.js
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
        model: 'Patients',
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
    queueEntryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'DepartmentQueues',
        key: 'id'
      }
    },
    complaints: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    hpi: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'History of Presenting Illness'
    },
    medicalHistory: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    familySocialHistory: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    impressions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ACTIVE',
      validate: {
        isIn: [['ACTIVE', 'ARCHIVED']]
      }
    }
  };

  static associate(models) {
    this.belongsTo(models.Patient, {
      foreignKey: 'patientId'
    });
    this.belongsTo(models.User, {
      foreignKey: 'doctorId',
      as: 'doctor'
    });
    this.belongsTo(models.DepartmentQueue, {
      foreignKey: 'queueEntryId'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'MedicalRecord',
      tableName: 'MedicalRecords',
      timestamps: true
    });
  }
}

module.exports = MedicalRecord;