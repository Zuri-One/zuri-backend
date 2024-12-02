const { Model, DataTypes } = require('sequelize');

class StockMovement extends Model {
    static schema = {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      medicationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'MedicationInventory',
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
      batchNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      performedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      sourceDocument: {
        type: DataTypes.STRING,
        allowNull: true
      },
      sourceType: {
        type: DataTypes.ENUM('PURCHASE', 'PRESCRIPTION', 'RETURN', 'EXPIRY', 'ADJUSTMENT'),
        allowNull: true
      },
      sourceId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    };
  
    static associate(models) {
      this.belongsTo(models.MedicationInventory, {
        foreignKey: 'medicationId'
      });
      this.belongsTo(models.User, {
        as: 'performer',
        foreignKey: 'performedBy'
      });
      this.belongsTo(models.User, {
        as: 'verifier',
        foreignKey: 'verifiedBy'
      });
    }
  }
  

  module.exports = StockMovement;