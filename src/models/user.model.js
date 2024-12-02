const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class User extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['MALE', 'FEMALE', 'OTHER']]
      }
    },
    bloodGroup: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100]
      }
    },
    role: {
      type: DataTypes.ENUM(
        'patient',
        'doctor',
        'nurse',
        'lab_technician',
        'pharmacist',
        'radiologist',
        'physiotherapist',
        'nutritionist',
        'receptionist',
        'admin',
        'billing_staff',
        'medical_assistant',
        'hospital_admin',
        'ward_manager'
      ),
      allowNull: false,
      defaultValue: 'patient'
    },
    department: {
      type: DataTypes.STRING,
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
    specialization: {
      type: DataTypes.STRING,
      allowNull: true
    },
    qualification: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
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
    workSchedule: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    },
    joiningDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true,
      comment: 'Custom permissions for each role'
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
    doctor: [
      'view_patient_records',
      'create_prescriptions',
      'update_patient_records',
      'schedule_appointments',
      'order_lab_tests',
      'view_lab_results'
    ],
    nurse: [
      'view_patient_records',
      'update_vitals',
      'administer_medication',
      'view_lab_results',
      'manage_ward_patients'
    ],
    lab_technician: [
      'view_lab_orders',
      'create_lab_results',
      'update_lab_results',
      'manage_lab_inventory'
    ],
    pharmacist: [
      'view_prescriptions',
      'dispense_medication',
      'manage_pharmacy_inventory',
      'update_medication_records'
    ],
    radiologist: [
      'view_imaging_orders',
      'create_imaging_results',
      'manage_imaging_equipment'
    ],
    physiotherapist: [
      'view_patient_records',
      'create_therapy_plans',
      'update_therapy_records'
    ],
    nutritionist: [
      'view_patient_records',
      'create_diet_plans',
      'update_nutrition_records'
    ],
    receptionist: [
      'schedule_appointments',
      'register_patients',
      'manage_visitor_logs'
    ],
    admin: ['all'],
    hospital_admin: ['all'],
    billing_staff: [
      'create_invoices',
      'process_payments',
      'manage_insurance_claims'
    ],
    medical_assistant: [
      'view_patient_records',
      'update_vitals',
      'assist_procedures'
    ],
    ward_manager: [
      'manage_ward_staff',
      'manage_ward_resources',
      'view_ward_reports'
    ]
  };

  async hasPermission(permission) {
    if (this.role === 'admin' || this.role === 'hospital_admin') return true;
    const rolePerms = User.rolePermissions[this.role] || [];
    return rolePerms.includes(permission);
  }

  async comparePassword(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  }

  generateAuthToken() {
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
        permissions: User.rolePermissions[this.role] || []
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
  }

  // Helper method to safely get user data without sensitive fields
  toSafeObject() {
    const { password, resetPasswordToken, emailVerificationToken, ...safeUser } = this.toJSON();
    return safeUser;
  }

  // Helper method to check if account is locked
  isAccountLocked() {
    return this.lockUntil && this.lockUntil > Date.now();
  }

  // Helper method to increment login attempts
  async incrementLoginAttempts() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
      this.loginAttempts = 1;
      this.lockUntil = null;
    } else {
      this.loginAttempts += 1;
      if (this.loginAttempts >= 5) {
        this.lockUntil = Date.now() + (60 * 60 * 1000); // Lock for 1 hour
      }
    }
    await this.save();
  }

  // Helper method to reset login attempts
  async resetLoginAttempts() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }

  static associate(models) {
    this.hasMany(models.Appointment, { 
      as: 'patientAppointments',
      foreignKey: 'patientId',
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    });
    
    this.hasMany(models.Appointment, { 
      as: 'doctorAppointments',
      foreignKey: 'doctorId',
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    });
    
    this.hasOne(models.DoctorProfile, {
      foreignKey: 'userId'
    });

    this.hasMany(models.Prescription, {
      as: 'patientPrescriptions',
      foreignKey: 'patientId'
    });

    this.hasMany(models.Prescription, {
      as: 'doctorPrescriptions',
      foreignKey: 'doctorId'
    });

    this.hasMany(models.TestResult, {
      as: 'testResults',
      foreignKey: 'patientId'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      timestamps: true,
      paranoid: true,
      hooks: {
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
          fields: ['department']
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

module.exports = User;