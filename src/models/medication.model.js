const { Model, DataTypes } = require('sequelize');

class Medication extends Model {
  static initModel(sequelize) {
    return this.init({
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
        allowNull: false,
        unique: true
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
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'Medication',
      tableName: 'Medications',
      timestamps: true,
      underscored: false  // Changed to false since we're using camelCase
    });
  }

  static associate(models) {
    if (models.StockMovement) {
      this.hasMany(models.StockMovement, { 
        foreignKey: 'medicationId',  // Changed to camelCase
        as: 'stockMovements'
      });
    }
  }
}

module.exports = Medication;