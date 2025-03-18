const { Model, DataTypes } = require('sequelize');

class Medication extends Model {
  static initModel(sequelize) {
    const model = super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      genericName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      batchNumber: {
        type: DataTypes.STRING,
        allowNull: false
      },
      category: {
        type: DataTypes.ENUM('ANTIBIOTIC', 'ANALGESIC', 'ANTIVIRAL', 'ANTIHISTAMINE', 
                           'ANTIHYPERTENSIVE', 'ANTIDIABETIC', 'PSYCHIATRIC', 
                           'CARDIAC', 'RESPIRATORY', 'SUPPLEMENTS', 'OTHER'),
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 
                           'OINTMENT', 'DROPS', 'INHALER', 'POWDER', 'OTHER'),
        allowNull: false
      },
      strength: {
        type: DataTypes.STRING,
        allowNull: false
      },
      manufacturer: {
        type: DataTypes.STRING,
        allowNull: true
      },
      currentStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      minStockLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      maxStockLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1000
      },
      supplier_id: { // Changed field name to match database column
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'id'
        }
      },
      markedPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      markupPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 15.00
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      storageLocation: {
        type: DataTypes.ENUM('STORE', 'MEDICAL_CAMP', 'PHARMACY'),
        allowNull: false,
        defaultValue: 'PHARMACY'
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      prescriptionRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      inventoryReceiptId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'inventory_receipts',
          key: 'id'
        }
      }
    }, {
      sequelize,
      modelName: 'Medication',
      tableName: 'Medications', // Changed to match uppercase table name in database
      timestamps: true,
      underscored: true
    });

    return model;
  }

  static associate(models) {
    if (models.StockMovement) {
      this.hasMany(models.StockMovement, {
        foreignKey: 'medicationId',
        as: 'stockMovements'
      });
    }
    
    if (models.Supplier) {
      this.belongsTo(models.Supplier, {
        foreignKey: 'supplier_id', // Changed to match database column
        as: 'supplier'
      });
    }
    
    if (models.InventoryReceipt) {
      this.belongsTo(models.InventoryReceipt, {
        foreignKey: 'inventoryReceiptId',
        as: 'inventoryReceipt'
      });
    }
  }
}

module.exports = Medication;