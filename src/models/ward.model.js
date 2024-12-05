// models/ward.model.js
const { Model, DataTypes } = require('sequelize');

class Ward extends Model {
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
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Departments',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'GENERAL',
        'PRIVATE',
        'ICU',
        'PEDIATRIC',
        'MATERNITY',
        'ISOLATION',
        'EMERGENCY',
        'POST_OP',
        'PSYCHIATRIC'
      ),
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'UNISEX'),
      allowNull: false
    },
    floorNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nurseStationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  };

  static associate(models) {
    this.belongsTo(models.Department, {
      foreignKey: 'departmentId'
    });
    this.hasMany(models.Bed, {
      foreignKey: 'wardId'
    });
  }
}

// models/bed.model.js
class Bed extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    wardId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Wards',
        key: 'id'
      }
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('STANDARD', 'ELECTRIC', 'ICU', 'PEDIATRIC', 'BARIATRIC'),
      defaultValue: 'STANDARD'
    },
    status: {
      type: DataTypes.ENUM(
        'AVAILABLE',
        'OCCUPIED',
        'RESERVED',
        'MAINTENANCE',
        'CLEANING'
      ),
      defaultValue: 'AVAILABLE'
    },
    currentPatientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: {}
      // Structure: {
      //   hasOxygen: boolean,
      //   hasVentilator: boolean,
      //   hasCallButton: boolean,
      //   hasCurtains: boolean
      // }
    },
    lastSanitized: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  };

  static associate(models) {
    this.belongsTo(models.Ward, {
      foreignKey: 'wardId'
    });
    this.belongsTo(models.User, {
      foreignKey: 'currentPatientId',
      as: 'currentPatient'
    });
  }
}

module.exports = {
  Ward,
  Bed
};