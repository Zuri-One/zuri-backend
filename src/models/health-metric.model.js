const { Model, DataTypes } = require('sequelize');

class HealthMetric extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('heartRate', 'bloodPressure', 'glucose'),
      allowNull: false
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    notes: DataTypes.TEXT
  };

  static associate(models) {
    this.belongsTo(models.User, { 
      as: 'PATIENT',
      foreignKey: 'patientId'
    });
  }
}

module.exports = HealthMetric;