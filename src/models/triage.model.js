// models/triage.model.js
const { Model, DataTypes } = require('sequelize');

class Triage extends Model {
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
    assessedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    assessmentDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    category: {
      type: DataTypes.ENUM('RED', 'YELLOW', 'GREEN', 'BLACK'),
      allowNull: false,
      comment: 'RED: Immediate, YELLOW: Urgent, GREEN: Non-urgent, BLACK: Deceased'
    },
    chiefComplaint: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    vitalSigns: {
      type: DataTypes.JSONB,
      allowNull: false
      // Structure: {
      //   bloodPressure: {
      //     systolic: number,
      //     diastolic: number,
      //     isAbnormal: boolean
      //   },
      //   temperature: {
      //     value: number,
      //     unit: string,
      //     isAbnormal: boolean
      //   },
      //   heartRate: {
      //     value: number,
      //     isAbnormal: boolean
      //   },
      //   respiratoryRate: {
      //     value: number,
      //     isAbnormal: boolean
      //   },
      //   oxygenSaturation: {
      //     value: number,
      //     isAbnormal: boolean
      //   },
      //   painScore: {
      //     value: number,
      //     location: string
      //   }
      // }
    },
    consciousness: {
      type: DataTypes.ENUM('ALERT', 'VERBAL', 'PAIN', 'UNRESPONSIVE'),
      allowNull: false
    },
    symptoms: {
      type: DataTypes.JSONB,
      defaultValue: []
      // Array of symptom objects with severity and duration
    },
    medicalHistory: {
      type: DataTypes.JSONB,
      defaultValue: {}
      // Structure: {
      //   conditions: [],
      //   allergies: [],
      //   medications: [],
      //   previousVisits: []
      // }
    },
    physicalAssessment: {
      type: DataTypes.JSONB,
      allowNull: true
      // Structure containing physical examination findings
    },
    priorityScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Calculated score based on assessment criteria'
    },
    recommendedAction: {
      type: DataTypes.ENUM(
        'IMMEDIATE_TREATMENT',
        'URGENT_CARE',
        'STANDARD_CARE',
        'REFERRAL',
        'DISCHARGE'
      ),
      allowNull: false
    },
    referredToDepartment: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Departments',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    alerts: {
      type: DataTypes.JSONB,
      defaultValue: []
      // Array of alert objects for critical conditions
    },
    reassessmentRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reassessmentInterval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time in minutes until reassessment needed'
    },
    status: {
      type: DataTypes.ENUM(
        'IN_PROGRESS',
        'COMPLETED',
        'REASSESSED',
        'TRANSFERRED'
      ),
      defaultValue: 'IN_PROGRESS'
    }
  };

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    this.belongsTo(models.User, {
      foreignKey: 'assessedBy',
      as: 'nurse'
    });
    this.belongsTo(models.Department, {
      foreignKey: 'referredToDepartment',
      as: 'referredDepartment'
    });
    this.hasMany(models.TriageNote, {
      foreignKey: 'triageId'
    });
  }


calculatePriorityScore() {
    let score = 0;
    const vitals = this.vitalSigns;

    // Check vital signs
    if (vitals.bloodPressure?.isAbnormal) score += 2;
    if (vitals.temperature?.isAbnormal) score += 1;
    if (vitals.heartRate?.isAbnormal) score += 2;
    if (vitals.respiratoryRate?.isAbnormal) score += 2;
    if (vitals.oxygenSaturation?.isAbnormal) score += 2;

    // Check consciousness level
    switch (this.consciousness) {
      case 'UNRESPONSIVE':
        score += 10;
        break;
      case 'PAIN':
        score += 7;
        break;
      case 'VERBAL':
        score += 4;
        break;
      case 'ALERT':
        score += 0;
        break;
    }

    // Check pain score
    if (vitals.painScore?.value) {
      if (vitals.painScore.value >= 8) score += 3;
      else if (vitals.painScore.value >= 5) score += 2;
      else if (vitals.painScore.value >= 3) score += 1;
    }

    // Check critical symptoms
    if (this.symptoms && Array.isArray(this.symptoms)) {
      const criticalSymptoms = [
        'chest_pain',
        'difficulty_breathing',
        'severe_bleeding',
        'stroke_symptoms',
        'loss_of_consciousness'
      ];

      this.symptoms.forEach(symptom => {
        if (criticalSymptoms.includes(symptom.name)) {
          score += 3;
        }
      });
    }

    // Additional risk factors from medical history
    if (this.medicalHistory) {
      const riskFactors = [
        'diabetes',
        'hypertension',
        'heart_disease',
        'immunocompromised'
      ];

      riskFactors.forEach(factor => {
        if (this.medicalHistory.conditions?.includes(factor)) {
          score += 1;
        }
      });
    }

    return score;
  }

  // Method to determine triage category based on score
  determineCategory() {
    const score = this.calculatePriorityScore();
    
    if (score >= 15) return 'RED';
    if (score >= 10) return 'YELLOW';
    if (score >= 5) return 'GREEN';
    return 'GREEN';
  }

  // Method to check if reassessment is needed
  checkReassessmentNeeded() {
    const timeSinceAssessment = new Date() - new Date(this.assessmentDateTime);
    const minutesSinceAssessment = timeSinceAssessment / (1000 * 60);

    switch (this.category) {
      case 'RED':
        return minutesSinceAssessment >= 10;
      case 'YELLOW':
        return minutesSinceAssessment >= 30;
      case 'GREEN':
        return minutesSinceAssessment >= 60;
      default:
        return false;
    }
  }

  // Method to update vital signs
  async updateVitalSigns(newVitals) {
    const oldCategory = this.category;
    this.vitalSigns = {
      ...this.vitalSigns,
      ...newVitals
    };
    
    const newScore = this.calculatePriorityScore();
    const newCategory = this.determineCategory();

    if (oldCategory !== newCategory) {
      this.category = newCategory;
      this.alerts.push({
        type: 'CATEGORY_CHANGE',
        timestamp: new Date(),
        from: oldCategory,
        to: newCategory,
        reason: 'Vital signs change'
      });
    }

    await this.save();
    return this;
  }
}

module.exports = Triage;