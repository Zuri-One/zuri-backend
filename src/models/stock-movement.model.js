const { Model, DataTypes } = require('sequelize');

class StockMovement extends Model {
  static initModel(sequelize) {
    return this.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      medicationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'medications',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.ENUM('RECEIVED', 'DISPENSED', 'RETURNED', 'EXPIRED', 'DAMAGED', 'ADJUSTED', 'TRANSFER'),
        allowNull: false
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      batchNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      performedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      sourceType: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      sourceId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      fromLocation: {
        type: DataTypes.ENUM('STORE', 'MEDICAL_CAMP', 'PHARMACY'),
        allowNull: true
      },
      toLocation: {
        type: DataTypes.ENUM('STORE', 'MEDICAL_CAMP', 'PHARMACY'),
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'StockMovement',
      tableName: 'stock_movements',
      underscored: true,
      timestamps: true
    });
  }

  static associate(models) {
    if (models.Medication) {
      this.belongsTo(models.Medication, {
        foreignKey: 'medicationId',
        as: 'medication'
      });
    }
    
    if (models.User) {
      this.belongsTo(models.User, {
        foreignKey: 'performedBy',
        as: 'performer'
      });
    }
  }
}

module.exports = StockMovement;