// src/models/ccp.model.js
const { Model, DataTypes } = require('sequelize');

class CCP extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Patient reference
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'id'
      },
      comment: 'Reference to the CCP enrolled patient'
    },

    // Follow-up scheduling
    nextFollowupDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Next scheduled followup date for the following month'
    },

    dueFollowupDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Rescheduled date if patient was not available for original followup'
    },

    followupFrequency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '1_MONTH',
      validate: {
        isIn: [['1_WEEK', '2_WEEKS', '1_MONTH', '2_MONTHS', '3_MONTHS', '6_MONTHS', '12_MONTHS']]
      },
      comment: 'Frequency of followup appointments'
    },

    followupFrequencyValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Numeric value for frequency (1, 2, 3, etc.)'
    },

    followupFrequencyUnit: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'MONTH',
      validate: {
        isIn: [['WEEK', 'MONTH', 'YEAR']]
      },
      comment: 'Unit for frequency (WEEK, MONTH, YEAR)'
    },

    // Follow-up status tracking
    isFollowupCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the CCP followup has been completed for this period'
    },

    followupMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12
      },
      comment: 'Month for which this followup record applies (1-12)'
    },

    followupYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2020,
        max: 2050
      },
      comment: 'Year for which this followup record applies'
    },

    // Feedback and notes
    followupFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'General feedback about the followup session'
    },

    consultationFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Specific consultation feedback from healthcare provider'
    },

    // Additional tracking fields
    scheduledBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User who scheduled this followup'
    },

    completedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User who completed this followup'
    },

    followupType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ROUTINE',
      validate: {
        isIn: [['ROUTINE', 'URGENT', 'MEDICATION_REVIEW', 'LAB_FOLLOWUP', 'SYMPTOM_CHECK', 'EMERGENCY']]
      },
      comment: 'Type of followup appointment'
    },

    followupMode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'IN_PERSON',
      validate: {
        isIn: [['IN_PERSON', 'PHONE_CALL', 'VIDEO_CALL', 'SMS', 'HOME_VISIT']]
      },
      comment: 'Mode of followup contact'
    },

    // Clinical indicators
    vitalSigns: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Vital signs recorded during followup'
    },

    symptomsAssessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Assessment of current symptoms'
    },

    medicationCompliance: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'NON_COMPLIANT']]
      },
      comment: 'Assessment of medication compliance'
    },

    // Follow-up outcomes
    actionItems: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'List of action items from the followup'
    },

    referralsNeeded: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Any referrals needed based on followup'
    },

    labTestsOrdered: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Lab tests ordered during followup'
    },

    // Status and priority
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'SCHEDULED',
      validate: {
        isIn: [['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']]
      },
      comment: 'Current status of the followup'
    },

    priority: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'NORMAL',
      validate: {
        isIn: [['LOW', 'NORMAL', 'HIGH', 'URGENT']]
      },
      comment: 'Priority level of the followup'
    },

    // Timing
    actualFollowupDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Actual date when followup was completed'
    },

    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration of followup in minutes'
    },

    // Notes
    privateNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Private notes for healthcare provider only'
    },

    patientNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes that can be shared with patient'
    }
  };

  // Helper methods
  static getFrequencyInDays(frequency) {
    const frequencyMap = {
      '1_WEEK': 7,
      '2_WEEKS': 14,
      '1_MONTH': 30,
      '2_MONTHS': 60,
      '3_MONTHS': 90,
      '6_MONTHS': 180,
      '12_MONTHS': 365
    };
    return frequencyMap[frequency] || 30;
  }

  calculateNextFollowupDate() {
    if (!this.actualFollowupDate) return null;
    
    const currentDate = new Date(this.actualFollowupDate);
    const frequencyDays = CCP.getFrequencyInDays(this.followupFrequency);
    
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + frequencyDays);
    
    return nextDate;
  }

  isOverdue() {
    if (!this.nextFollowupDate) return false;
    return new Date() > new Date(this.nextFollowupDate);
  }

  getDaysUntilFollowup() {
    if (!this.nextFollowupDate) return null;
    
    const today = new Date();
    const followupDate = new Date(this.nextFollowupDate);
    const diffTime = followupDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  static associate(models) {
    // Association with Patient
    if (models.Patient) {
      this.belongsTo(models.Patient, {
        foreignKey: 'patientId',
        as: 'patient',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    // Association with User (scheduled by)
    if (models.User) {
      this.belongsTo(models.User, {
        foreignKey: 'scheduledBy',
        as: 'scheduler',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      this.belongsTo(models.User, {
        foreignKey: 'completedBy',
        as: 'completedByUser',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'CCP',
      tableName: 'CCPs',
      timestamps: true,
      hooks: {
        beforeValidate: (ccp) => {
          // Auto-set followupMonth and followupYear if not provided
          if (!ccp.followupMonth || !ccp.followupYear) {
            const date = ccp.nextFollowupDate ? new Date(ccp.nextFollowupDate) : new Date();
            ccp.followupMonth = date.getMonth() + 1;
            ccp.followupYear = date.getFullYear();
          }

          // Parse frequency string to set individual values
          if (ccp.followupFrequency) {
            const [value, unit] = ccp.followupFrequency.split('_');
            ccp.followupFrequencyValue = parseInt(value) || 1;
            ccp.followupFrequencyUnit = unit === 'WEEKS' ? 'WEEK' : 
                                       unit === 'MONTHS' ? 'MONTH' : 
                                       unit === 'YEARS' ? 'YEAR' : 'MONTH';
          }
        },

        beforeUpdate: (ccp) => {
          // Auto-calculate next followup date when current one is completed
          if (ccp.changed('isFollowupCompleted') && ccp.isFollowupCompleted && !ccp.actualFollowupDate) {
            ccp.actualFollowupDate = new Date();
          }
        }
      },
      indexes: [
        {
          fields: ['patientId']
        },
        {
          fields: ['followupMonth', 'followupYear']
        },
        {
          fields: ['isFollowupCompleted']
        },
        {
          fields: ['nextFollowupDate']
        },
        {
          fields: ['status']
        },
        {
          fields: ['priority']
        },
        {
          unique: true,
          fields: ['patientId', 'followupMonth', 'followupYear'],
          name: 'unique_patient_month_year'
        }
      ]
    });
  }
}

module.exports = CCP;