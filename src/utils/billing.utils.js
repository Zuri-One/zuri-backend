// utils/billing.utils.js
const { Medication } = require('../models');
const { Op } = require('sequelize');

const INSURANCE_COVERAGE_LIMIT = 15000;

// Base costs before any discounts
const TRIAGE_PACKAGES = {
  BASIC_NURSING: {
    name: 'Basic Nursing Package',
    basePrice: 1000,
    items: [
      { name: 'Syringe', quantity: 1, unit: 'pc' },
      { name: 'Gloves', quantity: 2, unit: 'pairs' },
      { name: 'Gauze', quantity: 1, unit: 'roll' },
      { name: 'Nursing Fee', quantity: 1, unit: 'service' }
    ]
  },
  WOUND_DRESSING: {
    name: 'Wound Dressing Package',
    basePrice: 1500,
    items: [
      { name: 'Sterile Dressing Pack', quantity: 1, unit: 'pack' },
      { name: 'Gloves', quantity: 2, unit: 'pairs' },
      { name: 'Antiseptic Solution', quantity: 1, unit: 'bottle' },
      { name: 'Nursing Fee', quantity: 1, unit: 'service' }
    ]
  }
};

const LAB_PACKAGES = {
  BASIC_BLOOD_WORK: {
    name: 'Basic Blood Work',
    basePrice: 2500,
    items: [
      { name: 'Complete Blood Count', quantity: 1, unit: 'test' },
      { name: 'Blood Sugar', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  },
  URINE_ANALYSIS: {
    name: 'Urine Analysis Package',
    basePrice: 1800,
    items: [
      { name: 'Urinalysis', quantity: 1, unit: 'test' },
      { name: 'Culture & Sensitivity', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  },
  COMPLETE_BLOOD_COUNT: {
    name: 'Complete Blood Count (CBC)',
    basePrice: 2000,
    items: [
      { name: 'White Blood Cells Test', quantity: 1, unit: 'test' },
      { name: 'Red Blood Cells Test', quantity: 1, unit: 'test' },
      { name: 'Hemoglobin Test', quantity: 1, unit: 'test' },
      { name: 'Hematocrit Test', quantity: 1, unit: 'test' },
      { name: 'Platelets Test', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  },
  METABOLIC_PANEL: {
    name: 'Basic Metabolic Panel (BMP)',
    basePrice: 2300,
    items: [
      { name: 'Glucose Test', quantity: 1, unit: 'test' },
      { name: 'Calcium Test', quantity: 1, unit: 'test' },
      { name: 'Electrolytes Test', quantity: 1, unit: 'test' },
      { name: 'Creatinine Test', quantity: 1, unit: 'test' },
      { name: 'BUN Test', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  },
  LIPID_PANEL: {
    name: 'Lipid Panel',
    basePrice: 1900,
    items: [
      { name: 'Total Cholesterol Test', quantity: 1, unit: 'test' },
      { name: 'HDL Test', quantity: 1, unit: 'test' },
      { name: 'LDL Test', quantity: 1, unit: 'test' },
      { name: 'Triglycerides Test', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  },
  GLUCOSE_TEST: {
    name: 'Blood Glucose Test',
    basePrice: 1200,
    items: [
      { name: 'Fasting Glucose Test', quantity: 1, unit: 'test' },
      { name: 'HbA1c Test', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  },
  LIVER_FUNCTION: {
    name: 'Liver Function Test',
    basePrice: 2100,
    items: [
      { name: 'ALT Test', quantity: 1, unit: 'test' },
      { name: 'AST Test', quantity: 1, unit: 'test' },
      { name: 'ALP Test', quantity: 1, unit: 'test' },
      { name: 'GGT Test', quantity: 1, unit: 'test' },
      { name: 'Total Bilirubin Test', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  },
  KIDNEY_FUNCTION: {
    name: 'Kidney Function Test',
    basePrice: 1700,
    items: [
      { name: 'Creatinine Test', quantity: 1, unit: 'test' },
      { name: 'BUN Test', quantity: 1, unit: 'test' },
      { name: 'eGFR Test', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  },
  ELECTROLYTES_PANEL: {
    name: 'Electrolytes Panel',
    basePrice: 1600,
    items: [
      { name: 'Sodium Test', quantity: 1, unit: 'test' },
      { name: 'Potassium Test', quantity: 1, unit: 'test' },
      { name: 'Chloride Test', quantity: 1, unit: 'test' },
      { name: 'Calcium Test', quantity: 1, unit: 'test' },
      { name: 'Lab Processing Fee', quantity: 1, unit: 'service' }
    ]
  }
};

// Individual items that can be added
const INDIVIDUAL_ITEMS = {
  FLUID: {
    name: 'fluid',
    basePrice: 300,
    unit: 'bottle',
    category: 'CONSUMABLE'
  },
  STERILE_DRESSING_PACK: {
    name: 'sterile dressing pack',
    basePrice: 700,
    unit: 'pack',
    category: 'CONSUMABLE'
  },
  INFUSION: {
    name: 'Infusion',
    basePrice: 100,
    unit: 'set',
    category: 'CONSUMABLE'
  },
  SUTURE: {
    name: 'suture',
    basePrice: 100,
    unit: 'piece',
    category: 'CONSUMABLE'
  },
  NEEDLE: {
    name: 'Needle',
    basePrice: 5,
    unit: 'piece',
    category: 'CONSUMABLE'
  },
  STRAPPING: {
    name: 'Strapping',
    basePrice: 50,
    unit: 'piece',
    category: 'CONSUMABLE'
  },
  CANNULA: {
    name: 'Cannula',
    basePrice: 500,
    unit: 'piece',
    category: 'CONSUMABLE'
  }
};

// Add logging function for consistent log format
const log = (message, data = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'billing-utils',
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  console.log(JSON.stringify(logEntry));
};

/**
 * Calculate price with discount applied based on payment type
 * @param {number} basePrice - The base price of the item or package
 * @param {boolean} isInsurance - Whether the patient is paying with insurance
 * @returns {number} - The price after discount (if any)
 */
function calculateDiscountedPrice(basePrice, isInsurance = true) {
  if (!isInsurance) {
    return basePrice * 1; 
  }
  return basePrice;
}

/**
 * Get details for a specific package
 * @param {string} packageId - The ID of the package to look up
 * @param {string} type - The type of package (TRIAGE or LAB)
 * @returns {Object|null} - Details about the package or null if not found
 */
function getPackageDetails(packageId, type = 'TRIAGE') {
  const packages = type === 'TRIAGE' ? TRIAGE_PACKAGES : LAB_PACKAGES;
  return packages[packageId];
}

/**
 * Get item details from predefined items or medication database
 * @param {string} itemId - The ID of the item to look up
 * @param {string} type - The type of item (used to distinguish pharmacy items)
 * @returns {Promise<Object|null>} - Details about the item or null if not found
 */
async function getItemDetails(itemId, type = '') {
  try {
    log(`Looking up item: ${itemId}, type: ${type}`);
    
    // First check if it's a predefined item
    if (INDIVIDUAL_ITEMS[itemId]) {
      log(`Found predefined item: ${itemId}`, { item: INDIVIDUAL_ITEMS[itemId] });
      return INDIVIDUAL_ITEMS[itemId];
    }
    
    log(`Item ${itemId} not found in predefined items, checking Medications database`);

    // If type is PHARMACY or the item wasn't found in predefined items, check the medications database
    if (type === 'PHARMACY' || !INDIVIDUAL_ITEMS[itemId]) {
      try {
        // Look up the medication by ID using raw SQL to avoid column name issues
        // This works directly with the database columns as they exist based on your schema
        const medications = await Medication.sequelize.query(
          `SELECT "id", "name", "genericName", "batchNumber", "category", 
                 "type", "strength", "unitPrice", "storageLocation" 
           FROM "Medications" 
           WHERE "id" = :medicationId`,
          {
            replacements: { medicationId: itemId },
            type: Medication.sequelize.QueryTypes.SELECT
          }
        );
        
        const medication = medications && medications.length > 0 ? medications[0] : null;
        
        if (medication) {
          log(`Found medication in database: ${medication.name}`, { 
            id: medication.id,
            name: medication.name,
            unitPrice: medication.unitPrice
          });
          
          // Return medication details in a format compatible with billing
          return {
            name: medication.name,
            basePrice: parseFloat(medication.unitPrice || 0),
            unit: 'unit',
            category: 'MEDICATION',
            strength: medication.strength,
            type: medication.type || 'MEDICATION',
            batchNumber: medication.batchNumber,
            genericName: medication.genericName
          };
        } else {
          log(`Medication not found in database: ${itemId}`);
        }
      } catch (error) {
        log(`Error fetching medication details: ${error.message}`, { 
          error: error.toString(),
          stack: error.stack,
          itemId
        });
      }
    }

    log(`No item found with ID: ${itemId}`);
    // If no item was found, return null
    return null;
  } catch (error) {
    log(`Unexpected error in getItemDetails: ${error.message}`, {
      error: error.toString(),
      stack: error.stack,
      itemId
    });
    return null;
  }
}

module.exports = {
  TRIAGE_PACKAGES,
  LAB_PACKAGES,
  INDIVIDUAL_ITEMS,
  INSURANCE_COVERAGE_LIMIT,
  calculateDiscountedPrice,
  getPackageDetails,
  getItemDetails
};