const { Model, DataTypes } = require('sequelize');

class Pharmacy extends Model {
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
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      openingHours: {
        type: DataTypes.JSONB,
        defaultValue: {}
      }
    }, {
      sequelize,
      modelName: 'Pharmacy',
    });
  }

  static associate(models) {
    // Only create associations for models that exist
    if (models.Medication) {
      this.hasMany(models.Medication, { foreignKey: 'pharmacyId' });
    }
    
    // Check if PrescriptionFill exists before creating association
    if (models.PrescriptionFill) {
      this.hasMany(models.PrescriptionFill, { foreignKey: 'pharmacyId' });
    }
  }
}

module.exports = Pharmacy;