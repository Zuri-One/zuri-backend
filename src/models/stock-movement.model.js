const { Model, DataTypes } = require('sequelize');

class StockMovement extends Model {
  static initModel(sequelize) {
    return this.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      medication_id: {  // Changed to match DB column name
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'medications',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.ENUM('RECEIVED', 'DISPENSED', 'RETURNED', 'EXPIRED', 'DAMAGED', 'ADJUSTED'),
        allowNull: false
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      batch_number: {  // Changed to match DB column name
        type: DataTypes.STRING,
        allowNull: true
      },
      unit_price: {  // Changed to match DB column name
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      total_price: {  // Changed to match DB column name
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      performed_by: {  // Changed to match DB column name
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      source_type: {  // Changed to match DB column name
        type: DataTypes.STRING(50),
        allowNull: true
      },
      source_id: {  // Changed to match DB column name
        type: DataTypes.UUID,
        allowNull: true
      }
    }, {
      sequelize,
      modelName: 'StockMovement',
      tableName: 'stock_movements',
      underscored: true,  // Added to handle snake_case column names
      timestamps: true,
      createdAt: 'created_at',  // Specify the actual column names
      updatedAt: 'updated_at'
    });
  }
}

  module.exports = StockMovement;