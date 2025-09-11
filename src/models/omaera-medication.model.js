const { Model, DataTypes } = require('sequelize');

class OmaeraMedication extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    itemCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    itemDescription: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    packSize: {
      type: DataTypes.STRING,
      allowNull: true
    },
    taxCode: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currentPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastUpdatedBy: {
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
    this.belongsTo(models.User, {
      foreignKey: 'lastUpdatedBy',
      as: 'updatedBy'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'OmaeraMedication',
      tableName: 'OmaeraMedications',
      timestamps: true
    });
  }
}

module.exports = OmaeraMedication;