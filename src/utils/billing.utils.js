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
  }
};

// Individual items that can be added
const INDIVIDUAL_ITEMS = {
  SYRINGE: {
    name: 'Syringe',
    basePrice: 50,
    unit: 'pc',
    category: 'CONSUMABLE'
  },
  GLOVES: {
    name: 'Gloves',
    basePrice: 100,
    unit: 'pair',
    category: 'CONSUMABLE'
  },
  GAUZE: {
    name: 'Gauze',
    basePrice: 200,
    unit: 'roll',
    category: 'CONSUMABLE'
  },
  BLOOD_SUGAR: {
    name: 'Blood Sugar Test',
    basePrice: 500,
    unit: 'test',
    category: 'LAB'
  },
  HIV_TEST: {
    name: 'HIV Test',
    basePrice: 800,
    unit: 'test',
    category: 'LAB'
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