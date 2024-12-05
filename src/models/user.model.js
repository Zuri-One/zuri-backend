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
        'PATIENT',
        'WARD_MANAGER',
        'BILLING_STAFF'
      ),
      allowNull: false,
      defaultValue: 'PATIENT'
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
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
    designation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    expertise: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // Structure: {
      //   skills: [],
      //   certifications: [],
      //   specialProcedures: []
      // }
    },
    dutySchedule: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // Structure: {
      //   monday: { shifts: ['MORNING'], hours: '9:00-17:00' }
      // }
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true,
      // Structure: {
      //   name: string,
      //   relationship: string,
      //   phone: string,
      //   address: string
      // }
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
    if (this.role === 'ADMIN') return true;
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
        this.lockUntil = Date.now() + (60 * 60 * 1000); // Lock for 1 hour
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
        as: 'patientPrescriptions',
        foreignKey: 'patientId'
      });

      this.hasMany(models.Prescription, {
        as: 'doctorPrescriptions',
        foreignKey: 'doctorId'
      });
    }

    // TestResult association
    if (models.TestResult) {
      this.hasMany(models.TestResult, {
        as: 'testResults',
        foreignKey: 'patientId'
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