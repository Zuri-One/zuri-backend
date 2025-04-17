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
        allowNull: true
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
      individualUnitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Price of a single unit (tablet, capsule, etc.)'
      },
      maxStockLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1000
      },
      supplier_id: {
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
      },
      packSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of units in each pack'
      },
      packUnit: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'tablet',
        comment: 'Unit of measurement (tablet, capsule, ml, etc.)'
      },
      dispensingUnit: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'tablet',
        comment: 'Unit used when dispensing to patients'
      },
      trackByPack: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, currentStock represents number of packs; if false, individual units'
      },
      unitPriceType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PER_UNIT',
        comment: 'Whether unit price is per pack or per unit'
      }
    }, {
      sequelize,
      modelName: 'Medication',
      tableName: 'Medications',
      timestamps: true,
      // underscored: true
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
        foreignKey: 'supplier_id',
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