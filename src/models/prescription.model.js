const { Model, DataTypes } = require('sequelize');

class Prescription extends Model {
  static schema = {
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
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Appointments',
        key: 'id'
      }
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled'),
      defaultValue: 'active'
    },
    refillCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    maxRefills: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  };

  static associate(models) {
    this.belongsTo(models.User, {
      as: 'patient',
      foreignKey: 'patientId'
    });
    this.belongsTo(models.User, {
      as: 'doctor',
      foreignKey: 'doctorId'
    });
    this.belongsTo(models.Appointment, {
      foreignKey: 'appointmentId'
    });
    this.belongsToMany(models.Medication, {
      through: 'PrescriptionMedications',
      foreignKey: 'prescriptionId'
    });
  }
}

module.exports = Prescription;