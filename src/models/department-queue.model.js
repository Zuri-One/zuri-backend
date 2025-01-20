const { Model, DataTypes } = require('sequelize');

class DepartmentQueue extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Departments',
        key: 'id'
      }
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'id'
      }
    },
    assignedToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'ID of doctor/staff assigned to patient'
    },
    queueNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: '1: Highest Priority, 5: Lowest Priority'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'WAITING',
      allowNull: false,
      validate: {
        isIn: {
          args: [['WAITING', 'IN_PROGRESS', 'COMPLETED', 'TRANSFERRED', 'NO_SHOW', 'CANCELLED']],
          msg: 'Invalid status value'
        }
      }
    },
    estimatedWaitTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Estimated wait time in minutes'
    },
    actualWaitTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Actual wait time in minutes'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Origin of queue entry (e.g., REGISTRATION, TRIAGE, REFERRAL)'
    },
    triageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Triages',
        key: 'id'
      }
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When patient service started'
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When patient service completed'
    }
  };

  static associate(models) {
    this.belongsTo(models.Department, {
      foreignKey: 'departmentId'
    });
    this.belongsTo(models.Patient, {
      foreignKey: 'patientId'
    });
    this.belongsTo(models.User, {
      foreignKey: 'assignedToId',
      as: 'assignedStaff'
    });
    this.belongsTo(models.Triage, {
      foreignKey: 'triageId'
    });
  }

  calculateWaitTime() {
    if (this.startTime) {
      return Math.floor(
        (this.startTime - this.createdAt) / (1000 * 60)
      );
    }
    return Math.floor(
      (new Date() - this.createdAt) / (1000 * 60)
    );
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'DepartmentQueue',
      tableName: 'DepartmentQueues',
      timestamps: true,
      indexes: [
        {
          fields: ['departmentId', 'status']
        },
        {
          fields: ['patientId']
        },
        {
          fields: ['assignedToId']
        },
        {
          fields: ['status']
        }
      ]
    });
  }
}

module.exports = DepartmentQueue;