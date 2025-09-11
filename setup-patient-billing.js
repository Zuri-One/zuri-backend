#!/usr/bin/env node

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const fs = require('fs');
const pdf = require('pdf-parse');

async function setupPatientBilling() {
  try {
    console.log('🔧 Setting up Patient Billing System...');
    
    // Step 1: Create tables
    console.log('\n1️⃣ Creating database tables...');
    await createTables();
    
    // Step 2: Import medications
    console.log('\n2️⃣ Importing medications from PDF...');
    await importMedications();
    
    // Step 3: Enable models
    console.log('\n3️⃣ Enabling models in index...');
    await enableModels();
    
    console.log('\n✅ Patient Billing System setup complete!');
    console.log('\n📋 Available endpoints:');
    console.log('  - GET /api/v1/patient-billing/patients/search');
    console.log('  - GET /api/v1/patient-billing/medications/search');
    console.log('  - POST /api/v1/patient-billing/bills');
    console.log('  - PUT /api/v1/patient-billing/bills/:id/status');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

async function createTables() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "OmaeraMedications" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "itemCode" VARCHAR(255) NOT NULL UNIQUE,
      "itemDescription" TEXT NOT NULL,
      "packSize" VARCHAR(255),
      "taxCode" DECIMAL(4,2) DEFAULT 0.00,
      "originalPrice" DECIMAL(10,2) NOT NULL,
      "currentPrice" DECIMAL(10,2) NOT NULL,
      "isActive" BOOLEAN DEFAULT true,
      "lastUpdatedBy" UUID REFERENCES "Users"(id),
      notes TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_omaera_item_code ON "OmaeraMedications"("itemCode");
    CREATE INDEX IF NOT EXISTS idx_omaera_description ON "OmaeraMedications"("itemDescription");
    CREATE INDEX IF NOT EXISTS idx_omaera_active ON "OmaeraMedications"("isActive");
    CREATE INDEX IF NOT EXISTS idx_omaera_price ON "OmaeraMedications"("currentPrice");
  `);
  
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "PharmacyBills" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "billNumber" VARCHAR(255) NOT NULL UNIQUE,
      "patientId" UUID NOT NULL REFERENCES "Patients"(id),
      items JSONB NOT NULL DEFAULT '[]',
      subtotal DECIMAL(10,2) NOT NULL,
      "totalTax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      "totalAmount" DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'ESCALATED', 'DEFAULT')),
      "paymentMethod" VARCHAR(100),
      "paymentReference" VARCHAR(255),
      "paidAt" TIMESTAMP,
      "createdBy" UUID NOT NULL REFERENCES "Users"(id),
      "updatedBy" UUID REFERENCES "Users"(id),
      notes TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_pharmacy_bill_number ON "PharmacyBills"("billNumber");
    CREATE INDEX IF NOT EXISTS idx_pharmacy_patient ON "PharmacyBills"("patientId");
    CREATE INDEX IF NOT EXISTS idx_pharmacy_status ON "PharmacyBills"(status);
    CREATE INDEX IF NOT EXISTS idx_pharmacy_created ON "PharmacyBills"("createdAt");
  `);
  
  console.log('  ✅ Tables created successfully');
}

