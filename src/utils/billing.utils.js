// utils/billing.utils.js
const { Medication } = require('../models');
const { Op } = require('sequelize');

const INSURANCE_COVERAGE_LIMIT = 15000;

// CONSULTATION PACKAGES
const CONSULTATION_PACKAGES = {
  CON1: {
    name: 'Doctors consultation walk-in',
    basePrice: 1500,
    items: [
      { name: 'Doctor Consultation', quantity: 1, unit: 'service' }
    ]
  },
  CON2: {
    name: 'Doctor At Home Visit',
    basePrice: 6000,
    items: [
      { name: 'Home Visit Consultation', quantity: 1, unit: 'service' }
    ]
  },
  CON3: {
    name: 'Nutritionist Consultation',
    basePrice: 1500,
    items: [
      { name: 'Nutritionist Consultation', quantity: 1, unit: 'service' }
    ]
  },
  CON4: {
    name: 'Specialist Consultation',
    basePrice: 4000,
    items: [
      { name: 'Specialist Consultation', quantity: 1, unit: 'service' }
    ]
  },
  CON5: {
    name: 'Psychiatrist Consultation',
    basePrice: 6000,
    items: [
      { name: 'Psychiatrist Consultation', quantity: 1, unit: 'service' }
    ]
  }
};

// NURSING PACKAGES
const NURSING_PACKAGES = {
  NURS1: {
    name: 'Nursing Fee',
    basePrice: 1000,
    items: [
      { name: 'Nursing Service', quantity: 1, unit: 'service' }
    ]
  },
  NURS2: {
    name: 'Dressing',
    basePrice: 1500,
    items: [
      { name: 'Wound Dressing Service', quantity: 1, unit: 'service' }
    ]
  }
};

// DIAGNOSTIC PACKAGES
const DIAGNOSTIC_PACKAGES = {
  USG: {
    name: 'Ultrasound',
    basePrice: 3000,
    items: [
      { name: 'Ultrasound Examination', quantity: 1, unit: 'service' }
    ]
  },
  ECG: {
    name: 'Electrocardiogram (ECG)',
    basePrice: 3000,
    items: [
      { name: 'ECG Test', quantity: 1, unit: 'service' }
    ]
  }
};

