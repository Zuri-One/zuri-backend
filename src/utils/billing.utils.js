// utils/billing.utils.js

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

function calculateDiscountedPrice(basePrice, isInsurance = true) {
  if (!isInsurance) {
    return basePrice * 0.85; // 15% discount for cash patients
  }
  return basePrice;
}

function getPackageDetails(packageId, type = 'TRIAGE') {
  const packages = type === 'TRIAGE' ? TRIAGE_PACKAGES : LAB_PACKAGES;
  return packages[packageId];
}

function getItemDetails(itemId) {
  return INDIVIDUAL_ITEMS[itemId];
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