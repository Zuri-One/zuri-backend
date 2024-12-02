const { Model, DataTypes } = require('sequelize');

class Medication extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dosage: {
      type: DataTypes.STRING,
      allowNull: false
    },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    instructions: {
      type: DataTypes.TEXT
    },
    sideEffects: {
      type: DataTypes.TEXT
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  };

  static associate(models) {
    this.belongsToMany(models.Prescription, {
      through: 'PrescriptionMedications',
      foreignKey: 'medicationId'
    });
  }
}

module.exports = Medication;