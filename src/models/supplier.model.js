const { Model, DataTypes } = require('sequelize');

class Supplier extends Model {
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
      supplierId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      contactPerson: {
        type: DataTypes.STRING,
        allowNull: true
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      sequelize,
      modelName: 'Supplier',
      tableName: 'suppliers',
      timestamps: true,
      underscored: true
    });
  }

  static associate(models) {
    if (models.Medication) {
      this.hasMany(models.Medication, {
        foreignKey: 'supplierId',
        as: 'medications'
      });
    }
  }
}

module.exports = Supplier;