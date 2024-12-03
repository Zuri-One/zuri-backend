const { Model, DataTypes } = require('sequelize');


class DocumentShare extends Model {
    static schema = {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      documentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'MedicalDocuments',
          key: 'id'
        }
      },
      sharedWithId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      permissions: {
        type: DataTypes.ENUM('VIEW', 'EDIT', 'FULL'),
        defaultValue: 'VIEW'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    };
  
    static associate(models) {
      this.belongsTo(models.MedicalDocument, {
        foreignKey: 'documentId'
      });
      this.belongsTo(models.User, {
        foreignKey: 'sharedWithId',
        as: 'sharedWith'
      });
    }
  }
  
  module.exports = DocumentShare;
  