const fs = require('fs').promises;
const path = require('path');

class LabTestCatalogService {
  constructor() {
    this.catalogPath = path.join(__dirname, '../data/lab-test-catalog.json');
    this.catalog = null;
    this.lastModified = null;
  }

  // Load catalog from file with caching
  async loadCatalog() {
    try {
      const stats = await fs.stat(this.catalogPath);
      
      // Check if we need to reload (file changed or first load)
      if (!this.catalog || stats.mtime > this.lastModified) {
        const data = await fs.readFile(this.catalogPath, 'utf8');
        this.catalog = JSON.parse(data);
        this.lastModified = stats.mtime;
      }
      
      return this.catalog;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create default catalog
        await this.createDefaultCatalog();
        return this.catalog;
      }
      throw error;
    }
  }

  // Save catalog to file
  async saveCatalog() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.catalogPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.catalogPath, JSON.stringify(this.catalog, null, 2));
      this.lastModified = new Date();
    } catch (error) {
      throw new Error(`Failed to save catalog: ${error.message}`);
    }
  }

  // Create default catalog with initial tests
  async createDefaultCatalog() {
    this.catalog = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      categories: {
        "HEMATOLOGY": {
          name: "Hematology",
          description: "Blood cell analysis and coagulation studies"
        },
        "CLINICAL_CHEMISTRY": {
          name: "Clinical Chemistry", 
          description: "Blood chemistry and metabolic panels"
        },
        "MICROBIOLOGY": {
          name: "Microbiology",
          description: "Bacterial, viral, and fungal testing"
        },
        "IMMUNOLOGY": {
          name: "Immunology",
          description: "Immune system and antibody testing"
        },
        "URINALYSIS": {
          name: "Urinalysis",
          description: "Urine analysis and microscopy"
        },
        "ENDOCRINOLOGY": {
          name: "Endocrinology",
          description: "Hormone and endocrine function tests"
        },
        "RAPID_DIAGNOSTICS": {
          name: "Rapid Diagnostics",
          description: "Rapid diagnostic tests and point-of-care testing"
        },
        "TUMOR_MARKERS": {
          name: "Tumor Markers", 
          description: "Cancer screening and monitoring tests"
        },
        "BIOCHEMISTRY": {
          name: "Biochemistry (Renal/Electrolyte/Bone)",
          description: "Blood chemistry, kidney function, and electrolyte tests"
        },
        "PANCREAS": {
          name: "Pancreas",
          description: "Pancreatic function tests"
        },
        "INFLAMMATION_IMMUNE": {
          name: "Inflammation/Immune",
          description: "Inflammatory markers and immune system tests"
        },
        "LIPID_PROFILE": {
          name: "Lipid Profile/Cardiac Risk",
          description: "Cholesterol and cardiovascular risk assessment"
        },
        "THYROID": {
          name: "Endocrine(Thyroid)",
          description: "Thyroid function tests"
        },
        "REPRODUCTIVE": {
          name: "Endocrine-Reproductive", 
          description: "Reproductive hormone tests"
        },
        "STOOL_ANALYSIS": {
          name: "Urinalysis/HVS W Prep & Gram Stain(Stool Analysis)",
          description: "Stool analysis and culture tests"
        },
        "LIVER_PANEL": {
          name: "Liver Panel(Liver Function Tests)",
          description: "Liver function and hepatic panel tests"
        },
        "CYTOLOGY": {
          name: "Cytology",
          description: "Cellular analysis and cytological examinations"
        },
        "COAGULATION": {
          name: "Coagulation",
          description: "Blood clotting and coagulation studies"
        },
        "AUTOIMMUNE": {
          name: "Autoimmune",
          description: "Autoimmune and rheumatological tests"
        },
        "CARDIAC_MARKERS": {
          name: "Cardiac Markers",
          description: "Heart function and cardiac risk markers"
        },
        "VITAMINS": {
          name: "Vitamins",
          description: "Vitamin and nutritional status tests"
        }
      },
      tests: {
        "CBC_COMPREHENSIVE": {
          id: "CBC_COMPREHENSIVE",
          name: "Complete Blood Count",
          displayName: "Complete Blood Count",
          category: "HEMATOLOGY",
          description: "Complete analysis of blood cells including RBC, WBC, platelets and differential",
          sampleType: "Blood",
          sampleVolume: "3-5 mL",
          container: "EDTA tube (Purple top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "2-4 hours",
          price: 1500,
          active: true,
          parameters: [
            {
              code: "WBC",
              name: "White Blood Cells",
              unit: "10^9/L",
              referenceRanges: {
                adult: { min: 4, max: 10 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "GRAN_PCT",
              name: "Granulocytes %",
              unit: "%",
              referenceRanges: {
                adult: { min: 40, max: 70 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "LYMPH_PCT",
              name: "Lymph %",
              unit: "%",
              referenceRanges: {
                adult: { min: 20, max: 50 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "MID_PCT",
              name: "Mid %",
              unit: "%",
              referenceRanges: {
                adult: { min: 1, max: 15 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "RBC",
              name: "Red Blood Cells",
              unit: "10^9/L",
              referenceRanges: {
                adult: { min: 3.5, max: 5.5 }
              },
              dataType: "numeric",
              precision: 2
            },
            {
              code: "HGB",
              name: "Hemoglobin",
              unit: "g/dl",
              referenceRanges: {
                adult: { min: 12, max: 16 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "HCT",
              name: "Hematocrit",
              unit: "%",
              referenceRanges: {
                adult: { min: 37, max: 54 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "MCV",
              name: "Mean Cell Volume",
              unit: "fL",
              referenceRanges: {
                adult: { min: 80, max: 100 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "MCH",
              name: "Mean Cell Hemoglobin",
              unit: "pg",
              referenceRanges: {
                adult: { min: 27, max: 34 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "MCHC",
              name: "Mean Cell Hemoglobin Concentration",
              unit: "g/dL",
              referenceRanges: {
                adult: { min: 31, max: 37 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "RDW_SD",
              name: "RDW-SD",
              unit: "fL",
              referenceRanges: {
                adult: { min: 35, max: 56 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "MONOCYTES",
              name: "Monocytes",
              unit: "%",
              referenceRanges: {
                adult: { min: 3, max: 12 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "MPV",
              name: "Mean Platelet Volume",
              unit: "fL",
              referenceRanges: {
                adult: { min: 6.5, max: 12 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "EOSINOPHILS",
              name: "Eosinophils",
              unit: "%",
              referenceRanges: {
                adult: { min: 0.5, max: 5 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "BASOPHILS",
              name: "Basophils",
              unit: "%",
              referenceRanges: {
                adult: { min: 0, max: 1 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "LYM_ABS",
              name: "Lym#",
              unit: "10^9/L",
              referenceRanges: {
                adult: { min: 0.8, max: 4 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "BASOPHIL_ABS",
              name: "Basophil#",
              unit: "10^3/uL",
              referenceRanges: {
                adult: { min: 0.02, max: 0.1 }
              },
              dataType: "numeric",
              precision: 2
            },
            {
              code: "MID_ABS",
              name: "Mid #",
              unit: "10^9/L",
              referenceRanges: {
                adult: { min: 0.1, max: 1.8 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "GRAN_ABS",
              name: "Gran #",
              unit: "Absolute Value",
              referenceRanges: {
                adult: { min: 2, max: 7 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "PCT",
              name: "PCT-",
              unit: "%",
              referenceRanges: {
                adult: { min: 0.108, max: 0.282 }
              },
              dataType: "numeric",
              precision: 3
            },
            {
              code: "MON_ABS",
              name: "mon#",
              unit: "10^3/uL",
              referenceRanges: {
                adult: { min: 0.2, max: 1.2 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "RDW_CV",
              name: "RDW-CV",
              unit: "%",
              referenceRanges: {
                adult: { min: 11, max: 16 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "PLT",
              name: "Platelets",
              unit: "10^9/L",
              referenceRanges: {
                adult: { min: 100, max: 400 }
              },
              dataType: "numeric",
              precision: 0
            },
            {
              code: "ESR_MALE",
              name: "ESR (male)",
              unit: "mm/Hr",
              referenceRanges: {
                adult: { min: 1, max: 20 }
              },
              dataType: "numeric",
              precision: 0
            },
            {
              code: "ESR_FEMALE",
              name: "ESR (female)",
              unit: "mm/Hr",
              referenceRanges: {
                adult: { min: 0, max: 20 }
              },
              dataType: "numeric",
              precision: 0
            }
          ]
        },

        "AFP_SERUM": {
          id: "AFP_SERUM",
          name: "AFP Serum",
          displayName: "AFP Serum",
          category: "TUMOR_MARKERS",
          description: "Alpha-fetoprotein tumor marker",
          sampleType: "Blood",
          sampleVolume: "5 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "4-6 hours",
          price: 2500,
          active: true,
          parameters: [
            {
              code: "AFP_LAB",
              name: "AFP-Alpha Feto Protein Lab Test",
              unit: "IU/mL",
              referenceRanges: {
                adult: { min: 0, max: 5.8 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "AFP_PROTEIN",
              name: "alpha-feto-protein",
              unit: "ng/ml",
              referenceRanges: {
                adult: { min: 0, max: 20 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "CREATININE_SERUM": {
          id: "CREATININE_SERUM",
          name: "Creatinine Serum",
          displayName: "Creatinine Serum",
          category: "BIOCHEMISTRY",
          description: "Kidney function assessment",
          sampleType: "Blood",
          sampleVolume: "3 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "2-4 hours",
          price: 800,
          active: true,
          parameters: [
            {
              code: "CREAT_MEN",
              name: "Creatinine (Adult Men)",
              unit: "mmol/L",
              referenceRanges: {
                adult_male: { min: 44, max: 123 }
              },
              dataType: "numeric",
              precision: 0
            },
            {
              code: "CREAT_ADULT",
              name: "Creatinine (Adult)",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 44, max: 123 }
              },
              dataType: "numeric",
              precision: 0
            }
          ]
        },

        "UREA_SERUM": {
          id: "UREA_SERUM",
          name: "Urea Serum",
          displayName: "Urea Serum",
          category: "BIOCHEMISTRY",
          description: "Kidney function marker",
          sampleType: "Blood",
          sampleVolume: "3 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "2-4 hours",
          price: 600,
          active: true,
          parameters: [
            {
              code: "UREA",
              name: "Urea",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 1.7, max: 8.2 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "URIC_ACID": {
          id: "URIC_ACID",
          name: "Uric Acid",
          displayName: "Uric Acid",
          category: "BIOCHEMISTRY",
          description: "Uric acid levels assessment",
          sampleType: "Blood Serum",
          sampleVolume: "3 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "2-4 hours",
          price: 700,
          active: true,
          parameters: [
            {
              code: "URIC_ACID_1",
              name: "Uric Acid Levels",
              unit: "umol/L",
              referenceRanges: {
                adult: { min: 214, max: 488 }
              },
              dataType: "numeric",
              precision: 0
            },
            {
              code: "URIC_ACID_SERUM",
              name: "Uric Acid Serum",
              unit: "mg/dL",
              referenceRanges: {
                adult: { min: 1.5, max: 6 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "URIC_ACID_2",
              name: "Uric Acid Levels.",
              unit: "umol/L",
              referenceRanges: {
                adult: { min: 155, max: 357 }
              },
              dataType: "numeric",
              precision: 0
            }
          ]
        },

        "RANDOM_BLOOD_SUGAR": {
          id: "RANDOM_BLOOD_SUGAR",
          name: "Random Blood Sugar",
          displayName: "Random Blood Sugar",
          category: "CLINICAL_CHEMISTRY",
          description: "Random glucose level assessment",
          sampleType: "Blood",
          sampleVolume: "3 mL",
          container: "Fluoride tube (Gray top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "1-2 hours",
          price: 500,
          active: true,
          parameters: [
            {
              code: "RBS",
              name: "Random blood sugar",
              unit: "mmol/l",
              referenceRanges: {
                adult: { min: 3.8, max: 7.8 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "FASTING_BLOOD_SUGAR": {
          id: "FASTING_BLOOD_SUGAR",
          name: "Fasting Blood Sugar",
          displayName: "Fasting Blood Sugar",
          category: "CLINICAL_CHEMISTRY",
          description: "Fasting glucose level assessment",
          sampleType: "Blood",
          sampleVolume: "3 mL",
          container: "Fluoride tube (Gray top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: true,
          fastingHours: 8,
          turnaroundTime: "1-2 hours",
          price: 500,
          active: true,
          parameters: [
            {
              code: "FBS",
              name: "FBS",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 3.9, max: 6.9 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "LIPID_PROFILE_COMPREHENSIVE": {
          id: "LIPID_PROFILE_COMPREHENSIVE",
          name: "Lipid Profile (TChol, TG, HDL, LDL)",
          displayName: "Lipid Profile (TChol, TG, HDL, LDL)",
          category: "LIPID_PROFILE",
          description: "Comprehensive lipid analysis",
          sampleType: "Blood",
          sampleVolume: "5 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: true,
          fastingHours: 12,
          turnaroundTime: "4-6 hours",
          price: 2500,
          active: true,
          parameters: [
            {
              code: "TOTAL_CHOL",
              name: "Total Cholesterol",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 0, max: 5.7 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "TRIGLYCERIDES",
              name: "Triglycerides-TG",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 0, max: 2.3 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "HDL_CHOL",
              name: "High density lipoprotein -HDL",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 0.9, max: 2.24 }
              },
              dataType: "numeric",
              precision: 2
            },
            {
              code: "LDL_CHOL",
              name: "Low density lipoprotein -LDL",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 1, max: 3.9 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "CHOL_HDL_RATIO",
              name: "Total cholesterol/HDL Ratio",
              unit: "",
              referenceRanges: {
                adult: { min: 0, max: 5 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "NON_HDL_CHOL",
              name: "Non HDL Cholesterol",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 3.4, max: 4.1 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "CA_125": {
          id: "CA_125",
          name: "CA 125 Ovarian",
          displayName: "CA 125 Ovarian",
          category: "TUMOR_MARKERS",
          description: "Ovarian cancer marker",
          sampleType: "Blood",
          sampleVolume: "5 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "4-6 hours",
          price: 3000,
          active: true,
          parameters: [
            {
              code: "CA125",
              name: "CA 125",
              unit: "U/mL",
              referenceRanges: {
                adult: { min: 0, max: 35 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "CA_19_9": {
          id: "CA_19_9",
          name: "CA 19-9 Pancreatic",
          displayName: "CA 19-9 Pancreatic",
          category: "TUMOR_MARKERS",
          description: "Pancreatic cancer marker",
          sampleType: "Blood",
          sampleVolume: "5 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "4-6 hours",
          price: 3000,
          active: true,
          parameters: [
            {
              code: "CA19_9",
              name: "CA 19-9",
              unit: "U/mL",
              referenceRanges: {
                adult: { min: 0, max: 37 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "HBA1C_COMPREHENSIVE": {
          id: "HBA1C_COMPREHENSIVE",
          name: "Hemoglobin A1c (HbA1c)",
          displayName: "Hemoglobin A1c (HbA1c)",
          category: "ENDOCRINOLOGY",
          description: "Long-term blood glucose control assessment",
          sampleType: "Blood",
          sampleVolume: "3 mL",
          container: "EDTA tube (Purple top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "4-6 hours",
          price: 2200,
          active: true,
          parameters: [
            {
              code: "HBA1C_GLYCATED",
              name: "HbA1C - Glycated Haemoglobin",
              unit: "%",
              referenceRanges: {
                adult: { min: 4, max: 5.7 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "HBA1C_IFCC",
              name: "HbA1C (IFCC)",
              unit: "mmol/mol",
              referenceRanges: {
                adult: { min: 0, max: 39 }
              },
              dataType: "numeric",
              precision: 0
            },
            {
              code: "EAG",
              name: "Estimated Average Glucose (eAG)",
              unit: "mmol/L",
              referenceRanges: {
                adult: { min: 0, max: 8.6 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "CEA": {
          id: "CEA",
          name: "CEA",
          displayName: "CEA",
          category: "TUMOR_MARKERS",
          description: "Carcinoembryonic antigen tumor marker",
          sampleType: "Blood Serum",
          sampleVolume: "5 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "4-6 hours",
          price: 2500,
          active: true,
          parameters: [
            {
              code: "CEA_NON_SMOKERS",
              name: "CEA Non-Smokers",
              unit: "ng/mL",
              referenceRanges: {
                adult: { min: 0, max: 2.5 }
              },
              dataType: "numeric",
              precision: 1
            },
            {
              code: "CEA_ANTIGEN",
              name: "CarcinoEmbryonic Antigen",
              unit: "ng/mL",
              referenceRanges: {
                adult: { min: 0, max: 5 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "ALB_SERUM": {
          id: "ALB_SERUM",
          name: "ALB Serum",
          displayName: "ALB Serum",
          category: "LIVER_PANEL",
          description: "Albumin serum level",
          sampleType: "Blood Serum",
          sampleVolume: "3 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "2-4 hours",
          price: 800,
          active: true,
          parameters: [
            {
              code: "ALBUMIN",
              name: "Albumin",
              unit: "g/dL",
              referenceRanges: {
                adult: { min: 35, max: 55 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "ALP_SERUM": {
          id: "ALP_SERUM",
          name: "ALP Serum",
          displayName: "ALP Serum",
          category: "LIVER_PANEL",
          description: "Alkaline phosphatase",
          sampleType: "Blood",
          sampleVolume: "3 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "2-4 hours",
          price: 800,
          active: true,
          parameters: [
            {
              code: "ALP",
              name: "ALP",
              unit: "U/L",
              referenceRanges: {
                adult: { min: 45, max: 135 }
              },
              dataType: "numeric",
              precision: 0
            }
          ]
        },

        "AMH_SERUM": {
          id: "AMH_SERUM",
          name: "AMH Serum",
          displayName: "AMH Serum",
          category: "REPRODUCTIVE",
          description: "Anti-Mullerian hormone",
          sampleType: "Blood",
          sampleVolume: "3 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "4-6 hours",
          price: 3500,
          active: true,
          parameters: [
            {
              code: "AMH",
              name: "AMH",
              unit: "ng/mL",
              referenceRanges: {
                adult: { min: 2, max: 6.8 }
              },
              dataType: "numeric",
              precision: 1
            }
          ]
        },

        "AMYLASE_SERUM": {
          id: "AMYLASE_SERUM",
          name: "Amylase Serum",
          displayName: "Amylase Serum",
          category: "PANCREAS",
          description: "Pancreatic amylase enzyme",
          sampleType: "Blood",
          sampleVolume: "3 mL",
          container: "SST tube (Gold top)",
          collectionMethods: ["Venipuncture"],
          fastingRequired: false,
          turnaroundTime: "2-4 hours",
          price: 1200,
          active: true,
          parameters: [
            {
              code: "AMYLASE",
              name: "Amylase",
              unit: "U/L",
              referenceRanges: {
                adult: { min: 30, max: 110 }
              },
              dataType: "numeric",
              precision: 0
            }
          ]
        },

        "BHCG_QUANTITATIVE": {
          id: "BHCG_QUANTITATIVE",
          name: "BhCG (Quantitative)",
         displayName: "BhCG (Quantitative)",
         category: "REPRODUCTIVE",
         description: "Quantitative pregnancy hormone test",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "BHCG_QUANT",
             name: "BhCG",
             unit: "mIU/mL",
             referenceRanges: {
               adult: { min: 0, max: 5 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "BLOOD_GROUPING": {
         id: "BLOOD_GROUPING",
         name: "Blood grouping Antisera",
         displayName: "Blood grouping Antisera",
         category: "HEMATOLOGY",
         description: "ABO and Rh blood typing",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "1-2 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "BLOOD_GROUP",
             name: "Blood Group",
             unit: "",
             referenceRanges: {
               adult: { normal: "Patient specific" }
             },
             dataType: "text",
             options: ["O NEGATIVE", "O POSITIVE", "B POSITIVE", "B NEGATIVE", "A POSITIVE", "A NEGATIVE", "AB POSITIVE", "AB NEGATIVE"]
           }
         ]
       },

       "BNP": {
         id: "BNP",
         name: "BNP",
         displayName: "BNP",
         category: "CARDIAC_MARKERS",
         description: "B-type natriuretic peptide",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "BNP",
             name: "BNP",
             unit: "pg/mL",
             referenceRanges: {
               adult: { min: 0, max: 100 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "BRUCELLA_ANTIBODY": {
         id: "BRUCELLA_ANTIBODY",
         name: "Brucella Antibody",
         displayName: "Brucella Antibody",
         category: "MICROBIOLOGY",
         description: "Brucella antibody detection",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 1800,
         active: true,
         parameters: [
           {
             code: "BRUCELLA_AB",
             name: "Brucella Ab",
             unit: "",
             referenceRanges: {
               adult: { normal: "Absent" }
             },
             dataType: "text",
             options: ["Present", "Absent"]
           }
         ]
       },

       "BUN": {
         id: "BUN",
         name: "BUN",
         displayName: "BUN",
         category: "BIOCHEMISTRY",
         description: "Blood urea nitrogen",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 600,
         active: true,
         parameters: [
           {
             code: "BUN",
             name: "BUN",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 6, max: 24 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "CA_15_3": {
         id: "CA_15_3",
         name: "CA 15-3",
         displayName: "CA 15-3",
         category: "TUMOR_MARKERS",
         description: "Breast cancer marker",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "CA15_3",
             name: "CA 15-3",
             unit: "U/mL",
             referenceRanges: {
               adult: { min: 0, max: 35 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "CALCIUM_SERUM": {
         id: "CALCIUM_SERUM",
         name: "Calcium Serum",
         displayName: "Calcium Serum",
         category: "BIOCHEMISTRY",
         description: "Serum calcium levels",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "CALCIUM",
             name: "Calcium Serum",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 2.1, max: 3 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "CBC_PBS": {
         id: "CBC_PBS",
         name: "CBC + PBS",
         displayName: "CBC + PBS",
         category: "HEMATOLOGY",
         description: "Complete blood count with peripheral blood smear",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1800,
         active: true,
         parameters: [
           {
             code: "WBC_PBS",
             name: "WBC",
             unit: "10^9/L",
             referenceRanges: {
               adult: { min: 4, max: 10 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LYM_ABS_PBS",
             name: "Lym#",
             unit: "10^9/L",
             referenceRanges: {
               adult: { min: 0.8, max: 4 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "MID_ABS_PBS",
             name: "Mid#",
             unit: "10^9/L",
             referenceRanges: {
               adult: { min: 0.1, max: 1.8 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "GRAN_ABS_PBS",
             name: "Gran#",
             unit: "10^9/L",
             referenceRanges: {
               adult: { min: 2, max: 7.8 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LYM_PCT_PBS",
             name: "Lym%",
             unit: "%",
             referenceRanges: {
               adult: { min: 20, max: 40 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "MID_PCT_PBS",
             name: "Mid%",
             unit: "%",
             referenceRanges: {
               adult: { min: 1, max: 15 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "GRAN_PCT_PBS",
             name: "Gran%",
             unit: "%",
             referenceRanges: {
               adult: { min: 50, max: 70 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "RBC_PBS",
             name: "RBC",
             unit: "10^12/L",
             referenceRanges: {
               adult: { min: 3.5, max: 5.50 }
             },
             dataType: "numeric",
             precision: 2
           },
           {
             code: "HGB_PBS",
             name: "HGB",
             unit: "g/dL",
             referenceRanges: {
               adult: { min: 11, max: 16 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "HCT_PBS",
             name: "HCT",
             unit: "%",
             referenceRanges: {
               adult: { min: 37, max: 54 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "MCV_PBS",
             name: "MCV",
             unit: "fL",
             referenceRanges: {
               adult: { min: 80, max: 100 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "MCH_PBS",
             name: "MCH",
             unit: "pg",
             referenceRanges: {
               adult: { min: 27, max: 34 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "MCHC_PBS",
             name: "MCHC",
             unit: "g/dL",
             referenceRanges: {
               adult: { min: 32, max: 36 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "RDW_CV_PBS",
             name: "RDW-CV",
             unit: "%",
             referenceRanges: {
               adult: { min: 11, max: 16 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "RDW_SD_PBS",
             name: "RDW-SD",
             unit: "fL",
             referenceRanges: {
               adult: { min: 35, max: 56 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PLT_PBS",
             name: "PLT",
             unit: "10^9/L",
             referenceRanges: {
               adult: { min: 100, max: 300 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "MPV_PBS",
             name: "MPV",
             unit: "fL",
             referenceRanges: {
               adult: { min: 7, max: 11 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PDW_CV",
             name: "PDW-CV",
             unit: "%",
             referenceRanges: {
               adult: { min: 15, max: 17 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PDW_SD",
             name: "PDW-SD",
             unit: "fL",
             referenceRanges: {
               adult: { min: 9, max: 17 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PCT_PBS",
             name: "PCT",
             unit: "mL/L",
             referenceRanges: {
               adult: { min: 1.08, max: 2.82 }
             },
             dataType: "numeric",
             precision: 2
           },
           {
             code: "P_LCR",
             name: "P-LCR",
             unit: "",
             referenceRanges: {
               adult: { min: 0.11, max: 0.45 }
             },
             dataType: "text",
             options: ["RBC", "WBC", "PLT"]
           },
           {
             code: "FBS_PBS",
             name: "FBS",
             unit: "",
             referenceRanges: {
               adult: { normal: "As per separate test" }
             },
             dataType: "text"
           }
         ]
       },

       "CD4_CD8": {
         id: "CD4_CD8",
         name: "CD4/CD8",
         displayName: "CD4/CD8",
         category: "IMMUNOLOGY",
         description: "T-cell subset analysis",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "6-8 hours",
         price: 4000,
         active: true,
         parameters: [
           {
             code: "CD4",
             name: "CD4",
             unit: "cell/mm^3",
             referenceRanges: {
               adult: { min: 500, max: 1500 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "CD8",
             name: "CD8",
             unit: "cell/mm^3",
             referenceRanges: {
               adult: { min: 150, max: 1000 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "CK_MB": {
         id: "CK_MB",
         name: "CK-MB Quantitative",
         displayName: "CK-MB Quantitative",
         category: "CARDIAC_MARKERS",
         description: "Cardiac muscle enzyme marker",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 2000,
         active: true,
         parameters: [
           {
             code: "CK_MB",
             name: "CK-MB",
             unit: "IU/L",
             referenceRanges: {
               adult: { min: 5, max: 25 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "CMV_IGG": {
         id: "CMV_IGG",
         name: "CMV IgG, serum",
         displayName: "CMV IgG, serum",
         category: "MICROBIOLOGY",
         description: "Cytomegalovirus IgG antibodies",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "CMV_IGG",
             name: "CMV IgG",
             unit: "U/mL",
             referenceRanges: {
               adult: { min: 0, max: 0.59 }
             },
             dataType: "text",
             options: ["Detected", "Not Detected"]
           }
         ]
       },

       "CMV_IGM": {
         id: "CMV_IGM",
         name: "CMV IgM, serum",
         displayName: "CMV IgM, serum",
         category: "MICROBIOLOGY",
         description: "Cytomegalovirus IgM antibodies",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "CMV_IGM",
             name: "CMV IgM",
             unit: "AU/mL",
             referenceRanges: {
               adult: { min: 0, max: 29.9 }
             },
             dataType: "text",
             options: ["Detected", "Not Detected"]
           }
         ]
       },

       "C_PEPTIDE": {
         id: "C_PEPTIDE",
         name: "C-Peptide",
         displayName: "C-Peptide",
         category: "ENDOCRINOLOGY",
         description: "Insulin production marker",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: true,
         fastingHours: 8,
         turnaroundTime: "4-6 hours",
         price: 2800,
         active: true,
         parameters: [
           {
             code: "C_PEPTIDE",
             name: "C-Peptide",
             unit: "ng/mL",
             referenceRanges: {
               adult: { min: 0.5, max: 2 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "CREATININE_CPK": {
         id: "CREATININE_CPK",
         name: "Creatinine CPK",
         displayName: "Creatinine CPK",
         category: "CARDIAC_MARKERS",
         description: "Creatinine phosphokinase enzyme",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "CPK_MALE",
             name: "Adult Male",
             unit: "IU/L",
             referenceRanges: {
               adult_male: { min: 38, max: 174 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "CPK_FEMALE",
             name: "Adult Female",
             unit: "IU/L",
             referenceRanges: {
               adult_female: { min: 34, max: 145 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "CRP_URIC_RF": {
         id: "CRP_URIC_RF",
         name: "CRP, Uric Acid, Rheumatoid Factor",
         displayName: "CRP, Uric Acid, Rheumatoid Factor",
         category: "INFLAMMATION_IMMUNE",
         description: "Inflammatory markers panel",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 2000,
         active: true,
         parameters: [
           {
             code: "CRP_PANEL",
             name: "CRP",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 0, max: 10 }
             },
             dataType: "text",
             options: ["Normal"]
           },
           {
             code: "URIC_ACID_PANEL",
             name: "Uric Acid",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 3.5, max: 7.2 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "RF_PANEL",
             name: "Rheumatoid Factor",
             unit: "UI/mL",
             referenceRanges: {
               adult: { min: 0, max: 14 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "CRP_PCT": {
         id: "CRP_PCT",
         name: "CRP/PCT",
         displayName: "CRP/PCT",
         category: "INFLAMMATION_IMMUNE",
         description: "C-reactive protein and procalcitonin",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "CRP_PCT",
             name: "CRP",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 0, max: 10 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PCT_CRP",
             name: "PCT",
             unit: "ng/mL",
             referenceRanges: {
               adult: { min: 0, max: 0.05 }
             },
             dataType: "numeric",
             precision: 2
           }
         ]
       },

       "CRP_HSCRP": {
         id: "CRP_HSCRP",
         name: "CRP (hsCRP+CRP)",
         displayName: "CRP (hsCRP+CRP)",
         category: "INFLAMMATION_IMMUNE",
         description: "High sensitivity CRP and standard CRP",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 2200,
         active: true,
         parameters: [
           {
             code: "CRP_HS",
             name: "CRP",
             unit: "mg/L",
             referenceRanges: {
               adult: { min: 0, max: 10 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "HS_CRP",
             name: "hsCRP",
             unit: "mg/L",
             referenceRanges: {
               adult: { min: 0, max: 1 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "CRAG": {
         id: "CRAG",
         name: "Cryptococcal Antigen test (CRAG)",
         displayName: "Cryptococcal Antigen test (CRAG)",
         category: "MICROBIOLOGY",
         description: "Cryptococcal antigen detection in CSF",
         sampleType: "CSF",
         sampleVolume: "2-3 mL",
         container: "Sterile CSF tube",
         collectionMethods: ["Lumbar puncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "CRYPTO_ANTIGEN",
             name: "Cryptococcus neoformans Antigen",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Detected" }
             },
             dataType: "text",
             options: ["Detected", "Not Detected"]
           }
         ]
       },

       "PAP_SMEAR": {
         id: "PAP_SMEAR",
         name: "Cytopack (Pap Smear)",
         displayName: "Cytopack (Pap Smear)",
         category: "CYTOLOGY",
         description: "Cervical cytological examination",
         sampleType: "Genital Smear",
         sampleVolume: "Cervical smear",
         container: "Cytology fixative",
         collectionMethods: ["Cervical sampling"],
         fastingRequired: false,
         turnaroundTime: "5-7 days",
         price: 3500,
         active: true,
         parameters: [
           {
             code: "CLINICAL_INFO",
             name: "Clinical Info",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative", "Routine pap"]
           },
           {
             code: "MICROSCOPY",
             name: "Microscopy",
             unit: "",
             referenceRanges: {
               adult: { normal: "Satisfactory Smear" }
             },
             dataType: "text",
             options: ["Present", "Endocervical Cells Present", "Endocervical Cells Present, Metaplastic Squamous Cells Present", "Cells Exhibiting Features of Mild Dysplasia Present", "Satisfactory, Inflammatory Smear", "Satisfactory, Heavily Inflammatory Smear", "There are no Abnormal Cells", "Satisfactory Smear"]
           },
           {
             code: "BACTERIAL_VAGINITIS",
             name: "Bacterial Vaginitis",
             unit: "",
             referenceRanges: {
               adult: { normal: "Absent" }
             },
             dataType: "text",
             options: ["Present", "Absent"]
           },
           {
             code: "SPECIMEN_ADEQUACY",
             name: "Specimen Adequacy",
             unit: "",
             referenceRanges: {
               adult: { normal: "Adequate" }
             },
             dataType: "text",
             options: ["Adequate", "Inadequate"]
           },
           {
             code: "INFLAMMATION",
             name: "Inflammation",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not present" }
             },
             dataType: "text",
             options: ["Severe", "Mild", "Not present"]
           },
           {
             code: "ORGANISM",
             name: "Organism",
             unit: "",
             referenceRanges: {
               adult: { normal: "Doderlein bacilli" }
             },
             dataType: "text",
             options: ["Doderlein bacilli", "Trichomonas Vaginilis", "Coccobacilli", "Candida spp"]
           },
           {
             code: "EPITHELIAL_ABNORMALITIES",
             name: "Epithelial cell Abnormalities",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Detected" }
             },
             dataType: "text",
             options: ["Detected", "Not Detected"]
           },
           {
             code: "OTHER_ORGANISMS",
             name: "Other Organisms",
             unit: "",
             referenceRanges: {
               adult: { normal: "None" }
             },
             dataType: "text",
             options: ["Coccobacilli"]
           },
           {
             code: "INTERPRETATION",
             name: "Interpretation",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative for intraepithelial lesion or malignancy" }
             },
             dataType: "text",
             options: ["Negative for intraepithelial lesion or malignancy", "LSIL", "Reactive-typical repair inflammatory changes or Negative for intraepithelial lesion or malignancy", "Reactive non-specific cervicitis or Negative for intraepithelial lesion or malignancy"]
           },
           {
             code: "COMMENT",
             name: "Comment",
             unit: "",
             referenceRanges: {
               adult: { normal: "Routine follow up recommended" }
             },
             dataType: "text",
             options: ["Repeat smear in 12 months recommended", "Routine follow up recommended", "Treat if symptomatic. Routine follow up recommended"]
           }
         ]
       },

       "D_DIMER": {
         id: "D_DIMER",
         name: "D-Dimer",
         displayName: "D-Dimer",
         category: "COAGULATION",
         description: "Fibrin degradation product",
         sampleType: "Citrated Plasma",
         sampleVolume: "3 mL",
         container: "Citrate tube (Blue top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "D_DIMER",
             name: "D-DIMER",
             unit: "ng/mL",
             referenceRanges: {
               adult: { min: 0, max: 500 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "DENGUE": {
         id: "DENGUE",
         name: "Dengue",
         displayName: "Dengue",
         category: "MICROBIOLOGY",
         description: "Dengue virus detection",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2000,
         active: true,
         parameters: [
           {
             code: "DENGUE",
             name: "Dengue",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Detected" }
             },
             dataType: "text",
             options: ["Detected", "Not Detected"]
           }
         ]
       },

       "DS_DNA": {
         id: "DS_DNA",
         name: "Ds DNA (Autoimmune Antibody Test)",
         displayName: "Ds DNA (Autoimmune Antibody Test)",
         category: "AUTOIMMUNE",
         description: "Double-stranded DNA antibodies",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "DS_DNA_AB",
             name: "dsDNA Antibodies (Crithidia)",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "ESR": {
         id: "ESR",
         name: "ESR",
         displayName: "ESR",
         category: "HEMATOLOGY",
         description: "Erythrocyte sedimentation rate",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "1-2 hours",
         price: 600,
         active: true,
         parameters: [
           {
             code: "ESR_FEMALE",
             name: "ESR (Female)",
             unit: "mm/hr",
             referenceRanges: {
               adult_female: { min: 1, max: 20 }
             },
             dataType: "text",
             options: ["High", "Low", "Normal", "More than 50 yrs. old: 0 - 30mm/hr       Less than 50yrs.old: 0 - 20mm/hr"]
           },
           {
             code: "ESR_MALE",
             name: "ESR (Male)",
             unit: "mm/hr",
             referenceRanges: {
               adult_male: { min: 1, max: 13 }
             },
             dataType: "text",
             options: ["High", "Low", "Normal"]
           },
           {
             code: "ESR_WOMEN_50",
             name: "ESR (Women >50 years)",
             unit: "mm/hr",
             referenceRanges: {
               adult_female_over_50: { min: 0, max: 30 }
             },
             dataType: "text",
             options: ["High", "Low", "Normal"]
           }
         ]
       },

       "ESTRADIOL": {
         id: "ESTRADIOL",
         name: "Estradiol (E2)",
         displayName: "Estradiol (E2)",
         category: "REPRODUCTIVE",
         description: "Estrogen hormone levels",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2800,
         active: true,
         parameters: [
           {
             code: "E2_PREMENOPAUSAL",
             name: "Premenopausal Female",
             unit: "pg/mL",
             referenceRanges: {
               premenopausal_female: { min: 30, max: 400 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "E2_POSTMENOPAUSAL",
             name: "Post Menopausal Female",
             unit: "pg/mL",
             referenceRanges: {
               postmenopausal_female: { min: 0, max: 30 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "E2_MALE",
             name: "Male",
             unit: "pmol/L",
             referenceRanges: {
               adult_male: { min: 40, max: 161 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "FSH": {
         id: "FSH",
         name: "FSH",
         displayName: "FSH",
         category: "REPRODUCTIVE",
         description: "Follicle stimulating hormone",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "FSH_ADULT",
             name: "Adult",
             unit: "IU/L",
             referenceRanges: {
               adult: { min: 1.5, max: 12.4 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "FSH_PUBERTY",
             name: "Puberty",
             unit: "IU/L",
             referenceRanges: {
               puberty: { min: 0.3, max: 10 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "FT3": {
         id: "FT3",
         name: "FT3",
         displayName: "FT3",
         category: "THYROID",
         description: "Free triiodothyronine",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2200,
         active: true,
         parameters: [
           {
             code: "FT3",
             name: "FT3",
             unit: "pg/mL",
             referenceRanges: {
               adult: { min: 2.3, max: 4.1 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "FT4": {
         id: "FT4",
         name: "FT4",
         displayName: "FT4",
         category: "THYROID",
         description: "Free thyroxine",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2200,
         active: true,
         parameters: [
           {
             code: "FT4",
             name: "FT4",
             unit: "ng/dL",
             referenceRanges: {
               adult: { min: 0.9, max: 2.3 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "GGT": {
         id: "GGT",
         name: "GGT",
         displayName: "GGT",
         category: "LIVER_PANEL",
         description: "Gamma-glutamyl transferase",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "GGT",
             name: "GGT",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 0, max: 47 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "GOT_AST": {
         id: "GOT_AST",
         name: "GOT/AST",
         displayName: "GOT/AST",
         category: "LIVER_PANEL",
         description: "Aspartate aminotransferase",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "AST",
             name: "AST",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 8, max: 48 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "GPT_ALT": {
         id: "GPT_ALT",
         name: "GPT/ALT",
         displayName: "GPT/ALT",
         category: "LIVER_PANEL",
         description: "Alanine aminotransferase",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "ALT",
             name: "ALT",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 7, max: 55 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "HB_ELECTROPHORESIS": {
         id: "HB_ELECTROPHORESIS",
         name: "Hb Electrophoresis",
         displayName: "Hb Electrophoresis",
         category: "HEMATOLOGY",
         description: "Hemoglobin variant analysis",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "HBA",
             name: "HbA",
             unit: "%",
             referenceRanges: {
               adult: { min: 95, max: 98 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "HBA2",
             name: "HbA2",
             unit: "%",
             referenceRanges: {
               adult: { min: 2, max: 3 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "HBF_NEWBORN",
             name: "HbF (Newborn)",
             unit: "%",
             referenceRanges: {
               newborn: { min: 50, max: 80 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "HBF_6MONTHS",
             name: "HbF (6 months)",
             unit: "%",
             referenceRanges: {
               infant_6months: { min: 0, max: 8 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "HBF_OVER6MONTHS",
             name: "HbF (Over 6 months)",
             unit: "%",
             referenceRanges: {
               over_6months: { min: 1, max: 2 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "HIGH_VAGINAL_SWAB": {
         id: "HIGH_VAGINAL_SWAB",
         name: "High Vaginal Swab",
         displayName: "High Vaginal Swab",
         category: "MICROBIOLOGY",
         description: "Vaginal swab microscopy",
         sampleType: "HVS",
         sampleVolume: "Swab",
         container: "Transport medium",
         collectionMethods: ["Vaginal swab"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "EPITHELIAL_CELLS",
             name: "Epithelial Cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Few Seen" }
             },
             dataType: "text",
             options: ["Not Seen", "Few Seen", "Moderate Seen", "High Seen"]
           },
           {
             code: "PUS_CELLS",
             name: "Pus Cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Few Seen" }
             },
             dataType: "text",
             options: ["Not Seen", "Few Seen", "Moderate Seen", "High Seen"]
           },
           {
             code: "SPERM_CELLS",
             name: "Sperm Cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Seen", "Not Seen"]
           },
           {
             code: "YEAST_CELLS",
             name: "Yeast Cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Not Seen", "Few Seen", "Moderate Seen", "High Seen"]
           },
           {
             code: "RED_BLOOD_CELLS",
             name: "Red Blood Cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Not Seen", "Few Seen", "Moderate Seen", "High Seen"]
           },
           {
             code: "BACTERIA",
             name: "Bacteria",
             unit: "/HPF",
             referenceRanges: {
               adult: { normal: "Few Seen" }
             },
             dataType: "text"
           },
           {
             code: "GRAM_STAIN",
             name: "Direct Gram Stain",
             unit: "",
             referenceRanges: {
               adult: { normal: "No Gram Organism Seen" }
             },
             dataType: "text",
             options: ["No Gram Organism Seen", "Gram Negative Diplococcus Seen", "Gram positive Cocci in short chains"]
           },
           {
             code: "T_VAGINALIS",
             name: "T. Vaginalis",
             unit: "/HPF",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text"
           }
         ]
       },

       "HIV_ELISA": {
         id: "HIV_ELISA",
         name: "HIV ELISA",
         displayName: "HIV ELISA",
         category: "MICROBIOLOGY",
         description: "HIV antibody/antigen testing",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "HIV_SPOT",
             name: "HIV 1 & 2 (SPOT)",
             unit: "",
             referenceRanges: {
               adult: { normal: "Non Reactive" }
             },
             dataType: "text",
             options: ["Normal", "Reactive", "Non Reactive"]
           },
           {
             code: "HIV_ELISA",
             name: "HIV 1 & 2 Ag/Ab (ELISA)",
             unit: "TV",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Negative", "Positive"]
           }
         ]
       },

       "INSULIN": {
         id: "INSULIN",
         name: "Insulin",
         displayName: "Insulin",
         category: "ENDOCRINOLOGY",
         description: "Insulin hormone levels",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2800,
         active: true,
         parameters: [
           {
             code: "RANDOM_INSULIN",
             name: "Random Insulin",
             unit: "uU/ml",
             referenceRanges: {
               adult: { min: 2.6, max: 24.9 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "LDH": {
         id: "LDH",
         name: "LDH",
         displayName: "LDH",
         category: "CLINICAL_CHEMISTRY",
         description: "Lactate dehydrogenase",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1200,
         active: true,
         parameters: [
           {
             code: "LDH_0_10_DAYS",
             name: "0-10 Days",
             unit: "U/L",
             referenceRanges: {
               newborn_0_10_days: { min: 290, max: 2000 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "LDH_10_DAYS_2_YEARS",
             name: "10 Days-2Years",
             unit: "U/L",
             referenceRanges: {
               infant_10days_2years: { min: 180, max: 430 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "LDH_2_12_YEARS",
             name: "2 years-12years",
             unit: "U/L",
             referenceRanges: {
               child_2_12_years: { min: 110, max: 295 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "LDH_OVER_12",
             name: ">12Years",
             unit: "U/L",
             referenceRanges: {
               over_12_years: { min: 0, max: 250 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "LH": {
         id: "LH",
         name: "LH",
         displayName: "LH",
         category: "REPRODUCTIVE",
         description: "Luteinizing hormone",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "LH_MALE",
             name: "Male",
             unit: "",
             referenceRanges: {
               adult_male: { min: 2, max: 15 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LH_POSTMENOPAUSAL",
             name: "Female Postmenopausal",
             unit: "",
             referenceRanges: {
               postmenopausal_female: { min: 10, max: 200 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LH_PREMENOPAUSAL_BASELINE",
             name: "Female: Premenopausal baseline level",
             unit: "",
             referenceRanges: {
               premenopausal_baseline: { min: 5, max: 20 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LH_PREMENOPAUSAL_SURGE",
             name: "Female: Premenopausal Surge level",
             unit: "",
             referenceRanges: {
               premenopausal_surge: { min: 40, max: 200 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LH_OVULATORY",
             name: "Female: Ovulatory phase",
             unit: "",
             referenceRanges: {
               ovulatory_phase: { min: 16, max: 73 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LH_LUTEAL",
             name: "Female: Luteal phase",
             unit: "",
             referenceRanges: {
               luteal_phase: { min: 0.6, max: 14 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LH_FOLLICULAR",
             name: "Female: Follicular phase",
             unit: "",
             referenceRanges: {
               follicular_phase: { min: 1.4, max: 12 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "LIPASE": {
         id: "LIPASE",
         name: "Lipase",
         displayName: "Lipase",
         category: "PANCREAS",
         description: "Pancreatic lipase enzyme",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1200,
         active: true,
         parameters: [
           {
             code: "LIPASE",
             name: "Lipase",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 13, max: 60 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "TOTAL_CHOLESTEROL": {
         id: "TOTAL_CHOLESTEROL",
         name: "Total Cholesterol",
         displayName: "Total Cholesterol",
         category: "LIPID_PROFILE",
         description: "Total cholesterol levels",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: true,
         fastingHours: 12,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "TOTAL_CHOL_1",
             name: "Total Cholesterol",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 0, max: 5.7 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "TOTAL_CHOL_2",
             name: "Total Cholesterol.",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 0, max: 5.17 }
             },
             dataType: "numeric",
             precision: 2
           }
         ]
       },

       "HDL": {
         id: "HDL",
         name: "HDL",
         displayName: "HDL",
         category: "LIPID_PROFILE",
         description: "High-density lipoprotein cholesterol",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: true,
         fastingHours: 12,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "HDL",
             name: "HDL",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 0.9, max: 2.24 }
             },
             dataType: "numeric",
             precision: 2
           }
         ]
       },

       "LDL": {
         id: "LDL",
         name: "LDL",
         displayName: "LDL",
         category: "LIPID_PROFILE",
         description: "Low-density lipoprotein cholesterol",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: true,
         fastingHours: 12,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "LDL_1",
             name: "LDL",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 1, max: 3.9 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "LDL_2",
             name: "Low Density Lipoprotein (LDL)",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 0.5, max: 3.14 }
             },
             dataType: "numeric",
             precision: 2
           }
         ]
       },

       "MAGNESIUM_SERUM": {
         id: "MAGNESIUM_SERUM",
         name: "Magnesium Serum",
         displayName: "Magnesium Serum",
         category: "BIOCHEMISTRY",
         description: "Serum magnesium levels",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1000,
         active: true,
         parameters: [
           {
             code: "MAGNESIUM",
             name: "Magnesium",
             unit: "mg/dl",
             referenceRanges: {
               adult: { min: 1.7, max: 2.3 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "MICROALBUMIN": {
         id: "MICROALBUMIN",
         name: "Microalbumin",
         displayName: "Microalbumin",
         category: "URINALYSIS",
         description: "Urine microalbumin",
         sampleType: "Urine",
         sampleVolume: "50 mL",
         container: "Sterile urine container",
         collectionMethods: ["Clean catch urine"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "MICROALBUMIN",
             name: "Microalbumin",
             unit: "",
             referenceRanges: {
               adult: { min: 0, max: 30 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "NT_PRO_BNP": {
         id: "NT_PRO_BNP",
         name: "NT pro BNP",
         displayName: "NT pro BNP",
         category: "CARDIAC_MARKERS",
         description: "N-terminal pro-B-type natriuretic peptide",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3500,
         active: true,
         parameters: [
           {
             code: "NT_PRO_BNP",
             name: "NT pro BNP",
             unit: "pg/mL",
             referenceRanges: {
               adult: { min: 0, max: 450 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "PHOSPHATE": {
         id: "PHOSPHATE",
         name: "Phosphate",
         displayName: "Phosphate",
         category: "BIOCHEMISTRY",
         description: "Serum phosphate levels",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "PHOSPHORUS",
             name: "Phosphorus",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 0.92, max: 1.45 }
             },
             dataType: "text",
             options: ["Positive", "Negative", "Normal", "Low"]
           }
         ]
       },

       "PROCALCITONIN": {
         id: "PROCALCITONIN",
         name: "Procalcitonin",
         displayName: "Procalcitonin",
         category: "INFLAMMATION_IMMUNE",
         description: "Procalcitonin sepsis marker",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "PCT",
             name: "Procalcitonin (PCT)",
             unit: "ng/mL",
             referenceRanges: {
               adult: { min: 0, max: 0.5 }
             },
             dataType: "numeric",
             precision: 2
           }
         ]
       },

       "PROGESTERONE": {
         id: "PROGESTERONE",
         name: "Progesterone",
         displayName: "Progesterone",
         category: "REPRODUCTIVE",
         description: "Progesterone hormone levels",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2800,
         active: true,
         parameters: [
           {
             code: "PROGESTERONE",
             name: "Progesterone",
             unit: "",
             referenceRanges: {
               adult: { normal: "Phase dependent" }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "PT_INR": {
         id: "PT_INR",
         name: "PT/INR",
         displayName: "PT/INR",
         category: "COAGULATION",
         description: "Prothrombin time and international normalized ratio",
         sampleType: "Citrated Plasma",
         sampleVolume: "3 mL",
         container: "Citrate tube (Blue top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "INR",
             name: "INR",
             unit: "",
             referenceRanges: {
               adult: { min: 0.8, max: 1.2 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "CONTROL",
             name: "Control",
             unit: "Seconds",
             referenceRanges: {
               adult: { min: 9.3, max: 12.5 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PT",
             name: "Prothrombin Time",
             unit: "Seconds",
             referenceRanges: {
               adult: { min: 10, max: 14 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PT_TIME",
             name: "Prothrombine Time-",
             unit: "Seconds",
             referenceRanges: {
               adult: { normal: "10-14 seconds" }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PT_TIME_2",
             name: "Prothrombine Time-PT",
             unit: "seconds",
             referenceRanges: {
               adult: { normal: "10-14 seconds" }
             },
             dataType: "text",
             options: ["High", "Normal"]
           }
         ]
       },

       "PTH": {
         id: "PTH",
         name: "PTH (Parathyroid Hormone)",
         displayName: "PTH (Parathyroid Hormone)",
         category: "ENDOCRINOLOGY",
         description: "Parathyroid hormone levels",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "PTH",
             name: "PTH",
             unit: "Pg/ml",
             referenceRanges: {
               adult: { min: 15, max: 65 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "RHEUMATOID_FACTOR": {
         id: "RHEUMATOID_FACTOR",
         name: "Rheumatoid Factor",
         displayName: "Rheumatoid Factor",
         category: "AUTOIMMUNE",
         description: "Rheumatoid factor antibodies",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "RF",
             name: "RF",
             unit: "",
             referenceRanges: {
               adult: { normal: "Non-Reactive" }
             },
             dataType: "text",
             options: ["Reactive", "Non-Reactive"]
           }
         ]
       },

       "LIVER_FUNCTION_TEST": {
         id: "LIVER_FUNCTION_TEST",
         name: "Liver Function Test",
         displayName: "Liver Function Test",
         category: "LIVER_PANEL",
         description: "Comprehensive liver function panel",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "DIRECT_BILIRUBIN",
             name: "Direct Bilirubin",
             unit: "umol/L",
             referenceRanges: {
               adult: { min: 0, max: 7 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "TOTAL_BILIRUBIN",
             name: "Total Bilirubin",
             unit: "umol/L",
             referenceRanges: {
               adult: { min: 2, max: 20.5 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "TOTAL_PROTEIN",
             name: "Total Protein",
             unit: "g/L",
             referenceRanges: {
               adult: { min: 60, max: 88 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "ALBUMIN_LFT",
             name: "Albumin",
             unit: "g/L",
             referenceRanges: {
               adult: { min: 35, max: 55 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "SGOT_AST",
             name: "SGOT/AST",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 0, max: 40 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "SGPT_ALT",
             name: "SGPT/ALT",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 7, max: 42 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "GGT_LFT",
             name: "GGT",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 0, max: 47 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "ALP_LFT",
             name: "Alkaline Phosphatase",
             unit: "IU/L",
             referenceRanges: {
               adult: { min: 45, max: 147 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "ALP_ALT",
             name: "Alkaline Phosphatase-",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 30, max: 135 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "GGT_ALT",
             name: "GGT-",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 7, max: 32 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "AST_DOT",
             name: "AST.",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 13, max: 35 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "SARS_COV2_PCR": {
         id: "SARS_COV2_PCR",
         name: "SARS-CoV-2 PCR",
         displayName: "SARS-CoV-2 PCR",
         category: "MICROBIOLOGY",
         description: "COVID-19 PCR test",
         sampleType: "Nasopharyngeal Swab",
         sampleVolume: "Swab sample",
         container: "Viral transport medium",
         collectionMethods: ["Nasopharyngeal swab"],
         fastingRequired: false,
         turnaroundTime: "6-8 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "SARS_COV2",
             name: "SARS-CoV-2",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Detected" }
             },
             dataType: "text",
             options: ["Detected", "Not Detected"]
           },
           {
             code: "N_GENE",
             name: "N Gene",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Negative", "Positive"]
           },
           {
             code: "ORF1AB",
             name: "ORF1ab",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Negative", "Positive"]
           }
         ]
       },

       "STOOL_CULTURE": {
         id: "STOOL_CULTURE",
         name: "Stool Culture & Sensitivity",
         displayName: "Stool Culture & Sensitivity",
         category: "STOOL_ANALYSIS",
         description: "Stool bacterial culture and antibiotic sensitivity",
         sampleType: "Stool",
         sampleVolume: "5-10 g",
         container: "Sterile stool container",
         collectionMethods: ["Stool collection"],
         fastingRequired: false,
         turnaroundTime: "3-5 days",
         price: 2000,
         active: true,
         parameters: [
           {
             code: "GRAM_STAIN_STOOL",
             name: "Gram Stain",
             unit: "",
             referenceRanges: {
               adult: { normal: "Normal flora" }
             },
             dataType: "text",
             options: ["Gram Negative Rods", "Gram Negative Cocci", "Not Applicable"]
           },
           {
             code: "MICROORGANISM",
             name: "Microorganism",
             unit: "",
             referenceRanges: {
               adult: { normal: "No pathogen isolated" }
             },
             dataType: "text",
             options: ["Salmonella spp", "No Salmonella or Shigella or V. cholerae Isolated", "No Pathogen Isolated after 48hours Incubation in SS Agar at 37 Degrees Celsius", "No Growth Obtained"]
           },
           {
             code: "PENICILLIN_G",
             name: "Penicilin-G",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant", "Intermediate"]
           },
           {
             code: "MINOCYCLINE",
             name: "Minocycline",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant", "Intermediate"]
           },
           {
             code: "ERYTHROMYCIN",
             name: "Erythromycin",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant", "Intermediate"]
           },
           {
             code: "METHICILLIN",
             name: "Methicillin",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant", "Intermediate"]
           },
           {
             code: "COTRIMOXAZOLE",
             name: "Co-Trimoxazole",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant", "Intermediate"]
           },
           {
             code: "CHLORAMPHENICOL",
             name: "Chloramphenicol",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant", "Intermediate"]
           },
           {
             code: "LINCOMYCIN",
             name: "Lincomycin",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant", "Intermediate"]
           },
           {
             code: "AMPICILLIN",
             name: "Ampicillin",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant", "Intermediate"]
           }
         ]
       },

       "STOOL_MICROSCOPY": {
         id: "STOOL_MICROSCOPY",
         name: "Stool microscopy",
         displayName: "Stool microscopy",
         category: "STOOL_ANALYSIS",
         description: "Stool microscopic examination",
         sampleType: "Stool",
         sampleVolume: "5-10 g",
         container: "Sterile stool container",
         collectionMethods: ["Stool collection"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1200,
         active: true,
         parameters: [
           {
             code: "STOOL_COLOR",
             name: "Color",
             unit: "",
             referenceRanges: {
               adult: { normal: "Brown" }
             },
             dataType: "text",
             options: ["Brown", "Dark Red", "Yellow", "Green"]
           },
           {
             code: "CONSISTENCY",
             name: "Consistency",
             unit: "",
             referenceRanges: {
               adult: { normal: "Soft formed" }
             },
             dataType: "text",
             options: ["Soft formed", "Hard Formed", "Liquid consistency", "Semi-formed"]
           },
           {
             code: "BLOOD_STOOL",
             name: "Blood",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "Present", "Present: Blood Stained"]
           },
           {
             code: "MUCUS",
             name: "Mucus",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "Present", "Trace"]
           },
           {
             code: "PUS_CELLS_STOOL",
             name: "Pus cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Not Seen", "Present", "Few Seen", "2-3-HPF", "3-5-HPF"]
           },
           {
             code: "RBC_STOOL",
             name: "Red Blood Cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Present", "Not Seen", "Scanty Present"]
           },
           {
             code: "YEAST_CELLS_STOOL",
             name: "Yeast Cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Present", "Not Seen", "Few Seen", "10-15-HPF"]
           },
           {
             code: "CYSTS",
             name: "Cysts",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Present", "Not Seen", "Blastocystis hominis Cysts Present", "Entamoeba histolytica Cysts Present"]
           },
           {
             code: "OVA",
             name: "Ova",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Present", "Not Seen"]
           },
           {
             code: "TROPHOZOITES",
             name: "Trophozoites",
             unit: "",
             referenceRanges: {
               adult: { normal: "Absent" }
             },
             dataType: "text",
             options: ["Present", "Absent"]
           },
           {
             code: "EPITHELIAL_CELLS_STOOL",
             name: "Epithelial Cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Absent" }
             },
             dataType: "text",
             options: ["Present", "Absent", "Numerous", "2-3-HPF"]
           },
           {
             code: "BACTERIA_STOOL",
             name: "Bacteria",
             unit: "",
             referenceRanges: {
               adult: { normal: "Present" }
             },
             dataType: "text",
             options: ["Present", "Absent", "Motile Bacteria Seen"]
           },
           {
             code: "STARCH_GRANULES",
             name: "Starch Granules",
             unit: "",
             referenceRanges: {
               adult: { normal: "Present" }
             },
             dataType: "text",
             options: ["Present", "Absent"]
           }
         ]
       },

       "TOTAL_BILIRUBIN": {
         id: "TOTAL_BILIRUBIN",
         name: "Total bilirubin",
         displayName: "Total bilirubin",
         category: "LIVER_PANEL",
         description: "Total bilirubin levels",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "BILIRUBIN_TOTAL",
             name: "Bilirubin Total",
             unit: "",
             referenceRanges: {
               adult: { normal: "Normal" }
             },
             dataType: "text",
             options: ["High", "Low", "Normal"]
           }
         ]
       },

       "TESTOSTERONE": {
         id: "TESTOSTERONE",
         name: "Testosterone",
         displayName: "Testosterone",
         category: "REPRODUCTIVE",
         description: "Testosterone hormone levels",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2800,
         active: true,
         parameters: [
           {
             code: "TESTOSTERONE_PREPUBERTAL_MALE",
             name: "Male: Prepubertal (late)",
             unit: "",
             referenceRanges: {
               prepubertal_male: { normal: "Normal" }
             },
             dataType: "text",
             options: ["High", "Normal"]
           },
           {
             code: "TESTOSTERONE_ADULT_MALE",
             name: "Male: Adult",
             unit: "nmol/L",
             referenceRanges: {
               adult_male: { min: 8, max: 30 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "TESTOSTERONE_PREPUBERTAL_FEMALE",
             name: "Female: Prepubertal (late)",
             unit: "",
             referenceRanges: {
               prepubertal_female: { normal: "Normal" }
             },
             dataType: "text"
           },
           {
             code: "TESTOSTERONE_ADULT_FEMALE",
             name: "Female: Adult",
             unit: "",
             referenceRanges: {
               adult_female: { normal: "Normal" }
             },
             dataType: "text"
           },
           {
             code: "TESTOSTERONE_POSTMENOPAUSAL",
             name: "Female: postmenopausal",
             unit: "",
             referenceRanges: {
               postmenopausal_female: { normal: "Normal" }
             },
             dataType: "text",
             options: ["High", "Normal"]
           },
           {
             code: "TESTOSTERONE_GENERAL",
             name: "Testosterone",
             unit: "ng/mL",
             referenceRanges: {
               adult: { min: 1.91, max: 8.41 }
             },
             dataType: "numeric",
             precision: 2
           }
         ]
       },

       "THYROID_FUNCTION": {
         id: "THYROID_FUNCTION",
         name: "Thyroid Function",
         displayName: "Thyroid Function",
         category: "THYROID",
         description: "Comprehensive thyroid function panel",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3500,
         active: true,
         parameters: [
           {
             code: "FT3_THYROID",
             name: "FT3",
             unit: "pmol/L",
             referenceRanges: {
               adult: { min: 2.8, max: 7.1 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "FT4_THYROID",
             name: "FT4",
             unit: "pmol/L",
             referenceRanges: {
               adult: { min: 12, max: 22 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "TSH",
             name: "TSH",
             unit: "mIU/L",
             referenceRanges: {
               adult: { min: 0.3, max: 4.2 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "FREE_T3",
             name: "Free T3",
             unit: "pg/mL",
             referenceRanges: {
               adult: { min: 2, max: 4.4 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "FREE_T4",
             name: "Free T4",
             unit: "ng/dL",
             referenceRanges: {
               adult: { min: 0.5, max: 1.4 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "TSH_ULTRASENSITIVE",
             name: "TSH (Ultrasensitive)",
             unit: "uIU/mL",
             referenceRanges: {
               adult: { min: 0.45, max: 4.5 }
             },
             dataType: "numeric",
             precision: 2
           },
           {
             code: "T_T3",
             name: "T -T3",
             unit: "nmol/L",
             referenceRanges: {
               adult: { min: 1.23, max: 3.08 }
             },
             dataType: "numeric",
             precision: 2
           },
           {
             code: "T_T4",
             name: "T - T4",
             unit: "nmol/L",
             referenceRanges: {
               adult: { min: 57.9, max: 150.6 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "TOTAL_PROTEIN": {
         id: "TOTAL_PROTEIN",
         name: "Total Protein",
         displayName: "Total Protein",
         category: "LIVER_PANEL",
         description: "Total protein levels",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "TOTAL_PROTEIN",
             name: "Total Protein",
             unit: "g/dl",
             referenceRanges: {
               adult: { min: 60, max: 80 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "TROPONIN": {
         id: "TROPONIN",
         name: "Troponin",
         displayName: "Troponin",
         category: "CARDIAC_MARKERS",
         description: "Cardiac troponin levels",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "TROPONIN",
             name: "Troponin",
             unit: "ng/mL",
             referenceRanges: {
               adult: { min: 0, max: 0.3 }
             },
             dataType: "numeric",
             precision: 2
           }
         ]
       },

       "UECS": {
         id: "UECS",
         name: "UECs (Urea, Electrolytes, Creatinine)",
         displayName: "UECs (Urea, Electrolytes, Creatinine)",
         category: "BIOCHEMISTRY",
         description: "Comprehensive kidney function and electrolyte panel",
         sampleType: "Blood Serum",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 2000,
         active: true,
         parameters: [
           {
             code: "UREA_UECS",
             name: "Urea",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 1.7, max: 8.3 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "SODIUM",
             name: "Sodium",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 135, max: 155 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "POTASSIUM",
             name: "Potassium",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 3.5, max: 5.5 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "CHLORIDE",
             name: "Chloride",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 96, max: 108 }
             },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "CREATININE_UECS",
             name: "Creatinine",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 53, max: 115 }
             },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "URINALYSIS_COMPREHENSIVE": {
         id: "URINALYSIS_COMPREHENSIVE",
         name: "Urinalysis",
         displayName: "Urinalysis",
         category: "URINALYSIS",
         description: "Complete urine analysis including physical, chemical, and microscopic examination",
         sampleType: "Urine",
         sampleVolume: "50 mL",
         container: "Sterile urine container",
         collectionMethods: ["Clean Catch", "Catheterization", "Suprapubic"],
         fastingRequired: false,
         turnaroundTime: "1-2 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "PUS_CELLS_URINE",
             name: "Pus cells",
             unit: "/HPF",
             referenceRanges: {
               adult: { min: 0, max: 5 }
             },
             dataType: "text",
             options: ["0-1-HPF", "20-30-HPF (Moderate Seen)", "1-3-HPF (Few Seen)", ">50/HPF", "Numerous Seen", "Absent", "0-2-HPF", "2-3-HPF", "1-5-HPF", "5-8-HPF", "10 - 15-HPF", "15 - 20-HPF", "5-10-HPF", "Not Seen"]
           },
           {
             code: "S_HAEMATOBIUM",
             name: "S. Haematobium",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Few Seen", "Moderate Seen", "Numerous Seen", "Absent", "Not Seen"]
           },
           {
             code: "T_VAGINALIS_URINE",
             name: "T. Vaginalis",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Not Seen", "Moderate Seen", "Numerous Seen", "Absent"]
           },
           {
             code: "YEAST_CELLS_URINE",
             name: "Yeast cells",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Not Seen", "Few Seen", "Moderate Seen", "Numerous Seen", "+", "++", "Not Seen"]
           },
           {
             code: "RBC_URINE",
             name: "Red blood cells",
             unit: "/HPF",
             referenceRanges: {
               adult: { min: 0, max: 4 }
             },
             dataType: "text",
             options: ["2-5-HPF", "Moderate Seen", "Absent", "Numerous Seen", "6-10-HPF", "21-30-HPF", ">30-HPF", "Not Seen"]
           },
           {
             code: "BACTERIA_URINE",
             name: "Bacteria",
             unit: "",
             referenceRanges: {
               adult: { normal: "Few Seen" }
             },
             dataType: "text",
             options: ["Absent", "Motile Bacteria Seen", "Few Seen", "Moderate Seen", "Numerous Seen", "Not Seen"]
           },
           {
             code: "SPERMATOZOA",
             name: "Spermatozoa",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Absent", "Few Seen", "Moderate Seen", "Numerous Seen", "Not Seen"]
           },
           {
             code: "APPEARANCE",
             name: "Appearance",
             unit: "",
             referenceRanges: {
               adult: { normal: "Clear" }
             },
             dataType: "text",
             options: ["Bloody Turbid", "Normal", "Clear", "Slightly Turbid", "Turbid", "Cloudy", "Highly Turbid"]
           },
           {
             code: "COLOUR",
             name: "Colour",
             unit: "",
             referenceRanges: {
               adult: { normal: "Yellow" }
             },
             dataType: "text",
             options: ["Amber", "Straw", "Pale Amber", "Yellow", "Dark Yellow", "Deep Amber", "Pale Yellow", "Bloody", "Greenish Yellow", "Greenish Orange", "Pale Green", "Colorless", "Deep Amber"]
           },
           {
             code: "PH_URINE",
             name: "Ph",
             unit: "",
             referenceRanges: {
               adult: { min: 5, max: 8 }
             },
             dataType: "text",
             options: ["High", "Low", "Normal"]
           },
           {
             code: "SG",
             name: "S.G",
             unit: "",
             referenceRanges: {
               adult: { min: 1.01, max: 1.025 }
             },
             dataType: "text",
             options: ["High", "Low", "Normal"]
           },
           {
             code: "GLUCOSE_URINE",
             name: "Glucose",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "+", "++", "+++", "Trace"]
           },
           {
             code: "EPITHELIAL_CELLS_URINE",
             name: "Epithelial cells",
             unit: "/HPF",
             referenceRanges: {
               adult: { min: 0, max: 5 }
             },
             dataType: "text",
             options: ["High", "1-2-HPF", "Normal", "Seen", "Not Seen", "2-4-HPF", "8-10-HPF", "10-15-HPF", "2-3-HPF", "Not Seen"]
           },
           {
             code: "LEUCOCYTES",
             name: "Leucocytes",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "+", "++", "+++ (Moderate)", "Trace", "++++", "Moderate", "Numerous"]
           },
           {
             code: "NITRITES",
             name: "Nitrites",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Negative", "Positive"]
           },
           {
             code: "KETONES",
             name: "Ketones",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "+", "++", "+++", "Trace"]
           },
           {
             code: "PROTEIN_URINE",
             name: "Protein",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "+", "++", "+++", "Trace", "Small"]
           },
           {
             code: "BILIRUBIN_URINE",
             name: "Bilirubin",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "+", "++", "+++"]
           },
           {
             code: "UROBILINOGEN",
             name: "Urobilinogen",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "+", "++", "+++"]
           },
           {
             code: "BLOOD_URINE",
             name: "Blood",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Nil", "+", "++", "+++ (Moderate)", "Trace", "Trace Haemolysed", "Non-Hemolyzed Trace"]
           },
           {
             code: "CA_OXALATE_CRYSTALS",
             name: "Ca Oxalate Crystals",
             unit: "/LPF",
             referenceRanges: {
               adult: { min: 0, max: 5 }
             },
             dataType: "text",
             options: ["Few Seen", "Moderate Seen", "Numerous Seen", "Not Seen", "Calcium Oxalate", "Uric Acid", "Bilirubin", "3-5-LPF", "10-15-LPF", "1-3-HPF"]
           },
           {
             code: "URINE_PROTEIN_ALBUMIN",
             name: "Urine Protein (Albumin)",
             unit: "",
             referenceRanges: {
               adult: { normal: "Nil" }
             },
             dataType: "text",
             options: ["Trace", "Nil", "Small", "Moderate", "Numerous"]
           },
           {
             code: "CRYSTALS",
             name: "Crystals",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Seen" }
             },
             dataType: "text",
             options: ["Triple Phosphate(+)", "Amorphous Phosphate Crystals"]
           }
         ]
       },

       "URINE_CULTURE": {
         id: "URINE_CULTURE",
         name: "Urine Culture & Sensitivity",
         displayName: "Urine Culture & Sensitivity",
         category: "URINALYSIS",
         description: "Urine bacterial culture and antibiotic sensitivity",
         sampleType: "Urine",
         sampleVolume: "50 mL",
         container: "Sterile urine container",
         collectionMethods: ["Clean catch urine", "Catheterization"],
         fastingRequired: false,
         turnaroundTime: "3-5 days",
         price: 2000,
         active: true,
         parameters: [
           {
             code: "GRAM_STAIN_URINE",
             name: "Gram Stain",
             unit: "",
             referenceRanges: {
               adult: { normal: "No Significant Growth Obtained" }
             },
             dataType: "text",
             options: ["No Significant Growth Obtained", "Gram Negative Rods", "No Organism isolated", "No growth obtained after 24 hours incubation", "Klebsiella pneumoniae isolated"]
           },
           {
             code: "ORGANISM_ISOLATED",
             name: "Organism Isolated",
             unit: "",
             referenceRanges: {
               adult: { normal: "No growth" }
             },
             dataType: "text",
             options: ["Pseudomonas aeruginosa", "Escherichia coli", "Klebsiella pneumoniae"]
           },
           {
             code: "CHLORAMPHENICOLE",
             name: "Chloramphenicole",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant"]
           },
           {
             code: "TETRACYCLINE",
             name: "Tetracycline",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant"]
           },
           {
             code: "STREPTOMYCIN",
             name: "Streptomycin",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant"]
           },
           {
             code: "KANAMYCIN",
             name: "Kanamycin",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant"]
           },
           {
             code: "GENTAMICIN",
             name: "Gentamicin",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant"]
           },
           {
             code: "AMPICILINE",
             name: "Ampiciline",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant"]
           },
           {
             code: "COTRIMOXAZOLE_URINE",
             name: "Cotrimoxazole",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant"]
           },
           {
             code: "SULPHAMETHOXAZOLE",
             name: "Sulphamethoxazole",
             unit: "",
             referenceRanges: {
               adult: { normal: "Not Applicable" }
             },
             dataType: "text",
             options: ["Sensitive", "Resistant"]
           }
         ]
       },

       "VITAMIN_B12": {
         id: "VITAMIN_B12",
         name: "Vitamin B12",
         displayName: "Vitamin B12",
         category: "VITAMINS",
         description: "Vitamin B12 levels",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "VIT_B12",
             name: "Vit b12 levels",
             unit: "pg/ml",
             referenceRanges: {
               adult: { min: 197, max: 771 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "VITAMIN_D": {
         id: "VITAMIN_D",
         name: "Vitamin D",
         displayName: "Vitamin D",
         category: "VITAMINS",
         description: "Vitamin D status assessment",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "VIT_D_25_OH",
             name: "25 Hydroxy (OH) Vit D",
             unit: "ng/mL",
             referenceRanges: {
               deficiency: { min: 0, max: 10 },
               insufficiency: { min: 10, max: 30 },
               sufficiency: { min: 30, max: 100 },
               toxicity: { min: 100, max: 999 }
             },
             dataType: "text",
             options: ["High", "Low", "Normal", "Deficiency <10", "Insufficiency: 10 - 30", "Sufficiency: 30 -100", "Toxicity > 100"]
           }
         ]
       },

       "CORTISOL_SERUM": {
         id: "CORTISOL_SERUM",
         name: "Cortisol Serum",
         displayName: "Cortisol Serum",
         category: "ENDOCRINOLOGY",
         description: "Cortisol hormone levels",
         sampleType: "Blood Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2800,
         active: true,
         parameters: [
           {
             code: "CORTISOL_MORNING",
             name: "Cortisol Morning (AM)",
             unit: "nmol/L",
             referenceRanges: {
               adult: { min: 140, max: 700 }
             },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "CORTISOL_EVENING",
             name: "Cortisol Evening (PM)",
             unit: "nmol/L",
             referenceRanges: {
               adult: { min: 80, max: 350 }
             },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       // Rapid Diagnostic Tests (All Positive/Negative)
       "BHCG_QUAL": {
         id: "BHCG_QUAL",
         name: "Beta hCG Qualitative",
         displayName: "BhCG (Qualitative)",
         category: "RAPID_DIAGNOSTICS",
         description: "Qualitative pregnancy test",
         sampleType: "Serum/Urine",
         sampleVolume: "5 mL",
         container: "Sterile container",
         collectionMethods: ["Venipuncture", "Clean Catch Urine"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 800,
         active: true,
         parameters: [
           {
             code: "BHCG_RESULT",
             name: "Beta hCG Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "CHLAMYDIA": {
         id: "CHLAMYDIA",
         name: "Chlamydia Antigen",
         displayName: "Chlamydia",
         category: "RAPID_DIAGNOSTICS",
         description: "Chlamydia trachomatis antigen detection",
         sampleType: "Urine/Swab",
         sampleVolume: "First void urine or swab",
         container: "Sterile container/Swab tube",
         collectionMethods: ["First void urine", "Cervical swab", "Urethral swab"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1200,
         active: true,
         parameters: [
           {
             code: "CHLAMYDIA_RESULT",
             name: "Chlamydia Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "PSA_QUAL": {
         id: "PSA_QUAL",
         name: "PSA Rapid Qualitative",
         displayName: "PSA Rapid Qualitative",
         category: "RAPID_DIAGNOSTICS",
         description: "Prostate specific antigen qualitative screening",
         sampleType: "Serum/Plasma",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1000,
         active: true,
         parameters: [
           {
             code: "PSA_QUAL_RESULT",
             name: "PSA Qualitative Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "GONORRHEA": {
         id: "GONORRHEA",
         name: "Gonorrhea Antigen",
         displayName: "Gonorrhea Antigen",
         category: "RAPID_DIAGNOSTICS",
         description: "Neisseria gonorrhoeae antigen detection",
         sampleType: "Urine/Swab",
         sampleVolume: "First void urine or swab",
         container: "Sterile container/Swab tube",
         collectionMethods: ["First void urine", "Cervical swab", "Urethral swab"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1200,
         active: true,
         parameters: [
           {
             code: "GONORRHEA_RESULT",
             name: "Gonorrhea Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "H_PYLORI": {
         id: "H_PYLORI",
         name: "H. pylori Antigen",
         displayName: "H pylori Ag",
         category: "RAPID_DIAGNOSTICS",
         description: "Helicobacter pylori stool antigen test",
         sampleType: "Stool",
         sampleVolume: "2-5 g",
         container: "Sterile stool container",
         collectionMethods: ["Stool collection"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "H_PYLORI_RESULT",
             name: "H. pylori Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "HEP_B_AG": {
         id: "HEP_B_AG",
         name: "Hepatitis B Surface Antigen",
         displayName: "Hep B (Surface Ag)",
         category: "RAPID_DIAGNOSTICS",
         description: "Hepatitis B surface antigen detection",
         sampleType: "Serum/Plasma",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1800,
         active: true,
         parameters: [
           {
             code: "HEP_B_RESULT",
             name: "Hepatitis B Surface Ag",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "HEP_C_AB": {
         id: "HEP_C_AB",
         name: "Hepatitis C Antibody",
         displayName: "Hep C (Ab)",
         category: "RAPID_DIAGNOSTICS",
         description: "Hepatitis C antibody detection",
         sampleType: "Serum/Plasma",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1800,
         active: true,
         parameters: [
           {
             code: "HEP_C_RESULT",
             name: "Hepatitis C Antibody",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "HIV_CONFIRM": {
         id: "HIV_CONFIRM",
         name: "HIV Confirmation Test",
         displayName: "HIV (Confirmation - First Response)",
         category: "RAPID_DIAGNOSTICS",
         description: "HIV confirmation rapid test",
         sampleType: "Serum/Plasma/Whole Blood",
         sampleVolume: "3 mL or finger prick",
         container: "EDTA tube or capillary tube",
         collectionMethods: ["Venipuncture", "Finger prick"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 2000,
         active: true,
         parameters: [
           {
             code: "HIV_CONFIRM_RESULT",
             name: "HIV Confirmation Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "HIV_DETERMINE": {
         id: "HIV_DETERMINE",
         name: "HIV Determine",
         displayName: "HIV Determine",
         category: "RAPID_DIAGNOSTICS",
         description: "HIV rapid screening test",
         sampleType: "Serum/Plasma/Whole Blood",
         sampleVolume: "3 mL or finger prick",
         container: "EDTA tube or capillary tube",
         collectionMethods: ["Venipuncture", "Finger prick"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1800,
         active: true,
         parameters: [
           {
             code: "HIV_DETERMINE_RESULT",
             name: "HIV Determine Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "MALARIA_AG": {
         id: "MALARIA_AG",
         name: "Malaria Antigen",
         displayName: "Malaria Ag",
         category: "RAPID_DIAGNOSTICS",
         description: "Malaria parasite antigen detection",
         sampleType: "Whole Blood",
         sampleVolume: "2-3 mL or finger prick",
         container: "EDTA tube or capillary tube",
         collectionMethods: ["Venipuncture", "Finger prick"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1200,
         active: true,
         parameters: [
           {
             code: "MALARIA_RESULT",
             name: "Malaria Antigen Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "ROTA_ADENO": {
         id: "ROTA_ADENO",
         name: "Rotavirus/Adenovirus",
         displayName: "Rota/adeno",
         category: "RAPID_DIAGNOSTICS",
         description: "Rotavirus and Adenovirus stool antigen test",
         sampleType: "Stool",
         sampleVolume: "2-5 g",
         container: "Sterile stool container",
         collectionMethods: ["Stool collection"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "ROTA_RESULT",
             name: "Rotavirus Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           },
           {
             code: "ADENO_RESULT",
             name: "Adenovirus Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "SALMONELLA_AG": {
         id: "SALMONELLA_AG",
         name: "Salmonella Antigen",
         displayName: "Salmonella Ag",
         category: "RAPID_DIAGNOSTICS",
         description: "Salmonella stool antigen test",
         sampleType: "Stool",
         sampleVolume: "2-5 g",
         container: "Sterile stool container",
         collectionMethods: ["Stool collection"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1200,
         active: true,
         parameters: [
           {
             code: "SALMONELLA_RESULT",
             name: "Salmonella Antigen Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "COVID_AG": {
         id: "COVID_AG",
         name: "SARS-CoV-2 Antigen",
         displayName: "SARS-CoV-2 Ag",
         category: "RAPID_DIAGNOSTICS",
         description: "COVID-19 rapid antigen test",
         sampleType: "Nasopharyngeal/Oropharyngeal Swab",
         sampleVolume: "Swab sample",
         container: "Viral transport medium",
         collectionMethods: ["Nasopharyngeal swab", "Oropharyngeal swab"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "COVID_AG_RESULT",
             name: "SARS-CoV-2 Ag Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "SYPHILIS_VDRL": {
         id: "SYPHILIS_VDRL",
         name: "Syphilis VDRL",
         displayName: "Syphilis VDRL",
         category: "RAPID_DIAGNOSTICS",
         description: "Venereal Disease Research Laboratory test for syphilis",
         sampleType: "Serum",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "VDRL_RESULT",
             name: "VDRL Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "FOBT": {
         id: "FOBT",
         name: "Fecal Occult Blood Test",
         displayName: "Fecal Occult Blood",
         category: "RAPID_DIAGNOSTICS",
         description: "Fecal occult blood detection",
         sampleType: "Stool",
         sampleVolume: "Small sample",
         container: "FOBT collection kit",
         collectionMethods: ["Stool collection"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 800,
         active: true,
         parameters: [
           {
             code: "FOBT_RESULT",
             name: "Fecal Occult Blood Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       "PSA_QUANT_RAPID": {
         id: "PSA_QUANT_RAPID",
         name: "PSA Rapid Quantitative",
         displayName: "PSA Rapid Quantitative",
         category: "RAPID_DIAGNOSTICS",
         description: "Prostate specific antigen quantitative rapid test",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "15-30 minutes",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "PSA_QUANT_RAPID_RESULT",
             name: "PSA Rapid Quantitative Result",
             unit: "",
             referenceRanges: {
               adult: { normal: "Negative" }
             },
             dataType: "text",
             options: ["Positive", "Negative"]
           }
         ]
       },

       // Legacy tests from original service file (keeping for compatibility)
       "CBC": {
         id: "CBC",
         name: "Complete Blood Count",
         displayName: "Complete Blood Count (CBC)",
         category: "HEMATOLOGY",
         description: "Complete analysis of blood cells including RBC, WBC, and platelets",
         sampleType: "Blood",
         sampleVolume: "3-5 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture", "Finger Prick"],
         fastingRequired: false,
         turnaroundTime: "2-4 hours",
         price: 1500,
         active: true,
         parameters: [
           {
             code: "WBC",
             name: "White Blood Cells",
             unit: "×10³/μL",
             referenceRanges: {
               adult: { min: 4.5, max: 11.0 },
               pediatric: { min: 5.0, max: 15.0 }
             },
             criticalValues: { low: 2.0, high: 30.0 },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "RBC",
             name: "Red Blood Cells",
             unit: "×10⁶/μL",
             referenceRanges: {
               "adult_male": { min: 4.7, max: 6.1 },
               "adult_female": { min: 4.2, max: 5.4 },
               pediatric: { min: 4.0, max: 5.5 }
             },
             criticalValues: { low: 2.0, high: 8.0 },
             dataType: "numeric",
             precision: 2
           },
           {
             code: "HGB",
             name: "Hemoglobin",
             unit: "g/dL",
             referenceRanges: {
               "adult_male": { min: 14.0, max: 18.0 },
               "adult_female": { min: 12.0, max: 16.0 },
               pediatric: { min: 11.0, max: 16.0 }
             },
             criticalValues: { low: 7.0, high: 20.0 },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "HCT",
             name: "Hematocrit",
             unit: "%",
             referenceRanges: {
               "adult_male": { min: 42, max: 52 },
               "adult_female": { min: 37, max: 47 },
               pediatric: { min: 32, max: 44 }
             },
             criticalValues: { low: 20, high: 60 },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PLT",
             name: "Platelets",
             unit: "×10³/μL",
             referenceRanges: {
               adult: { min: 150, max: 450 },
               pediatric: { min: 150, max: 450 }
             },
             criticalValues: { low: 50, high: 1000 },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "BMP": {
         id: "BMP",
         name: "Basic Metabolic Panel",
         displayName: "Basic Metabolic Panel (BMP)",
         category: "CLINICAL_CHEMISTRY",
         description: "Basic blood chemistry panel including glucose, electrolytes, and kidney function",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: true,
         fastingHours: 8,
         turnaroundTime: "2-4 hours",
         price: 2000,
         active: true,
         parameters: [
           {
             code: "GLU",
             name: "Glucose",
             unit: "mg/dL",
             referenceRanges: {
               fasting: { min: 70, max: 100 },
               random: { min: 70, max: 140 }
             },
             criticalValues: { low: 40, high: 400 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "BUN",
             name: "Blood Urea Nitrogen",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 7, max: 20 },
               pediatric: { min: 5, max: 18 }
             },
             criticalValues: { low: null, high: 100 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "CREAT",
             name: "Creatinine",
             unit: "mg/dL",
             referenceRanges: {
               "adult_male": { min: 0.7, max: 1.3 },
               "adult_female": { min: 0.6, max: 1.1 },
               pediatric: { min: 0.3, max: 0.7 }
             },
             criticalValues: { low: null, high: 10.0 },
             dataType: "numeric",
             precision: 2
           },
           {
             code: "NA",
             name: "Sodium",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 136, max: 145 },
               pediatric: { min: 136, max: 145 }
             },
             criticalValues: { low: 120, high: 160 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "K",
             name: "Potassium",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 3.5, max: 5.1 },
               pediatric: { min: 3.4, max: 4.7 }
             },
             criticalValues: { low: 2.5, high: 6.5 },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "CL",
             name: "Chloride",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 98, max: 107 },
               pediatric: { min: 98, max: 107 }
             },
             criticalValues: { low: 80, high: 120 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "CO2",
             name: "Carbon Dioxide",
             unit: "mmol/L",
             referenceRanges: {
               adult: { min: 22, max: 29 },
               pediatric: { min: 20, max: 28 }
             },
             criticalValues: { low: 10, high: 40 },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "LIPID": {
         id: "LIPID",
         name: "Lipid Panel",
         displayName: "Lipid Panel",
         category: "CLINICAL_CHEMISTRY",
         description: "Cholesterol and lipid analysis for cardiovascular risk assessment",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: true,
         fastingHours: 12,
         turnaroundTime: "4-6 hours",
         price: 2500,
         active: true,
         parameters: [
           {
             code: "CHOL",
             name: "Total Cholesterol",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 125, max: 200 }
             },
             criticalValues: { low: null, high: 400 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "HDL",
             name: "HDL Cholesterol",
             unit: "mg/dL",
             referenceRanges: {
               "adult_male": { min: 40, max: 60 },
               "adult_female": { min: 50, max: 60 }
             },
             criticalValues: { low: 20, high: null },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "LDL",
             name: "LDL Cholesterol",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 0, max: 100 }
             },
             criticalValues: { low: null, high: 300 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "TRIG",
             name: "Triglycerides",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 0, max: 150 }
             },
             criticalValues: { low: null, high: 1000 },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "URINALYSIS": {
         id: "URINALYSIS",
         name: "Urinalysis",
         displayName: "Urinalysis",
         category: "URINALYSIS",
         description: "Complete urine analysis including physical, chemical, and microscopic examination",
         sampleType: "Urine",
         sampleVolume: "50 mL",
         container: "Sterile urine container",
         collectionMethods: ["Clean Catch", "Catheterization", "Suprapubic"],
         fastingRequired: false,
         turnaroundTime: "1-2 hours",
         price: 800,
         active: true,
         parameters: [
           {
             code: "COLOR",
             name: "Color",
             unit: "",
             referenceRanges: {
               adult: { normal: "Yellow" }
             },
             dataType: "text",
             options: ["Pale Yellow", "Yellow", "Dark Yellow", "Amber", "Red", "Brown", "Clear"]
           },
           {
             code: "CLARITY",
             name: "Clarity",
             unit: "",
             referenceRanges: {
               adult: { normal: "Clear" }
             },
             dataType: "text",
             options: ["Clear", "Slightly Turbid", "Turbid", "Cloudy"]
           },
           {
             code: "PH",
             name: "pH",
             unit: "",
             referenceRanges: {
               adult: { min: 4.5, max: 8.0 }
             },
             criticalValues: { low: 4.0, high: 9.0 },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "PROTEIN",
             name: "Protein",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 0, max: 20 }
             },
             criticalValues: { low: null, high: 300 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "GLUCOSE_U",
             name: "Glucose",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 0, max: 15 }
             },
             criticalValues: { low: null, high: 1000 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "WBC_U",
             name: "WBC",
             unit: "/HPF",
             referenceRanges: {
               adult: { min: 0, max: 5 }
             },
             criticalValues: { low: null, high: 50 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "RBC_U",
             name: "RBC",
             unit: "/HPF",
             referenceRanges: {
               adult: { min: 0, max: 2 }
             },
             criticalValues: { low: null, high: 25 },
             dataType: "numeric",
             precision: 0
           }
         ]
       },

       "LFT": {
         id: "LFT",
         name: "Liver Function Tests",
         displayName: "Liver Function Tests (LFT)",
         category: "CLINICAL_CHEMISTRY",
         description: "Comprehensive liver function assessment",
         sampleType: "Blood",
         sampleVolume: "5 mL",
         container: "SST tube (Gold top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 3000,
         active: true,
         parameters: [
           {
             code: "ALT",
             name: "Alanine Aminotransferase",
             unit: "U/L",
             referenceRanges: {
               "adult_male": { min: 10, max: 40 },
               "adult_female": { min: 7, max: 35 }
             },
             criticalValues: { low: null, high: 1000 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "AST",
             name: "Aspartate Aminotransferase",
             unit: "U/L",
             referenceRanges: {
               "adult_male": { min: 10, max: 40 },
               "adult_female": { min: 9, max: 32 }
             },
             criticalValues: { low: null, high: 1000 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "ALP",
             name: "Alkaline Phosphatase",
             unit: "U/L",
             referenceRanges: {
               adult: { min: 44, max: 147 },
               pediatric: { min: 100, max: 400 }
             },
             criticalValues: { low: null, high: 1000 },
             dataType: "numeric",
             precision: 0
           },
           {
             code: "TBIL",
             name: "Total Bilirubin",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 0.1, max: 1.2 },
               newborn: { min: 1.0, max: 12.0 }
             },
             criticalValues: { low: null, high: 15.0 },
             dataType: "numeric",
             precision: 1
           },
           {
             code: "DBIL",
             name: "Direct Bilirubin",
             unit: "mg/dL",
             referenceRanges: {
               adult: { min: 0.0, max: 0.3 }
             },
             criticalValues: { low: null, high: 10.0 },
             dataType: "numeric",
             precision: 1
           }
         ]
       },

       "HBA1C": {
         id: "HBA1C",
         name: "Hemoglobin A1c",
         displayName: "Hemoglobin A1c",
         category: "ENDOCRINOLOGY",
         description: "Long-term blood glucose control assessment",
         sampleType: "Blood",
         sampleVolume: "3 mL",
         container: "EDTA tube (Purple top)",
         collectionMethods: ["Venipuncture"],
         fastingRequired: false,
         turnaroundTime: "4-6 hours",
         price: 2200,
         active: true,
         parameters: [
           {
             code: "HBA1C",
             name: "Hemoglobin A1c",
             unit: "%",
             referenceRanges: {
               nondiabetic: { min: 4.0, max: 5.6 },
               prediabetic: { min: 5.7, max: 6.4 },
               diabetic: { min: 6.5, max: 15.0 }
             },
             criticalValues: { low: null, high: 15.0 },
             dataType: "numeric",
             precision: 1
           }
         ]
       }
     }
   };
   
   await this.saveCatalog();
 }

 // Get all tests
 async getAllTests() {
   const catalog = await this.loadCatalog();
   return Object.values(catalog.tests);
 }

 // Get tests by category
 async getTestsByCategory(categoryId) {
   const catalog = await this.loadCatalog();
   return Object.values(catalog.tests).filter(test => test.category === categoryId);
 }

 // Get active tests only
 async getActiveTests() {
   const catalog = await this.loadCatalog();
   return Object.values(catalog.tests).filter(test => test.active);
 }

 // Get test by ID
 async getTestById(testId) {
   const catalog = await this.loadCatalog();
   return catalog.tests[testId] || null;
 }

 // Search tests
 async searchTests(query) {
   const catalog = await this.loadCatalog();
   const searchTerm = query.toLowerCase();
   
   return Object.values(catalog.tests).filter(test => 
     test.name.toLowerCase().includes(searchTerm) ||
     test.displayName.toLowerCase().includes(searchTerm) ||
     test.description.toLowerCase().includes(searchTerm)
   );
 }

 // Get categories
 async getCategories() {
   const catalog = await this.loadCatalog();
   return catalog.categories;
 }

 // Add new test
 async addTest(testData) {
   const catalog = await this.loadCatalog();
   
   if (catalog.tests[testData.id]) {
     throw new Error(`Test with ID ${testData.id} already exists`);
   }

   // Validate required fields
   const required = ['id', 'name', 'displayName', 'category', 'sampleType', 'parameters'];
   for (const field of required) {
     if (!testData[field]) {
       throw new Error(`${field} is required`);
     }
   }

   // Set defaults
   const newTest = {
     ...testData,
     active: testData.active !== undefined ? testData.active : true,
     price: testData.price || 0,
     fastingRequired: testData.fastingRequired || false,
     turnaroundTime: testData.turnaroundTime || "2-4 hours"
   };

   catalog.tests[testData.id] = newTest;
   catalog.lastUpdated = new Date().toISOString();
   
   await this.saveCatalog();
   return newTest;
 }

 // Update test
 async updateTest(testId, updateData) {
   const catalog = await this.loadCatalog();
   
   if (!catalog.tests[testId]) {
     throw new Error(`Test with ID ${testId} not found`);
   }

   // Don't allow changing the ID
   if (updateData.id && updateData.id !== testId) {
     throw new Error('Cannot change test ID');
   }

   catalog.tests[testId] = {
     ...catalog.tests[testId],
     ...updateData,
     id: testId // Ensure ID doesn't change
   };
   
   catalog.lastUpdated = new Date().toISOString();
   
   await this.saveCatalog();
   return catalog.tests[testId];
 }

 // Delete test (soft delete by setting active to false)
 async deleteTest(testId) {
   const catalog = await this.loadCatalog();
   
   if (!catalog.tests[testId]) {
     throw new Error(`Test with ID ${testId} not found`);
   }

   catalog.tests[testId].active = false;
   catalog.lastUpdated = new Date().toISOString();
   
   await this.saveCatalog();
   return true;
 }

 // Permanently remove test
 async removeTest(testId) {
   const catalog = await this.loadCatalog();
   
   if (!catalog.tests[testId]) {
     throw new Error(`Test with ID ${testId} not found`);
   }

   delete catalog.tests[testId];
   catalog.lastUpdated = new Date().toISOString();
   
   await this.saveCatalog();
   return true;
 }

 // Add category
 async addCategory(categoryId, categoryData) {
   const catalog = await this.loadCatalog();
   
   if (catalog.categories[categoryId]) {
     throw new Error(`Category with ID ${categoryId} already exists`);
   }

   catalog.categories[categoryId] = categoryData;
   catalog.lastUpdated = new Date().toISOString();
   
   await this.saveCatalog();
   return categoryData;
 }

 // Get test statistics
 async getTestStatistics() {
   const catalog = await this.loadCatalog();
   const tests = Object.values(catalog.tests);
   const categories = Object.keys(catalog.categories);

   const stats = {
     totalTests: tests.length,
     activeTests: tests.filter(t => t.active).length,
     inactiveTests: tests.filter(t => !t.active).length,
     totalCategories: categories.length,
     testsByCategory: {},
     averagePrice: 0,
     priceRange: { min: 0, max: 0 }
   };

   // Calculate tests by category
   categories.forEach(cat => {
     stats.testsByCategory[cat] = tests.filter(t => t.category === cat).length;
   });

   // Calculate price statistics
   const prices = tests.filter(t => t.price > 0).map(t => t.price);
   if (prices.length > 0) {
     stats.averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
     stats.priceRange.min = Math.min(...prices);
     stats.priceRange.max = Math.max(...prices);
   }

   return stats;
 }

 // Export catalog
 async exportCatalog() {
   return await this.loadCatalog();
 }

 // Import catalog
 async importCatalog(catalogData) {
   // Validate catalog structure
   if (!catalogData.tests || !catalogData.categories) {
     throw new Error('Invalid catalog format');
   }

   this.catalog = {
     ...catalogData,
     lastUpdated: new Date().toISOString()
   };
   
   await this.saveCatalog();
   return this.catalog;
 }
}

module.exports = new LabTestCatalogService();