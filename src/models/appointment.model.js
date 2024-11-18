// src/models/appointment.model.js
const { Model, DataTypes } = require('sequelize');

class Appointment extends Model {
  static schema = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
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
    dateTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('in-person', 'video'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        'pending', 
        'confirmed', 
        'in-progress',
        'completed', 
        'cancelled',
        'upcoming',
        'no-show'
      ),
      defaultValue: 'pending',
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    symptoms: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prescription: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    meetingLink: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    startUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    meetingId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    meetingPassword: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    platform: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 30, // Default 30 minutes
      allowNull: true
    },
    cancelledById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    cancelReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'completed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false
    },
    paymentAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    reminder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    reminderSentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    feedback: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    }
  };

  static associate(models) {
    this.belongsTo(models.User, { 
      as: 'patient',
      foreignKey: 'patientId',
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    });
    
    this.belongsTo(models.User, { 
      as: 'doctor',
      foreignKey: 'doctorId',
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    });
    
    this.belongsTo(models.User, {
      as: 'cancelledBy',
      foreignKey: 'cancelledById',
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    });
  }

  static initModel(sequelize) {
    return this.init(this.schema, {
      sequelize,
      modelName: 'Appointment',
      tableName: 'Appointments',
      timestamps: true,
      paranoid: true, // Enables soft deletes
      indexes: [
        {
          fields: ['patientId']
        },
        {
          fields: ['doctorId']
        },
        {
          fields: ['status']
        },
        {
          fields: ['dateTime']
        },
        {
          fields: ['type']
        },
        {
          fields: ['platform']
        },
        {
          fields: ['paymentStatus']
        },
        {
          fields: ['createdAt']
        }
      ],
      hooks: {
        beforeSave: async (appointment) => {
          // Convert dateTime to UTC if it isn't already
          if (appointment.dateTime && appointment.changed('dateTime')) {
            appointment.dateTime = new Date(appointment.dateTime);
          }
        },
        afterCreate: async (appointment) => {
          // Log appointment creation
          console.log(`New appointment created with ID: ${appointment.id}`);
        },
        afterUpdate: async (appointment) => {
          // Log appointment updates
          console.log(`Appointment ${appointment.id} updated`);
        }
      }
    });
  }

  // Instance methods
  async cancel(userId, reason) {
    this.status = 'cancelled';
    this.cancelledById = userId;
    this.cancelReason = reason;
    return await this.save();
  }

  async complete() {
    this.status = 'completed';
    return await this.save();
  }

  async addFeedback(rating, feedback) {
    this.rating = rating;
    this.feedback = feedback;
    return await this.save();
  }

  // Helper methods
  isUpcoming() {
    return new Date(this.dateTime) > new Date();
  }

  isPast() {
    return new Date(this.dateTime) < new Date();
  }

  canBeCancelled() {
    return ['pending', 'confirmed'].includes(this.status) && this.isUpcoming();
  }

  canBeRescheduled() {
    return ['pending', 'confirmed'].includes(this.status) && this.isUpcoming();
  }

  toJSON() {
    const values = { ...super.toJSON() };
    values.isUpcoming = this.isUpcoming();
    values.isPast = this.isPast();
    values.canBeCancelled = this.canBeCancelled();
    values.canBeRescheduled = this.canBeRescheduled();
    return values;
  }
}

module.exports = Appointment;