const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');


class ProgressNote extends Model {
    static schema = {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      medicalRecordId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'MedicalRecords',
          key: 'id'
        }
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      noteType: {
        type: DataTypes.ENUM(
          'SOAP', // Subjective, Objective, Assessment, Plan
          'PROGRESS',
          'PROCEDURE',
          'CONSULTATION',
          'NURSING',
          'PHARMACY',
          'DISCHARGE'
        ),
        defaultValue: 'PROGRESS'
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      isConfidential: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      }
    };
  
    static associate(models) {
      this.belongsTo(models.MedicalRecord, {
        foreignKey: 'medicalRecordId'
      });
      this.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'author'
      });
    }
  }
  

  
  module.exports = ProgressNote;