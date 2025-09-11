const { Model, DataTypes } = require('sequelize');

class PharmacyBill extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    billNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'id'
      }
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
    totalTax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'ESCALATED', 'DEFAULT'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
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
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  };

  static associate(models) {
    this.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
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
      modelName: 'PharmacyBill',
      tableName: 'PharmacyBills',
      timestamps: true
    });
  }
}

module.exports = PharmacyBill;