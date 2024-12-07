// src/models/medical-document.model.js
const { Model, DataTypes } = require('sequelize');

class MedicalDocument extends Model {
  static initialize(sequelize) {
    super.init({
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
      uploadedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      category: {
        type: DataTypes.ENUM(
          'GENERAL',
          'SCANS',
          'PRESCRIPTIONS',
          'LAB_RESULTS',
          'INSURANCE',
          'RECEIPTS',
          'REPORTS',
          'OTHER'
        ),
        allowNull: false
      },
      documentType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      fileUrl: {
        type: DataTypes.STRING,
        allowNull: false
      },
      fileKey: {
        type: DataTypes.STRING,
        allowNull: false
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      contentType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      isArchived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
      }
    }, {
      sequelize,
      modelName: 'MedicalDocument',
      tableName: 'medical_documents',
      timestamps: true,
      paranoid: false,
      underscored: true
    });

    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'PATIENT'
    });
    this.belongsTo(models.User, {
      foreignKey: 'uploadedById',
      as: 'uploader'
    });
  }
}

module.exports = MedicalDocument;