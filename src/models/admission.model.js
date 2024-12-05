// models/admission.model.js
const { Model, DataTypes } = require('sequelize');

class Admission extends Model {
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
    admissionType: {
      type: DataTypes.ENUM('INPATIENT', 'OUTPATIENT', 'EMERGENCY', 'DAY_CARE'),
      allowNull: false
    },
    admittingDoctorId: {
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
    wardId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Wards',
        key: 'id'
      }
    },
    bedId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Beds',
        key: 'id'
      }
    },
    admissionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dischargeDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expectedDischargeDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'ADMITTED',
        'DISCHARGED',
        'TRANSFERRED',
        'LEFT_AGAINST_ADVICE',
        'DECEASED'
      ),
      defaultValue: 'PENDING'
    },
    chiefComplaint: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    provisionalDiagnosis: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    admissionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      allowNull: false
      // Structure: {
      //   name: string,
      //   relationship: string,
      //   phone: string,
      //   address: string
      // }
    },
    insuranceInfo: {
      type: DataTypes.JSONB,
      allowNull: true
      // Structure: {
      //   provider: string,
      //   policyNumber: string,
      //   validUntil: date,
      //   coverageDetails: object
      // }
    },
    isEmergency: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    triageCategory: {
      type: DataTypes.ENUM('RED', 'YELLOW', 'GREEN', 'BLACK'),
      allowNull: true
    },
    triageNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transferHistory: {
      type: DataTypes.JSONB,
      defaultValue: []
      // Structure: [{
      //   fromDepartment: string,
      //   toDepartment: string,
      //   date: date,
      //   reason: string,
      //   authorizedBy: uuid
      // }]
    },
    vitalSigns: {
      type: DataTypes.JSONB,
      allowNull: true
      // Structure: {
      //   bloodPressure: string,
      //   temperature: number,
      //   pulseRate: number,
      //   respiratoryRate: number,
      //   oxygenSaturation: number,
      //   consciousness: string
      // }
    }
  };

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    this.belongsTo(models.User, {
      foreignKey: 'admittingDoctorId',
      as: 'admittingDoctor'
    });
    this.belongsTo(models.Department, {
      foreignKey: 'departmentId'
    });
    this.belongsTo(models.Ward, {
      foreignKey: 'wardId'
    });
    this.belongsTo(models.Bed, {
      foreignKey: 'bedId'
    });
    this.hasMany(models.AdmissionNote, {
      foreignKey: 'admissionId'
    });
  }
}

module.exports = Admission;