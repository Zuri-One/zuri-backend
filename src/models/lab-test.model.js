const { Model, DataTypes } = require('sequelize');

class LabTest extends Model {
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
    requestedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    laboratoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Laboratories', 
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
    testType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'NORMAL',
      validate: {
        isIn: [['NORMAL', 'URGENT']]
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'PENDING',
      validate: {
        isIn: [['PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']]
      }
    },
    sampleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    sampleCollectionDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sampleCollectedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    resultDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    results: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    referenceRange: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    isCritical: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    isAbnormal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paymentStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'PENDING',
      validate: {
        isIn: [['PENDING', 'PAID', 'WAIVED']]
      }
    },
    expectedCompletionDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    // Batch Processing Fields
    batchId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Groups related tests together'
    },
    parentTestId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'LabTests',
        key: 'id'
      },
      comment: 'Reference to parent test in batch'
    },
    isParentTest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indicates if this is the main test in a batch'
    },
    sharedSampleId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Shared sample ID for batch tests'
    },
    batchMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional batch-related metadata'
    }
  };

  static associate(models) {
    this.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });

    this.belongsTo(models.User, {
      foreignKey: 'requestedById',
      as: 'requestedBy'
    });

    this.belongsTo(models.User, {
      foreignKey: 'assignedToId',
      as: 'assignedTo'
    });

    this.belongsTo(models.User, {
      foreignKey: 'sampleCollectedById',
      as: 'sampleCollector'
    });

    this.belongsTo(models.DepartmentQueue, {
      foreignKey: 'queueEntryId',
      as: 'queueEntry'
    });

    // Batch relationships
    this.belongsTo(models.LabTest, {
      foreignKey: 'parentTestId',
      as: 'parentTest'
    });

    this.hasMany(models.LabTest, {
      foreignKey: 'parentTestId',
      as: 'childTests'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'LabTest',
      tableName: 'LabTests',
      timestamps: true,
      hooks: {
        beforeCreate: async (test, options) => {
          if (!test.sampleId) {
            // Generate unique sample ID using timestamp + random for uniqueness
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
            const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            
            test.sampleId = `LAB${year}${month}${day}${timestamp}${random}`;
          }
        }
      },
      indexes: [
        {
          fields: ['patientId']
        },
        {
          fields: ['queueEntryId']
        },
        {
          fields: ['requestedById']
        },
        {
          fields: ['assignedToId']
        },
        {
          fields: ['status']
        },
        {
          fields: ['sampleId'],
          unique: true
        },
        {
          fields: ['batchId']
        },
        {
          fields: ['parentTestId']
        },
        {
          fields: ['sharedSampleId']
        }
      ]
    });
  }
}

module.exports = LabTest;