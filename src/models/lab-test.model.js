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
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'LabTest',
      tableName: 'LabTests',
      timestamps: true,
      hooks: {
        beforeCreate: async (test) => {
          if (!test.sampleId) {
            // Generate unique sample ID
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const count = await this.count({
              where: sequelize.where(
                sequelize.fn('date_part', 'year', sequelize.col('createdAt')),
                date.getFullYear()
              )
            });
            test.sampleId = `LAB${year}${month}${(count + 1).toString().padStart(4, '0')}`;
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
        }
      ]
    });
  }
}

module.exports = LabTest;