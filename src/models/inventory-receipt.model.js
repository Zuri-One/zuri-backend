const { Model, DataTypes } = require('sequelize');

class InventoryReceipt extends Model {
  static initModel(sequelize) {
    return this.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      supplierId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        }
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      deliveryDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deliveryMethod: {
        type: DataTypes.STRING,
        allowNull: true
      },
      receivedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'InventoryReceipt',
      tableName: 'inventory_receipts',
      timestamps: true,
      underscored: true
    });
  }

  static associate(models) {
    if (models.Supplier) {
      this.belongsTo(models.Supplier, {
        foreignKey: 'supplierId',
        as: 'supplier'
      });
    }
    
    if (models.User) {
      this.belongsTo(models.User, {
        foreignKey: 'receivedBy',
        as: 'receiver'
      });
    }
    
    if (models.StockMovement) {
      this.hasMany(models.StockMovement, {
        foreignKey: 'sourceId',
        scope: {
          sourceType: 'RECEIPT'
        },
        as: 'stockMovements'
      });
    }
  }
}

module.exports = InventoryReceipt;