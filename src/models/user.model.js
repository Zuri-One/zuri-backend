const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

class User extends Model {
  static schema = { 
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Personal Information
    surname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    otherNames: {
      type: DataTypes.STRING,
      allowNull: false
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['MALE', 'FEMALE', 'OTHER']]
      }
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: false
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
      }
    },
    telephone1: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telephone2: {
      type: DataTypes.STRING,
      allowNull: true
    },
    postalAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    town: {
      type: DataTypes.STRING,
      allowNull: false
    },
    areaOfResidence: {
      type: DataTypes.STRING,
      allowNull: false
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
        isIn: [['NATIONAL_ID', 'PASSPORT', 'MILITARY_ID', 'ALIEN_ID']]
      }
    },
    idNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    nationality: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // Role and Permissions
    role: {
      type: DataTypes.ENUM(
        'ADMIN',
        'DOCTOR',
        'NURSE',
        'RECEPTIONIST',
        'LAB_TECHNICIAN',
        'PHARMACIST',
        'RADIOLOGIST',
        'PHYSIOTHERAPIST',
        'CARDIOLOGIST',
        'NEUROLOGIST',
        'PEDIATRICIAN',
        'PSYCHIATRIST',
        'SURGEON',
        'ANESTHESIOLOGIST',
        'EMERGENCY_PHYSICIAN',
        'WARD_MANAGER',
        'BILLING_STAFF'
      ),
      allowNull: false
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true,
      comment: 'Custom permissions for each role'
    },

    // Department Information
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    primaryDepartmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    secondaryDepartments: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      allowNull: true
    },

    // Staff Information
    specialization: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: true
    },
    staffId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    qualification: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    expertise: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    },
    dutySchedule: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    },
    workSchedule: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    },
    joiningDate: {
      type: DataTypes.DATE,
      allowNull: true
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
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'on_leave', 'terminated'),
      defaultValue: 'active'
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true
    }
  };

  // Role-based permission checks
  static rolePermissions = {
    DOCTOR: [
      'view_patient_records',
      'create_prescriptions',
      'update_patient_records',
      'schedule_appointments',
      'order_lab_tests',
      'view_lab_results'
    ],
    NURSE: [
      'view_patient_records',
      'update_vitals',
      'administer_medication',
      'view_lab_results',
      'manage_ward_patients'
    ],
    LAB_TECHNICIAN: [
      'view_lab_orders',
      'create_lab_results',
      'update_lab_results',
      'manage_lab_inventory'
    ],
    PHARMACIST: [
      'view_prescriptions',
      'dispense_medication',
      'manage_pharmacy_inventory',
      'update_medication_records'
    ],
    RADIOLOGIST: [
      'view_imaging_orders',
      'create_imaging_results',
      'manage_imaging_equipment'
    ],
    PHYSIOTHERAPIST: [
      'view_patient_records',
      'create_therapy_plans',
      'update_therapy_records'
    ],
    RECEPTIONIST: [
      'schedule_appointments',
      'register_patients',
      'manage_visitor_logs'
    ],
    ADMIN: ['all'],
    WARD_MANAGER: [
      'manage_ward_staff',
      'manage_ward_resources',
      'view_ward_reports'
    ],
    BILLING_STAFF: [
      'create_invoices',
      'process_payments',
      'manage_insurance_claims'
    ]
  };

  async hasPermission(permission) {
    if (this.role.toUpperCase() === 'ADMIN') return true;
    const rolePerms = User.rolePermissions[this.role.toUpperCase()] || [];
    return rolePerms.includes(permission);
  }

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
        role: this.role,
        permissions: User.rolePermissions[this.role.toUpperCase()] || []
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
    // Department associations
    if (models.Department) {
      this.belongsTo(models.Department, {
        foreignKey: 'departmentId',
        as: 'assignedDepartment'
      });
      
      this.belongsTo(models.Department, {
        foreignKey: 'primaryDepartmentId',
        as: 'primaryDepartment'
      });
    }

    // Appointment associations
    if (models.Appointment) {
      this.hasMany(models.Appointment, { 
        as: 'doctorAppointments',
        foreignKey: 'doctorId',
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE'
      });
    }

    // DoctorProfile association
    if (models.DoctorProfile) {
      this.hasOne(models.DoctorProfile, {
        foreignKey: 'userId'
      });
    }

    // Prescription associations
    if (models.Prescription) {
      this.hasMany(models.Prescription, {
        as: 'doctorPrescriptions',
        foreignKey: 'doctorId'
      });
    }

    if (models.Triage) {
      this.hasMany(models.Triage, {
        foreignKey: 'assessedBy',
        as: 'assessedTriages'
      });
    }
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      timestamps: true,
      paranoid: false,
      hooks: {
        beforeValidate: async (user) => {
          if (user.role) {
            user.role = user.role.toUpperCase();
          }
          if (user.gender) {
            user.gender = user.gender.toUpperCase();
          }
        },
        beforeSave: async (user) => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        }
      },
      indexes: [
        {
          unique: true,
          fields: ['email']
        },
        {
          fields: ['role']
        },
        {
          fields: ['employeeId']
        },
        {
          fields: ['status']
        },
        {
          fields: ['isActive']
        },
        {
          fields: ['departmentId']
        },
        {
          fields: ['primaryDepartmentId']
        }
      ]
    });
  }
}

module.exports = User;