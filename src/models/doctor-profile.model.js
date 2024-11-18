// src/models/doctor-profile.model.js
const { Model, DataTypes } = require('sequelize');

class DoctorProfile extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      unique: true
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: false
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    qualifications: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    experience: {
      type: DataTypes.INTEGER, // years of experience
    },
    consultationFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    bio: {
      type: DataTypes.TEXT
    },
    languagesSpoken: {
      type: DataTypes.JSONB,
      defaultValue: ['English']
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      validate: {
        min: 0,
        max: 5
      }
    },
    totalReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isAvailableForVideo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  };

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId' });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'DoctorProfile',
      tableName: 'DoctorProfiles',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['userId']
        },
        {
          unique: true,
          fields: ['licenseNumber']
        }
      ]
    });
  }
}

module.exports = DoctorProfile;