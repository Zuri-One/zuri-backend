// models/triage-note.model.js
const { Model, DataTypes } = require('sequelize');

class TriageNote extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    triageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'triages',
        key: 'id'
      }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('ASSESSMENT', 'REASSESSMENT', 'ALERT', 'NOTE'),
      allowNull: false
    },
    notes: DataTypes.TEXT
  };

  static associate(models) {
    this.belongsTo(models.Triage, {
      foreignKey: 'triageId'
    });
    this.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'author'
    });
  }
}

module.exports = TriageNote;