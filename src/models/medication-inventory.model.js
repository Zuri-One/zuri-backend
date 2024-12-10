const { Model, DataTypes } = require('sequelize');

class MedicationInventory extends Model {
  static initModel(sequelize) {
    return super.init({
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
      category: {
        type: DataTypes.ENUM(
          'ANTIBIOTIC',
          'ANALGESIC',
          'ANTIVIRAL',
          'ANTIHISTAMINE',
          'ANTIHYPERTENSIVE',
          'ANTIDIABETIC',
          'PSYCHIATRIC',
          'CARDIAC',
          'RESPIRATORY',
          'SUPPLEMENTS',
          'OTHER'
        ),
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM(
          'TABLET',
          'CAPSULE',
          'SYRUP',
          'INJECTION',
          'CREAM',
          'OINTMENT',
          'DROPS',
          'INHALER',
          'POWDER',
          'OTHER'
        ),
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
      batchNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: false
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
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      prescriptionRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      storageConditions: {
        type: DataTypes.STRING,
        allowNull: true
      },
      sideEffects: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      contraindications: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      interactions: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      dosageInstructions: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      barcode: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      supplier: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reorderLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      packageSize: {
        type: DataTypes.STRING,
        allowNull: true
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'MedicationInventory',
      tableName: 'MedicationInventories',
      timestamps: true
    });
  }

  static associate(models) {
    this.hasMany(models.StockMovement, {
      foreignKey: 'medicationId'
    });
    this.hasMany(models.MedicationDispense, {
      foreignKey: 'medicationId'
    });
  }
}

module.exports = MedicationInventory;