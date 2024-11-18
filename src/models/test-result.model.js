const { Model, DataTypes } = require('sequelize');

class TestResult extends Model {
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
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    testName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('normal', 'perfect', 'needs-attention'),
      allowNull: false
    },
    comments: DataTypes.TEXT
  };

  static associate(models) {
    this.belongsTo(models.User, { 
      as: 'patient',
      foreignKey: 'patientId'
    });
    this.belongsTo(models.User, { 
      as: 'referringDoctor',
      foreignKey: 'doctorId'
    });
  }
}

module.exports = TestResult;