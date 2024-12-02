const { Model, DataTypes } = require('sequelize');

class PrescriptionMedications extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    prescriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Prescriptions',
        key: 'id'
      }
    },
    medicationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Medications',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    specialInstructions: {
      type: DataTypes.TEXT
    }
  };

  static associate(models) {
    this.belongsTo(models.Prescription, {
      foreignKey: 'prescriptionId'
    });
    this.belongsTo(models.Medication, {
      foreignKey: 'medicationId'
    });
  }
}

module.exports = PrescriptionMedications;