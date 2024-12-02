const { Model, DataTypes } = require('sequelize');

class LabTestTemplate extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    category: {
      type: DataTypes.ENUM(
        'HEMATOLOGY',
        'BIOCHEMISTRY',
        'MICROBIOLOGY',
        'IMMUNOLOGY',
        'URINALYSIS',
        'IMAGING',
        'PATHOLOGY',
        'OTHER'
      ),
      allowNull: false
    },
    parameters: {
      type: DataTypes.JSONB,
      defaultValue: []
      // Structure:
      // [{
      //   name: 'parameter name',
      //   unit: 'measurement unit',
      //   normalRange: { min: value, max: value },
      //   type: 'NUMERIC' | 'TEXT' | 'OPTION',
      //   options: [] // for OPTION type
      // }]
    },
    sampleType: DataTypes.STRING,
    instructions: DataTypes.TEXT,
    turnaroundTime: DataTypes.INTEGER, // in hours
    cost: DataTypes.DECIMAL(10, 2),
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  };
}

module.exports = LabTestTemplate;