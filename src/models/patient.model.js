const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

class Patient extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Personal Information
    surname: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Required'
    },
    otherNames: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Required'
    },
    sex: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['MALE', 'FEMALE', 'OTHER']]
      },
      comment: 'Required'
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Required'
    },
    nationality: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Required'
    },
    occupation: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional'
    },

    // Contact Information
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
        isEmailValid(value) {
          if (value !== null && value !== undefined && !validator.isEmail(value)) {
            throw new Error('Invalid email format');
          }
        }
      },
      comment: 'Optional'
    },
    telephone1: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Required - Primary contact number'
    },
    telephone2: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional - Secondary contact number'
    },
    postalAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional'
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional'
    },
    town: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Required'
    },
    residence: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Required - Area of residence'
    },

    isCCPEnrolled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indicates if patient is enrolled in Chronic Care Program'
    },
    
    // Optional: You might want to add enrollment date too
    ccpEnrollmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when patient was enrolled in CCP'
    },
    // Authentication
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        passwordLength(value) {
          if (value !== null && value !== undefined && (value.length < 8 || value.length > 100)) {
            throw new Error('Password must be between 8 and 100 characters long');
          }
        }
      }
    },

    // Identification
    idType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['NATIONAL_ID', 'BIRTH_CERTIFICATE', 'PASSPORT', 'DRIVING_LICENSE', 
                'STUDENT_ID', 'MILITARY_ID', 'ALIEN_ID']]
      },
      comment: 'Required - Type of ID document'
    },
    idNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional - ID document number'
    },
    patientNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },

    // Emergency Contact
    nextOfKin: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      validate: {
        validateIfExists(value) {
          // Only validate if the object is not empty
          if (value && Object.keys(value).length > 0) {
            // If any of the fields exist, ensure the core fields are present
            if ((value.name || value.relationship || value.contact) && 
                (!value.name || !value.relationship || !value.contact)) {
              throw new Error('If next of kin information is provided, name, relationship and contact number are all required');
            }
          }
        }
      },
      comment: 'Optional - Next of kin details'
    },

    // Medical Information
    medicalHistory: {
      type: DataTypes.JSONB,
      defaultValue: {
        existingConditions: [],
        allergies: []
      },
      allowNull: true
    },

    // Insurance Information
    insuranceInfo: {
      type: DataTypes.JSONB,
      defaultValue: {
        scheme: null,
        provider: null,
        membershipNumber: null,
        principalMember: null
      },
      allowNull: true
    },

    // Status Management
    isEmergency: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Required - Indicates if this is an emergency case'
    },
    isRevisit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Changes to true after first visit/discharge'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'WAITING',
      validate: {
        isIn: [['WAITING', 'IN_TRIAGE', 'IN_CONSULTATION', 'IN_LABORATORY',
                'IN_RADIOLOGY', 'IN_PHARMACY', 'IN_PROCEDURE', 'IN_WARD',
                'IN_SURGERY', 'DISCHARGED', 'REFERRED', 'DID_NOT_WAIT', 'CANCELLED', 'TRANSFERRED']]
      },
      comment: 'Required - Tracks current stage of patient visit'
    },
    registrationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional - Notes made during registration'
    },
    
    // Payment Information
    paymentScheme: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        type: 'CASH',
        provider: null,
        policyNumber: null,
        memberNumber: null
      },
      validate: {
        hasRequiredFields(value) {
          if (!value.type) {
            throw new Error('Payment scheme type is required');
          }
          // Member number validation removed to make it optional
          if (value.type !== 'CASH' && (!value.provider)) {
            throw new Error('Insurance provider is required for insurance payments');
          }
        }
      },
      comment: 'Required - Payment scheme details (type and provider for insurance, member number optional)'
    },

    // Account Status and Security
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailVerificationCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    registrationId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    }
  };

  async comparePassword(candidatePassword) {
    try {
      const isMatch = await bcrypt.compare(candidatePassword, this.password);
      return isMatch;
    } catch (error) {
      console.error('Password comparison error:', error.message);
      return false;
    }
  }

  generateAuthToken() {
    return jwt.sign(
      { 
        id: this.id,
        role: 'PATIENT'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
  }

  toSafeObject() {
    const { password, resetPasswordToken, emailVerificationToken, ...safeUser } = this.toJSON();
    return safeUser;
  }

  isAccountLocked() {
    return this.lockUntil && this.lockUntil > Date.now();
  }

  async incrementLoginAttempts() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
      this.loginAttempts = 1;
      this.lockUntil = null;
    } else {
      this.loginAttempts += 1;
      if (this.loginAttempts >= 5) {
        this.lockUntil = Date.now() + (60 * 60 * 1000);
      }
    }
    await this.save();
  }

  async resetLoginAttempts() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }

  static associate(models) {
    if (models.Appointment) {
      this.hasMany(models.Appointment, {
        as: 'appointments',
        foreignKey: 'patientId',
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE'
      });
    }
  
    if (models.Prescription) {
      this.hasMany(models.Prescription, {
        as: 'prescriptions',
        foreignKey: 'patientId'
      });
    }
  
    if (models.TestResult) {
      this.hasMany(models.TestResult, {
        as: 'testResults',
        foreignKey: 'patientId'
      });
    }
  
    if (models.Triage) {
      this.hasMany(models.Triage, {
        foreignKey: 'patientId',
        as: 'triageAssessments'
      });
    }
  
    if (models.DepartmentQueue) {
      this.hasMany(models.DepartmentQueue, {
        foreignKey: 'patientId',
        as: 'DepartmentQueues'
      });
    }
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'Patient',
      tableName: 'Patients',
      timestamps: true,
      hooks: {
        beforeValidate: async (patient) => {
          if (patient.sex) {
            patient.sex = patient.sex.toUpperCase();
          }
        },
        beforeSave: async (patient) => {
          if (patient.changed('password') && patient.password) {
            const salt = await bcrypt.genSalt(10);
            patient.password = await bcrypt.hash(patient.password, salt);
          }
        }
      },
      indexes: [
        {
          unique: true,
          fields: ['email']
        },
        {
          unique: true,
          fields: ['telephone1']
        },
        {
          unique: true,
          fields: ['patientNumber']
        },
        {
          fields: ['status']
        },
        {
          fields: ['isActive']
        }
      ]
    });
  }
}

module.exports = Patient;