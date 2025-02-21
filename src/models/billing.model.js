// models/billing.model.js
const { Model, DataTypes } = require('sequelize');


class Billing extends Model {
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
    billType: {
      type: DataTypes.ENUM('CONSULTATION', 'TRIAGE', 'LAB', 'PHARMACY', 'NURSING'),
      allowNull: false
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2)
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.STRING,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'KES'
    },
    reference: {
      type: DataTypes.STRING,
      unique: true
    },
    paymentReference: {
      type: DataTypes.STRING
    },
    lastPaymentAttempt: {
      type: DataTypes.DATE
    },
    paidAt: {
      type: DataTypes.DATE
    },
    dueDate: {
      type: DataTypes.DATE
    },
    insuranceDetails: {
      type: DataTypes.JSONB
    },
    paymentTransactions: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    notes: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.STRING
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  };

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    this.belongsTo(models.Department, {
      foreignKey: 'departmentId'
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
}


module.exports = Billing;