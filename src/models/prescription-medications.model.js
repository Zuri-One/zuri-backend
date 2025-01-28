const { Model, DataTypes } = require('sequelize');

class PrescriptionMedications extends Model {
  static initModel(sequelize) {
    return super.init({
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
      MedicationId: {  // Note the capital M to match the database
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
    }, {
      sequelize,
      modelName: 'PrescriptionMedication',
      tableName: 'PrescriptionMedications',
      timestamps: true
    });
  }
}

module.exports = PrescriptionMedications;