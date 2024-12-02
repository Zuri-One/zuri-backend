const { Model, DataTypes } = require('sequelize');

class LabTest extends Model {
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
    referringDoctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    technicianId: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    verifiedById: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    testType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    testCategory: {
      type: DataTypes.ENUM(
        'HEMATOLOGY',
        'BIOCHEMISTRY',
        'MICROBIOLOGY',
        'IMMUNOLOGY',
        'URINALYSIS',
        'IMAGING',
        'PATHOLOGY',
        'MOLECULAR',
        'SEROLOGY',
        'TOXICOLOGY'
      ),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('ROUTINE', 'URGENT', 'STAT'),
      defaultValue: 'ROUTINE'
    },
    status: {
      type: DataTypes.ENUM(
        'ORDERED',
        'SPECIMEN_COLLECTED',
        'RECEIVED',
        'IN_PROGRESS',
        'COMPLETED',
        'VERIFIED',
        'CANCELLED',
        'REJECTED'
      ),
      defaultValue: 'ORDERED'
    },
    specimenCollectedAt: DataTypes.DATE,
    specimenReceivedAt: DataTypes.DATE,
    testStartedAt: DataTypes.DATE,
    testCompletedAt: DataTypes.DATE,
    verifiedAt: DataTypes.DATE,
    specimenType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    specimenId: {
      type: DataTypes.STRING,
      unique: true
    },
    results: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    normalRanges: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    units: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    interpretation: DataTypes.TEXT,
    comments: DataTypes.TEXT,
    technicianNotes: DataTypes.TEXT,
    attachments: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      defaultValue: []
    },
    isAbnormal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isCritical: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    criticalValueNotified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notifiedTo: DataTypes.STRING,
    notifiedAt: DataTypes.DATE,
    rejectionReason: DataTypes.TEXT,
    qualityControl: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    instrumentUsed: DataTypes.STRING,
    methodUsed: DataTypes.STRING,
    costCode: DataTypes.STRING,
    insuranceCode: DataTypes.STRING,
    billingStatus: {
      type: DataTypes.ENUM('PENDING', 'BILLED', 'PAID', 'INSURANCE'),
      defaultValue: 'PENDING'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  };

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    this.belongsTo(models.User, {
      foreignKey: 'referringDoctorId',
      as: 'referringDoctor'
    });
    this.belongsTo(models.User, {
      foreignKey: 'technicianId',
      as: 'technician'
    });
    this.belongsTo(models.User, {
      foreignKey: 'verifiedById',
      as: 'verifier'
    });
  }

  // Instance methods
  async updateStatus(newStatus, userId) {
    const statusTimestamps = {
      SPECIMEN_COLLECTED: 'specimenCollectedAt',
      RECEIVED: 'specimenReceivedAt',
      IN_PROGRESS: 'testStartedAt',
      COMPLETED: 'testCompletedAt',
      VERIFIED: 'verifiedAt'
    };

    if (statusTimestamps[newStatus]) {
      this[statusTimestamps[newStatus]] = new Date();
    }

    if (newStatus === 'VERIFIED') {
      this.verifiedById = userId;
    }

    this.status = newStatus;
    await this.save();
  }

  async markCritical(notifiedTo, userId) {
    this.isCritical = true;
    this.criticalValueNotified = true;
    this.notifiedTo = notifiedTo;
    this.notifiedAt = new Date();
    await this.save();
  }

  generateReportData() {
    return {
      testInfo: {
        id: this.id,
        type: this.testType,
        category: this.testCategory,
        specimenType: this.specimenType,
        specimenId: this.specimenId,
        collectedAt: this.specimenCollectedAt,
        completedAt: this.testCompletedAt
      },
      results: this.results,
      normalRanges: this.normalRanges,
      units: this.units,
      interpretation: this.interpretation,
      comments: this.comments,
      flags: {
        isAbnormal: this.isAbnormal,
        isCritical: this.isCritical
      },
      verification: this.verifiedById ? {
        verifiedAt: this.verifiedAt,
        verifierId: this.verifiedById
      } : null
    };
  }
}

module.exports = LabTest;