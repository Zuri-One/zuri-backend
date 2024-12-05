const { Model, DataTypes } = require('sequelize');

class Consent extends Model {
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
      patientId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      consentType: {
        type: DataTypes.ENUM(
          'TREATMENT',
          'PROCEDURE',
          'DATA_SHARING',
          'RESEARCH',
          'PHOTOGRAPHY',
          'TEACHING'
        ),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      consentGivenBy: {
        type: DataTypes.ENUM('PATIENT', 'GUARDIAN', 'NEXT_OF_KIN'),
        allowNull: false
      },
      consentorDetails: {
        type: DataTypes.JSONB,
        allowNull: false,
        // Structure: {
        //   name: string,
        //   relationship: string (if not patient),
        //   contactInfo: string,
        //   identificationNumber: string
        // }
      },
      validFrom: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      validUntil: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'WITHDRAWN', 'EXPIRED'),
        defaultValue: 'ACTIVE'
      },
      withdrawalDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      withdrawalReason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      witnessId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      signature: {
        type: DataTypes.STRING,
        allowNull: false
      },
      attachments: {
        type: DataTypes.JSONB,
        defaultValue: []
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
        foreignKey: 'patientId',
        as: 'patient'
      });
      this.belongsTo(models.User, {
        foreignKey: 'witnessId',
        as: 'witness'
      });
    }
  
    // Check if consent is currently valid
    isValid() {
      const now = new Date();
      return (
        this.status === 'ACTIVE' &&
        (!this.validUntil || this.validUntil > now)
      );
    }
  
    // Withdraw consent with reason
    async withdraw(reason) {
      this.status = 'WITHDRAWN';
      this.withdrawalDate = new Date();
      this.withdrawalReason = reason;
      await this.save();
    }
  }
  
  module.exports = Consent ;