// LABORATORY PACKAGES
const LAB_PACKAGES = {
  IZ001: {
    name: 'AFP Serum',
    basePrice: 3000,
    items: [
      { name: 'Alpha-Fetoprotein Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ002: {
    name: 'ALB Serum',
    basePrice: 750,
    items: [
      { name: 'Albumin Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ003: {
    name: 'ALP Serum',
    basePrice: 750,
    items: [
      { name: 'Alkaline Phosphatase Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ004: {
    name: 'AMH Serum',
    basePrice: 8000,
    items: [
      { name: 'Anti-Müllerian Hormone Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ005: {
    name: 'Amylase Serum',
    basePrice: 2100,
    items: [
      { name: 'Amylase Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ006: {
    name: 'BhCG (Qualitative)',
    basePrice: 500,
    items: [
      { name: 'Beta-hCG Qualitative Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ007: {
    name: 'BhCG (Quantitative)',
    basePrice: 3000,
    items: [
      { name: 'Beta-hCG Quantitative Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ008: {
    name: 'Blood grouping Antisera',
    basePrice: 500,
    items: [
      { name: 'Blood Grouping Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ009: {
    name: 'BNP',
    basePrice: 7000,
    items: [
      { name: 'B-type Natriuretic Peptide Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ010: {
    name: 'Brucella Antibody',
    basePrice: 1800,
    items: [
      { name: 'Brucella Antibody Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ011: {
    name: 'BUN',
    basePrice: 1000,
    items: [
      { name: 'Blood Urea Nitrogen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ012: {
    name: 'CA 125 ovarian',
    basePrice: 3800,
    items: [
      { name: 'CA 125 Ovarian Cancer Marker', quantity: 1, unit: 'test' }
    ]
  },
  IZ013: {
    name: 'CA 15-3',
    basePrice: 3800,
    items: [
      { name: 'CA 15-3 Cancer Marker', quantity: 1, unit: 'test' }
    ]
  },
  IZ014: {
    name: 'CA 19-9 pancreatic',
    basePrice: 3800,
    items: [
      { name: 'CA 19-9 Pancreatic Cancer Marker', quantity: 1, unit: 'test' }
    ]
  },
  IZ015: {
    name: 'Calcium Serum',
    basePrice: 900,
    items: [
      { name: 'Calcium Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ016: {
    name: 'CBC + PBS',
    basePrice: 1800,
    items: [
      { name: 'Complete Blood Count + Peripheral Blood Smear', quantity: 1, unit: 'test' }
    ]
  },
  IZ017: {
    name: 'CD4/CD8',
    basePrice: 4000,
    items: [
      { name: 'CD4/CD8 T-Cell Count', quantity: 1, unit: 'test' }
    ]
  },
  IZ018: {
    name: 'CEA',
    basePrice: 3000,
    items: [
      { name: 'Carcinoembryonic Antigen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ019: {
    name: 'Chlamydia',
    basePrice: 2400,
    items: [
      { name: 'Chlamydia Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ021: {
    name: 'CK-MB Quantitative',
    basePrice: 3500,
    items: [
      { name: 'Creatine Kinase-MB Quantitative Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ022: {
    name: 'CMV IgG, serum',
    basePrice: 4000,
    items: [
      { name: 'Cytomegalovirus IgG Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ023: {
    name: 'CMV IgM, serum',
    basePrice: 4000,
    items: [
      { name: 'Cytomegalovirus IgM Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ024: {
    name: 'Complete Blood Count',
    basePrice: 900,
    items: [
      { name: 'Complete Blood Count Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ025: {
    name: 'C-Peptide',
    basePrice: 3800,
    items: [
      { name: 'C-Peptide Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ026: {
    name: 'Creatinine Serum',
    basePrice: 700,
    items: [
      { name: 'Creatinine Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ027: {
    name: 'Creatinine clearance',
    basePrice: 2500,
    items: [
      { name: 'Creatinine Clearance Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ028: {
    name: 'Creatinine CPK',
    basePrice: 1200,
    items: [
      { name: 'Creatinine CPK Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ029: {
    name: 'CRP (hsCRP+CRP)',
    basePrice: 2100,
    items: [
      { name: 'C-Reactive Protein (High Sensitivity + Regular)', quantity: 1, unit: 'test' }
    ]
  },
  IZ030: {
    name: 'CRP (Qualitative)',
    basePrice: 1900,
    items: [
      { name: 'C-Reactive Protein Qualitative Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ031: {
    name: 'CRP, Uric Acid, Rheumatoid Factor',
    basePrice: 3000,
    items: [
      { name: 'CRP, Uric Acid, Rheumatoid Factor Panel', quantity: 1, unit: 'test' }
    ]
  },
  IZ032: {
    name: 'CRP/PCT',
    basePrice: 7200,
    items: [
      { name: 'C-Reactive Protein/Procalcitonin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ033: {
    name: 'Cryptococcal Antigen test (CRAG)',
    basePrice: 2900,
    items: [
      { name: 'Cryptococcal Antigen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ034: {
    name: 'Cytopack (Pap Smear)',
    basePrice: 2100,
    items: [
      { name: 'Pap Smear Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ035: {
    name: 'D-Dimer',
    basePrice: 3200,
    items: [
      { name: 'D-Dimer Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ036: {
    name: 'Dengue',
    basePrice: 2900,
    items: [
      { name: 'Dengue Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ037: {
    name: 'Ds DNA (Autoimmune Antibody Test)',
    basePrice: 4000,
    items: [
      { name: 'Double-stranded DNA Autoimmune Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ038: {
    name: 'ESR',
    basePrice: 500,
    items: [
      { name: 'Erythrocyte Sedimentation Rate', quantity: 1, unit: 'test' }
    ]
  },
  IZ039: {
    name: 'Estradiol (E2)',
    basePrice: 3200,
    items: [
      { name: 'Estradiol Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ040: {
    name: 'PSA Total serum',
    basePrice: 3200,
    items: [
      { name: 'Prostate Specific Antigen Total Serum', quantity: 1, unit: 'test' }
    ]
  },
  IZ041: {
    name: 'PSA Rapid Qualitative',
    basePrice: 500,
    items: [
      { name: 'PSA Rapid Qualitative Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ042: {
    name: 'FSH',
    basePrice: 3000,
    items: [
      { name: 'Follicle Stimulating Hormone Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ043: {
    name: 'FT3',
    basePrice: 2000,
    items: [
      { name: 'Free Triiodothyronine Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ044: {
    name: 'FT4',
    basePrice: 2000,
    items: [
      { name: 'Free Thyroxine Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ045: {
    name: 'GGT',
    basePrice: 800,
    items: [
      { name: 'Gamma-Glutamyl Transferase Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ046: {
    name: 'Gonhorrea Antigen',
    basePrice: 2400,
    items: [
      { name: 'Gonorrhea Antigen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ047: {
    name: 'GOT/AST',
    basePrice: 950,
    items: [
      { name: 'Aspartate Aminotransferase Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ048: {
    name: 'GPT/ALT',
    basePrice: 950,
    items: [
      { name: 'Alanine Aminotransferase Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ049: {
    name: 'H pylori Ag',
    basePrice: 2200,
    items: [
      { name: 'Helicobacter Pylori Antigen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ050: {
    name: 'Hemoglobin',
    basePrice: 600,
    items: [
      { name: 'Hemoglobin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ051: {
    name: 'Hb Electrophoresis',
    basePrice: 6500,
    items: [
      { name: 'Hemoglobin Electrophoresis Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ052: {
    name: 'HbA1c',
    basePrice: 2200,
    items: [
      { name: 'Glycated Hemoglobin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ053: {
    name: 'Hep B (Surface Ag)',
    basePrice: 1000,
    items: [
      { name: 'Hepatitis B Surface Antigen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ054: {
    name: 'Hep C (Ab)',
    basePrice: 1000,
    items: [
      { name: 'Hepatitis C Antibody Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ055: {
    name: 'High Vaginal Swab',
    basePrice: 1500,
    items: [
      { name: 'High Vaginal Swab Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ056: {
    name: 'HIV (Confirmation - First Response)',
    basePrice: 800,
    items: [
      { name: 'HIV Confirmation Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ057: {
    name: 'HIV Determine',
    basePrice: 500,
    items: [
      { name: 'HIV Determine Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ058: {
    name: 'HIV ELISA',
    basePrice: 3000,
    items: [
      { name: 'HIV ELISA Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ059: {
    name: 'Insulin',
    basePrice: 4200,
    items: [
      { name: 'Insulin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ060: {
    name: 'LDH',
    basePrice: 1500,
    items: [
      { name: 'Lactate Dehydrogenase Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ061: {
    name: 'LH',
    basePrice: 3000,
    items: [
      { name: 'Luteinizing Hormone Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ062: {
    name: 'Lipase',
    basePrice: 2100,
    items: [
      { name: 'Lipase Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ063: {
    name: 'Lipid Profile (TChol, TG, HDL, LDL)',
    basePrice: 2200,
    items: [
      { name: 'Complete Lipid Profile', quantity: 1, unit: 'test' }
    ]
  },
  IZ064: {
    name: 'Total Cholesterol',
    basePrice: 950,
    items: [
      { name: 'Total Cholesterol Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ065: {
    name: 'HDL',
    basePrice: 950,
    items: [
      { name: 'HDL Cholesterol Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ066: {
    name: 'LDL',
    basePrice: 950,
    items: [
      { name: 'LDL Cholesterol Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ067: {
    name: 'Malaria Ag',
    basePrice: 800,
    items: [
      { name: 'Malaria Antigen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ068: {
    name: 'Malaria Blood Smear',
    basePrice: 600,
    items: [
      { name: 'Malaria Blood Smear Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ069: {
    name: 'Magnesium Serum',
    basePrice: 1050,
    items: [
      { name: 'Magnesium Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ070: {
    name: 'Microalbumin',
    basePrice: 2100,
    items: [
      { name: 'Microalbumin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ071: {
    name: 'Myoglobulin',
    basePrice: 3500,
    items: [
      { name: 'Myoglobin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ072: {
    name: 'Na+, K+, Cl- (Electrolytes)',
    basePrice: 1200,
    items: [
      { name: 'Electrolytes Panel', quantity: 1, unit: 'test' }
    ]
  },
  IZ073: {
    name: 'NT pro BNP',
    basePrice: 7000,
    items: [
      { name: 'NT-proBNP Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ074: {
    name: 'ANC Profile',
    basePrice: 5000,
    items: [
      { name: 'Antenatal Care Profile', quantity: 1, unit: 'test' }
    ]
  },
  IZ075: {
    name: 'PCT',
    basePrice: 6800,
    items: [
      { name: 'Procalcitonin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ076: {
    name: 'Peripheral Blood Smear (PBS)',
    basePrice: 1100,
    items: [
      { name: 'Peripheral Blood Smear Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ077: {
    name: 'Phosphate',
    basePrice: 800,
    items: [
      { name: 'Phosphate Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ078: {
    name: 'Procalcitonin',
    basePrice: 7000,
    items: [
      { name: 'Procalcitonin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ079: {
    name: 'Progesterone',
    basePrice: 3200,
    items: [
      { name: 'Progesterone Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ080: {
    name: 'PT/INR',
    basePrice: 1700,
    items: [
      { name: 'Prothrombin Time/INR Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ081: {
    name: 'PTH (Parathyroid Hormone)',
    basePrice: 5000,
    items: [
      { name: 'Parathyroid Hormone Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ082: {
    name: 'Culture & sensitivity Pus Swab',
    basePrice: 3000,
    items: [
      { name: 'Pus Swab Culture & Sensitivity', quantity: 1, unit: 'test' }
    ]
  },
  IZ083: {
    name: 'Random Blood Sugar',
    basePrice: 400,
    items: [
      { name: 'Random Blood Sugar Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ084: {
    name: 'Rheumatoid Factor',
    basePrice: 1500,
    items: [
      { name: 'Rheumatoid Factor Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ085: {
    name: 'Liver Function Test',
    basePrice: 3000,
    items: [
      { name: 'Liver Function Test Panel', quantity: 1, unit: 'test' }
    ]
  },
  IZ086: {
    name: 'Rota/adeno',
    basePrice: 2400,
    items: [
      { name: 'Rotavirus/Adenovirus Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ087: {
    name: 'Salmonella Ag',
    basePrice: 1800,
    items: [
      { name: 'Salmonella Antigen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ088: {
    name: 'SARS-CoV-2 Ag',
    basePrice: 2500,
    items: [
      { name: 'SARS-CoV-2 Antigen Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ089: {
    name: 'SARS-CoV-2 PCR',
    basePrice: 6000,
    items: [
      { name: 'SARS-CoV-2 PCR Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ090: {
    name: 'Stool Culture & Sensitivity',
    basePrice: 3400,
    items: [
      { name: 'Stool Culture & Sensitivity Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ091: {
    name: 'Stool microscopy',
    basePrice: 600,
    items: [
      { name: 'Stool Microscopy Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ092: {
    name: 'Syphilis VDRL',
    basePrice: 700,
    items: [
      { name: 'Syphilis VDRL Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ093: {
    name: 'Total Bilirubin',
    basePrice: 950,
    items: [
      { name: 'Total Bilirubin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ094: {
    name: 'TB Gene Expert',
    basePrice: 7000,
    items: [
      { name: 'TB GeneXpert Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ095: {
    name: 'TB gold Quantiferon',
    basePrice: 11400,
    items: [
      { name: 'TB Gold QuantiFERON Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ096: {
    name: 'Testosterone',
    basePrice: 3200,
    items: [
      { name: 'Testosterone Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ097: {
    name: 'Thyroid Function',
    basePrice: 5000,
    items: [
      { name: 'Thyroid Function Test Panel', quantity: 1, unit: 'test' }
    ]
  },
  IZ098: {
    name: 'Total Protein',
    basePrice: 950,
    items: [
      { name: 'Total Protein Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ099: {
    name: 'Toxoplasma IgG',
    basePrice: 3700,
    items: [
      { name: 'Toxoplasma IgG Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ100: {
    name: 'Toxoplasma IgM',
    basePrice: 3700,
    items: [
      { name: 'Toxoplasma IgM Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ101: {
    name: 'Troponin',
    basePrice: 5000,
    items: [
      { name: 'Troponin Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ102: {
    name: 'TSH',
    basePrice: 1900,
    items: [
      { name: 'Thyroid Stimulating Hormone Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ103: {
    name: 'UECs (Urea, Electrolytes, Creatinine)',
    basePrice: 2600,
    items: [
      { name: 'Urea, Electrolytes, Creatinine Panel', quantity: 1, unit: 'test' }
    ]
  },
  IZ104: {
    name: 'Urea, Electrolytes',
    basePrice: 2200,
    items: [
      { name: 'Urea & Electrolytes Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ105: {
    name: 'Uric acid',
    basePrice: 900,
    items: [
      { name: 'Uric Acid Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ106: {
    name: 'Urinalysis',
    basePrice: 400,
    items: [
      { name: 'Urinalysis Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ107: {
    name: 'Urine Culture & Sensitivity',
    basePrice: 3000,
    items: [
      { name: 'Urine Culture & Sensitivity Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ108: {
    name: 'Vitamin B12',
    basePrice: 3550,
    items: [
      { name: 'Vitamin B12 Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ109: {
    name: 'Vitamin D',
    basePrice: 4700,
    items: [
      { name: 'Vitamin D Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ110: {
    name: 'ZN stain',
    basePrice: 1800,
    items: [
      { name: 'Ziehl-Neelsen Stain Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ111: {
    name: 'Cortisol Serum',
    basePrice: 4200,
    items: [
      { name: 'Cortisol Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ112: {
    name: 'Urea Serum',
    basePrice: 1000,
    items: [
      { name: 'Urea Serum Test', quantity: 1, unit: 'test' }
    ]
  },
  IZ113: {
    name: 'Zuri Vital Wellness Package - Female',
    basePrice: 5000,
    items: [
      { name: 'Vital Wellness Package for Female', quantity: 1, unit: 'package' }
    ]
  },
  IZ114: {
    name: 'Zuri Total Wellness Package - Female',
    basePrice: 7000,
    items: [
      { name: 'Total Wellness Package for Female', quantity: 1, unit: 'package' }
    ]
  },
  IZ115: {
    name: 'Zuri Power Wellness Package - Female',
    basePrice: 12000,
    items: [
      { name: 'Power Wellness Package for Female', quantity: 1, unit: 'package' }
    ]
  },
  IZ116: {
    name: 'Zuri Comprehensive Wellness Package - Female',
    basePrice: 20000,
    items: [
      { name: 'Comprehensive Wellness Package for Female', quantity: 1, unit: 'package' }
    ]
  },
  IZ117: {
    name: 'Zuri Advanced Wellness Package - Female',
    basePrice: 25000,
    items: [
      { name: 'Advanced Wellness Package for Female', quantity: 1, unit: 'package' }
    ]
  },
  IZ118: {
    name: 'Zuri Vital Wellness Package - Male',
    basePrice: 5000,
    items: [
      { name: 'Vital Wellness Package for Male', quantity: 1, unit: 'package' }
    ]
  },
  IZ119: {
    name: 'Zuri Total Wellness Package - Male',
    basePrice: 7000,
    items: [
      { name: 'Total Wellness Package for Male', quantity: 1, unit: 'package' }
    ]
  },
  IZ120: {
    name: 'Zuri Power Wellness Package - Male',
    basePrice: 12000,
    items: [
      { name: 'Power Wellness Package for Male', quantity: 1, unit: 'package' }
    ]
  },
  IZ121: {
    name: 'Zuri Comprehensive Wellness Package - Male',
    basePrice: 20000,
    items: [
      { name: 'Comprehensive Wellness Package for Male', quantity: 1, unit: 'package' }
    ]
  },
  IZ122: {
    name: 'Zuri Advanced Wellness Package - Male',
    basePrice: 25000,
    items: [
      { name: 'Advanced Wellness Package for Male', quantity: 1, unit: 'package' }
    ]
  },
  // Additional standalone test
  FECAL_OCCULT_BLOOD: {
    name: 'Fecal Occult Blood',
    basePrice: 2000,
    items: [
      { name: 'Fecal Occult Blood Test', quantity: 1, unit: 'test' }
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
 * @param {string} type - The type of package (CONSULTATION, NURSING, DIAGNOSTIC, LAB)
 * @returns {Object|null} - Details about the package or null if not found
 */
function getPackageDetails(packageId, type = 'LAB') {
  let packages;
  
  switch (type.toUpperCase()) {
    case 'CONSULTATION':
      packages = CONSULTATION_PACKAGES;
      break;
    case 'NURSING':
      packages = NURSING_PACKAGES;
      break;
    case 'DIAGNOSTIC':
      packages = DIAGNOSTIC_PACKAGES;
      break;
    case 'LAB':
    default:
      packages = LAB_PACKAGES;
      break;
  }
  
  return packages[packageId] || null;
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

/**
 * Get all packages by category
 * @param {string} category - The category to filter by (CONSULTATION, NURSING, DIAGNOSTIC, LAB)
 * @returns {Object} - All packages in the specified category
 */
function getPackagesByCategory(category) {
  switch (category.toUpperCase()) {
    case 'CONSULTATION':
      return CONSULTATION_PACKAGES;
    case 'NURSING':
      return NURSING_PACKAGES;
    case 'DIAGNOSTIC':
      return DIAGNOSTIC_PACKAGES;
    case 'LAB':
      return LAB_PACKAGES;
    default:
      return {};
  }
}

/**
 * Search packages by name
 * @param {string} searchTerm - The term to search for
 * @returns {Array} - Array of matching packages with their IDs and categories
 */
function searchPackages(searchTerm) {
  const results = [];
  const term = searchTerm.toLowerCase();
  
  // Search in all package categories
  const categories = [
    { name: 'CONSULTATION', packages: CONSULTATION_PACKAGES },
    { name: 'NURSING', packages: NURSING_PACKAGES },
    { name: 'DIAGNOSTIC', packages: DIAGNOSTIC_PACKAGES },
    { name: 'LAB', packages: LAB_PACKAGES }
  ];
  
  categories.forEach(category => {
    Object.entries(category.packages).forEach(([id, pkg]) => {
      if (pkg.name.toLowerCase().includes(term)) {
        results.push({
          id,
          category: category.name,
          name: pkg.name,
          basePrice: pkg.basePrice
        });
      }
    });
  });
  
  return results;
}

module.exports = {
  CONSULTATION_PACKAGES,
  NURSING_PACKAGES,
  DIAGNOSTIC_PACKAGES,
  LAB_PACKAGES,
  INDIVIDUAL_ITEMS,
  INSURANCE_COVERAGE_LIMIT,
  calculateDiscountedPrice,
  getPackageDetails,
  getItemDetails,
  getPackagesByCategory,
  searchPackages
};