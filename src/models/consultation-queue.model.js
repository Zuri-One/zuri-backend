const { Model, DataTypes } = require('sequelize');

class ConsultationQueue extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    triageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Triages',
        key: 'id'
      }
    },
    patientId: {
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
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    queueNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tokenNumber: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '0: Normal, 1: High, 2: Urgent'
    },
    status: {
      type: DataTypes.ENUM(
        'WAITING',
        'WAITING_FOR_DOCTOR',
        'IN_PROGRESS',
        'PENDING_LABS',
        'PENDING_IMAGING',
        'PENDING_PHARMACY',
        'PENDING_BILLING',
        'COMPLETED',
        'CANCELLED'
      ),
      defaultValue: 'WAITING'
    },
    
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    estimatedStartTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    actualStartTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completionTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    waitingTime: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    consultationDuration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    patientCondition: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        vitalSigns: {},
        urgencyLevel: "",
        triageCategory: null,
        primaryComplaint: ""
      }
    },
    consultationType: {
      type: DataTypes.STRING(255),
      defaultValue: 'REGULAR'
    },
    consultationRoom: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        nurseNotes: "",
        triageNotes: "",
        patientRequirements: [],
        specialInstructions: ""
      },
      get() {
        return this.getDataValue('notes');
      },
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('notes', {
            nurseNotes: "",
            triageNotes: value,
            patientRequirements: [],
            specialInstructions: ""
          });
        } else {
          this.setDataValue('notes', value || this.constructor.getAttributes().notes.defaultValue);
        }
      }
    },
    statusHistory: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    notifications: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        notified: false,
        lastNotification: null,
        notificationCount: 0,
        notificationMethods: []
      }
    },
    metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        delayFactor: 0,
        priorityChanges: 0,
        expectedDuration: 0
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      get() {
        const value = this.getDataValue('metadata');
        return value || {};
      },
      set(value) {
        this.setDataValue('metadata', value || {});
      }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  };

  // Add a hook to ensure notes is always properly formatted before save
  static hooks = {
    beforeValidate: (instance, options) => {
      if (instance.notes !== null && instance.notes !== undefined) {
        // If notes is a string, format it correctly
        if (typeof instance.notes === 'string') {
          instance.notes = {
            nurseNotes: "",
            triageNotes: instance.notes,
            patientRequirements: [],
            specialInstructions: ""
          };
        }
      }
    }
  }

  static associate(models) {
    this.belongsTo(models.Triage, {
      foreignKey: 'triageId',
      as: 'triage'
    });
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'PATIENT'
    });
    this.belongsTo(models.User, {
      foreignKey: 'doctorId',
      as: 'DOCTOR'
    });
    this.belongsTo(models.Department, {
      foreignKey: 'departmentId',
      as: 'department'
    });
    this.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    this.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'ConsultationQueue',
      tableName: 'ConsultationQueues',
      hooks: this.hooks,
      timestamps: true,
      paranoid: true
    });
  }
}

module.exports = ConsultationQueue;