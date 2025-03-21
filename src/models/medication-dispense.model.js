const { Model, DataTypes } = require('sequelize');

class MedicationDispense extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    prescriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Prescriptions', // Note the capitalization matches your DB
        key: 'id'
      }
    },
    medicationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'medications', // This is lowercase in your DB
        key: 'id'
      }
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users', // Note the capitalization matches your DB
        key: 'id'
      }
    },
    dispensedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    checkedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dosage: {
      type: DataTypes.STRING,
      allowNull: false
    },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'DISPENSED', 'CANCELLED', 'ON_HOLD'),
      defaultValue: 'PENDING'
    },
    dispensedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'INSURANCE', 'CANCELLED'),
      defaultValue: 'PENDING'
    },
    insuranceClaimId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    labResultId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'LabTests',
        key: 'id'
      }
    }
  };

  static associate(models) {
    if (models.Prescription) {
      this.belongsTo(models.Prescription, {
        foreignKey: 'prescriptionId'
      });
    }
    
    if (models.Medication) {
      this.belongsTo(models.Medication, {
        foreignKey: 'medicationId'
      });
    }
    
    if (models.User) {
      this.belongsTo(models.User, {
        as: 'PATIENT',
        foreignKey: 'patientId'
      });
      
      this.belongsTo(models.User, {
        as: 'dispenser',
        foreignKey: 'dispensedBy'
      });
      
      this.belongsTo(models.User, {
        as: 'checker',
        foreignKey: 'checkedBy'
      });
    }
    
    if (models.LabTest) {
      this.belongsTo(models.LabTest, {
        foreignKey: 'labResultId'
      });
    }
  }
}

module.exports = MedicationDispense;