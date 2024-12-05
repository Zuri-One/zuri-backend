const { Model, DataTypes } = require('sequelize');

class Department extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    type: {
      type: DataTypes.ENUM('CLINICAL', 'DIAGNOSTIC', 'ADMINISTRATIVE', 'SUPPORT'),
      allowNull: false
    },
    operatingHours: {
      type: DataTypes.JSONB,
      defaultValue: {},
      // Structure: {
      //   monday: { start: '09:00', end: '17:00' },
      //   tuesday: { start: '09:00', end: '17:00' },
      //   ...
      // }
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    headOfDepartmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    contactExtension: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyContact: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    resources: {
      type: DataTypes.JSONB,
      defaultValue: []
      // Structure: [{
      //   type: 'EQUIPMENT',
      //   name: 'X-Ray Machine',
      //   quantity: 2,
      //   status: 'ACTIVE'
      // }]
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  };

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'headOfDepartmentId',
      as: 'headOfDepartment'
    });
    this.hasMany(models.User, {
      foreignKey: 'departmentId',
      as: 'staff'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'Department',
      tableName: 'departments',
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['code']
        },
        {
          fields: ['type']
        },
        {
          fields: ['isActive']
        }
      ]
    });
  }
}

module.exports = Department;