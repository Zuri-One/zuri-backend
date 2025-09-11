#!/usr/bin/env node

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const fs = require('fs');
const pdf = require('pdf-parse');

async function importOmaeraMedications() {
  try {
    console.log('🔍 Reading Omaera price list PDF...');
    
    const pdfPath = './Omaera price list.pdf';
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found:', pdfPath);
      return;
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log('📄 PDF parsed successfully');
    console.log('📊 Total pages:', pdfData.numpages);
    
    const lines = pdfData.text.split('\n');
    const medications = [];
    
    console.log('\n🔍 Processing PDF content...');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Skip headers and non-data lines
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
    
    console.log(`\n📋 Found ${medications.length} medications`);
    
    // Show first few entries for verification
    console.log('\n📋 Sample entries:');
    medications.slice(0, 10).forEach((med, index) => {
      console.log(`${index + 1}. ${med.itemCode} | ${med.itemDescription} | ${med.packSize} | ${med.taxCode} | ${med.price}`);
    });
    
    if (medications.length > 0) {
      console.log('\n✅ Proceeding with database import automatically...');
      await importToDatabase(medications);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

function parseMedicationLine(line) {
  // Examples from PDF:
  // "GSKP0013TC Tablets (Epivir) 150mg 60s60s0.004,800.2"
  // "SAI007ABZ Suspension 10ml0.0040.0"
  // "TOPI157Acetic Acid 4~6% 1 Litre1Litre0.00109.2"
  
  if (!line || line.length < 10) return null;
  
  // Extract item code (letters followed by numbers at start)
  const itemCodeMatch = line.match(/^([A-Z]+\d+)/);
  if (!itemCodeMatch) return null;
  
  const itemCode = itemCodeMatch[1];
  let remaining = line.substring(itemCode.length);
  
  // Extract price from the end (look for number with comma/decimal at end)
  const priceMatch = remaining.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*$/);
  if (!priceMatch) return null;
  
  const price = parseFloat(priceMatch[1].replace(/,/g, ''));
  if (isNaN(price) || price <= 0) return null;
  
  remaining = remaining.substring(0, remaining.lastIndexOf(priceMatch[1])).trim();
  
  // Extract tax code (decimal number before price, usually 0.00 or 0.16)
  const taxMatch = remaining.match(/(\d+\.\d{2})$/);
  if (!taxMatch) return null;
  
  const taxCode = parseFloat(taxMatch[1]);
  remaining = remaining.substring(0, remaining.lastIndexOf(taxMatch[1])).trim();
  
  // Try to extract pack size from the end
  let packSize = null;
  
  // Look for common pack size patterns at the end
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
  
  // What's left is the description
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

async function importToDatabase(medications) {
  try {
    console.log('\n💾 Importing to database...');
    
    // Create table if not exists
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
        "lastUpdatedBy" UUID,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    
    let imported = 0;
    let errors = 0;
    
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
        
        if (imported % 100 === 0) {
          console.log(`  ✅ Imported ${imported} medications...`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error importing ${med.itemCode}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n✅ Import completed: ${imported} imported, ${errors} errors`);
    
  } catch (error) {
    console.error('❌ Database import error:', error.message);
  }
}

// Removed askQuestion function - auto-proceeding

if (require.main === module) {
  importOmaeraMedications().catch(console.error);
}