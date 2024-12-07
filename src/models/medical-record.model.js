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
        model: 'Users',
        key: 'id'
      }
    },
    visitType: {
      type: DataTypes.ENUM('ROUTINE', 'FOLLOW_UP', 'EMERGENCY', 'SPECIALIST', 'PROCEDURE'),
      allowNull: false
    },
    visitDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    practitionerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Departments',
        key: 'id'
      }
    },
    chiefComplaint: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    presentIllness: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vitalSigns: {
      type: DataTypes.JSONB,
      allowNull: false,
      // Structure: {
      //   bloodPressure: { systolic: number, diastolic: number },
      //   temperature: { value: number, unit: string },
      //   heartRate: number,
      //   respiratoryRate: number,
      //   oxygenSaturation: number,
      //   weight: { value: number, unit: string },
      //   height: { value: number, unit: string },
      //   bmi: number
      // }
    },
    physicalExamination: {
      type: DataTypes.JSONB,
      allowNull: true,
      // Structure: {
      //   general: string,
      //   cardiovascular: string,
      //   respiratory: string,
      //   gastrointestinal: string,
      //   musculoskeletal: string,
      //   neurological: string,
      //   ...other systems
      // }
    },
    diagnoses: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of: {
      //   code: string (ICD-10),
      //   description: string,
      //   type: 'PRIMARY' | 'SECONDARY',
      //   status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC'
      // }
    },
    procedures: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of performed procedures with details
    },
    medications: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of prescribed medications
    },
    allergies: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of documented allergies
    },
    labOrders: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of ordered lab tests
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of attached documents/images
    },
    treatmentPlan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    followUpPlan: {
      type: DataTypes.JSONB,
      allowNull: true,
      // Structure: {
      //   scheduledDate: date,
      //   instructions: string,
      //   withDoctor: UUID,
      //   department: UUID
      // }
    },
    referrals: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of specialist referrals
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'FINALIZED', 'AMENDED'),
      defaultValue: 'DRAFT'
    },
    amendmentHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of amendments with dates and users
    },
    confidentialityLevel: {
      type: DataTypes.ENUM('NORMAL', 'SENSITIVE', 'HIGHLY_RESTRICTED'),
      defaultValue: 'NORMAL'
    },
    accessLog: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Array of access records with timestamp and user
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  };

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'PATIENT'
    });
    this.belongsTo(models.User, {
      foreignKey: 'practitionerId',
      as: 'practitioner'
    });
    this.belongsTo(models.Department, {
      foreignKey: 'departmentId'
    });
    this.hasMany(models.ProgressNote, {
      foreignKey: 'medicalRecordId'
    });
    this.hasMany(models.Consent, {
      foreignKey: 'medicalRecordId'
    });
  }

  // Instance methods for common operations
  async addProgressNote(note, userId) {
    return await this.createProgressNote({
      content: note,
      createdBy: userId,
      timestamp: new Date()
    });
  }

  async logAccess(userId, action) {
    this.accessLog.push({
      userId,
      action,
      timestamp: new Date()
    });
    await this.save();
  }

  async addAmendment(amendment, userId) {
    this.amendmentHistory.push({
      ...amendment,
      amendedBy: userId,
      timestamp: new Date()
    });
    await this.save();
  }

  // Calculate BMI from vital signs
  calculateBMI() {
    const { weight, height } = this.vitalSigns;
    if (!weight?.value || !height?.value) return null;

    const heightInMeters = height.unit === 'm' ? height.value : height.value / 100;
    const weightInKg = weight.unit === 'kg' ? weight.value : weight.value * 0.453592;

    return (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
  }
}

module.exports = MedicalRecord;