async function importMedications() {
  const pdfPath = './Omaera price list.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.log('  ⚠️  PDF file not found, skipping import');
    return;
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdf(dataBuffer);
  const lines = pdfData.text.split('\n');
  const medications = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.includes('Item Code') || 
        trimmed.includes('Tax Code') || 
        trimmed.includes('OMAERA') || 
        trimmed.includes('Updated Inventory') ||
        trimmed.includes('NB: PRICES') ||
        trimmed.includes('(TAX INCL)') ||
        trimmed.includes('Discounted') ||
        trimmed.includes('Selling Price')) {
      continue;
    }
    
    const medication = parseMedicationLine(trimmed);
    if (medication) {
      medications.push(medication);
    }
  }
  
  console.log(`  📋 Found ${medications.length} medications`);
  
  if (medications.length > 0) {
    let imported = 0;
    for (const med of medications) {
      try {
        await sequelize.query(`
          INSERT INTO "OmaeraMedications" (
            "itemCode", "itemDescription", "packSize", "taxCode", 
            "originalPrice", "currentPrice"
          ) VALUES (
            :itemCode, :itemDescription, :packSize, :taxCode, 
            :price, :price
          ) ON CONFLICT ("itemCode") DO UPDATE SET
            "itemDescription" = EXCLUDED."itemDescription",
            "packSize" = EXCLUDED."packSize",
            "taxCode" = EXCLUDED."taxCode",
            "originalPrice" = EXCLUDED."originalPrice",
            "currentPrice" = EXCLUDED."currentPrice",
            "updatedAt" = NOW()
        `, {
          replacements: {
            itemCode: med.itemCode,
            itemDescription: med.itemDescription,
            packSize: med.packSize,
            taxCode: med.taxCode,
            price: med.price
          }
        });
        imported++;
      } catch (error) {
        // Skip errors
      }
    }
    console.log(`  ✅ Imported ${imported} medications`);
  }
}

function parseMedicationLine(line) {
  if (!line || line.length < 10) return null;
  
  const itemCodeMatch = line.match(/^([A-Z]+\d+)/);
  if (!itemCodeMatch) return null;
  
  const itemCode = itemCodeMatch[1];
  let remaining = line.substring(itemCode.length);
  
  const priceMatch = remaining.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*$/);
  if (!priceMatch) return null;
  
  const price = parseFloat(priceMatch[1].replace(/,/g, ''));
  if (isNaN(price) || price <= 0) return null;
  
  remaining = remaining.substring(0, remaining.lastIndexOf(priceMatch[1])).trim();
  
  const taxMatch = remaining.match(/(\d+\.\d{2})$/);
  if (!taxMatch) return null;
  
  const taxCode = parseFloat(taxMatch[1]);
  remaining = remaining.substring(0, remaining.lastIndexOf(taxMatch[1])).trim();
  
  let packSize = null;
  const packPatterns = [
    /(\d+(?:'s|s|ml|g|mg|L|litre|Litre|cm|Vial|Amps|Caps|Tabs))$/i,
    /(\d+\.\d+(?:ml|g|L))$/i,
    /(\d+(?:\*\d+)?(?:cm|mm))$/i
  ];
  
  for (const pattern of packPatterns) {
    const match = remaining.match(pattern);
    if (match) {
      packSize = match[1];
      remaining = remaining.substring(0, remaining.lastIndexOf(match[1])).trim();
      break;
    }
  }
  
  const itemDescription = remaining.trim();
  if (!itemDescription || itemDescription.length < 3) return null;
  
  return {
    itemCode,
    itemDescription,
    packSize,
    taxCode,
    price
  };
}

async function enableModels() {
  const indexPath = './src/models/index.js';
  let content = fs.readFileSync(indexPath, 'utf8');
  
  content = content.replace(
    '// const OmaeraMedication = require(\'./omaera-medication.model\');',
    'const OmaeraMedication = require(\'./omaera-medication.model\');'
  );
  
  content = content.replace(
    '// const PharmacyBill = require(\'./pharmacy-bill.model\');',
    'const PharmacyBill = require(\'./pharmacy-bill.model\');'
  );
  
  content = content.replace(
    '  // OmaeraMedication: OmaeraMedication.initModel(sequelize),',
    '  OmaeraMedication: OmaeraMedication.initModel(sequelize),'
  );
  
  content = content.replace(
    '  // PharmacyBill: PharmacyBill.initModel(sequelize)',
    '  PharmacyBill: PharmacyBill.initModel(sequelize)'
  );
  
  fs.writeFileSync(indexPath, content);
  console.log('  ✅ Models enabled in index.js');
}

if (require.main === module) {
  setupPatientBilling().catch(console.error);
}