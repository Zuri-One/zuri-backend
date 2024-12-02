// utils/pharmacy.util.js
const moment = require('moment');

class PharmacyUtils {
  static validateMedicationInteractions(medications) {
    const interactions = [];
    
    // Check interactions between medications
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const interaction = this.checkInteraction(medications[i], medications[j]);
        if (interaction) {
          interactions.push(interaction);
        }
      }
    }

    return interactions;
  }

  static checkInteraction(med1, med2) {
    // Implementation of drug interaction checks
    // This would typically connect to a drug interaction database
    return null;
  }

  static calculateDosage(medication, patientWeight, patientAge) {
    // Implementation of dosage calculation based on patient parameters
    return {
      recommendedDose: 0,
      frequency: '',
      duration: 0
    };
  }

  static validateExpiryDate(expiryDate) {
    const today = moment();
    const expiry = moment(expiryDate);
    const monthsUntilExpiry = expiry.diff(today, 'months');

    return {
      isValid: monthsUntilExpiry > 6,
      monthsRemaining: monthsUntilExpiry,
      isNearExpiry: monthsUntilExpiry <= 6
    };
  }

  static calculateReorderPoint(averageDailyUsage, leadTime, safetyStock) {
    return (averageDailyUsage * leadTime) + safetyStock;
  }
}

module.exports = PharmacyUtils;