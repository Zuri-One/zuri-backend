// models/examination.model.js
const { Model, DataTypes } = require('sequelize');

class Examination extends Model {
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
    triageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Triages',
        key: 'id'
      }
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    examinationDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    
    // General Examinations
    generalExamination: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        hasRequiredFields(value) {
          const required = [
            'temperature',
            'bloodPressure',
            'weight',
            'height',
            'bmi',
            'pulseRate',
            'spo2'
          ];
          for (const field of required) {
            if (!value[field]) {
              throw new Error(`${field} is required in general examination`);
            }
          }
        }
      }
    },
    
    // Systemic Examinations
    systemicExaminations: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      // Array of: {
      //   bodySystem: string,
      //   remarks: string,
      //   isAnomalous: boolean
      // }
    },
    
    // Procedures
    proceduresPerformed: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      // Array of: {
      //   procedureId: string,
      //   procedureName: string,
      //   remarks: string,
      //   performedAt: datetime
      // }
    },
    
    nursingNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  };

  static associate(models) {
    this.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    
    this.belongsTo(models.Triage, {
      foreignKey: 'triageId',
      as: 'triage'
    });
    
    this.belongsTo(models.User, {
      foreignKey: 'performedBy',
      as: 'examiner'
    });
  }
}

module.exports = Examination;