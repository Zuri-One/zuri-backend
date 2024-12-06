// models/consultation-queue.model.js
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
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '0: Normal, 1: High, 2: Urgent'
    },
    status: {
      type: DataTypes.ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'WAITING'
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  };

  static associate(models) {
    this.belongsTo(models.Triage, {
      foreignKey: 'triageId',
      as: 'triage'
    });
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    this.belongsTo(models.User, {
      foreignKey: 'doctorId',
      as: 'doctor'
    });
    this.belongsTo(models.Department, {
      foreignKey: 'departmentId',
      as: 'department'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'ConsultationQueue',
      tableName: 'consultation_queues',
      timestamps: true,
      paranoid: true
    });
  }
}

module.exports = ConsultationQueue;