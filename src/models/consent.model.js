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
        allowNull: true, // Changed to true since RECORDS_ACCESS won't need this
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
          'TEACHING',
          'RECORDS_ACCESS'
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
        //   identificationNumber: string,
        //   doctorId: string (for RECORDS_ACCESS),
        //   requestType: string (for RECORDS_ACCESS),
        //   status: string (for RECORDS_ACCESS),
        //   approvedAt: date (for RECORDS_ACCESS)
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
        type: DataTypes.ENUM('ACTIVE', 'WITHDRAWN', 'EXPIRED', 'PENDING'),
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
        allowNull: true  // Changed to true to accommodate PENDING status
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
        as: 'PATIENT'
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

    // Check if has valid records access
    static async hasValidAccess(doctorId, patientId) {
      const consent = await this.findOne({
        where: {
          patientId,
          consentType: 'RECORDS_ACCESS',
          status: 'ACTIVE',
          validUntil: {
            [Op.gt]: new Date()
          },
          'consentorDetails.doctorId': doctorId,
          'consentorDetails.status': 'APPROVED'
        }
      });
      return !!consent;
    }
  }
  
  module.exports = Consent;