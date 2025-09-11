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
    console.log('📝 Text length:', pdfData.text.length);
    
    // Split text into lines and process
    const lines = pdfData.text.split('\n');
    const medications = [];
    
    console.log('\n🔍 Processing PDF content...');
    
    // Look for table data patterns
    let inTable = false;
    let headerFound = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Look for header row
      if (line.includes('Item Code') && line.includes('Item Description')) {
        headerFound = true;
        inTable = true;
        console.log('✅ Found table header at line', i);
        continue;
      }
      
      // Skip non-table content
      if (!inTable || !headerFound) continue;
      
      // Skip header-like lines
      if (line.includes('Pack Size') || line.includes('Tax Code') || line.includes('Discounted')) continue;
      
      // Try to parse medication data
      const medication = parseMedicationLine(line);
      if (medication) {
        medications.push(medication);
      }
    }
    
    console.log(`\n📋 Found ${medications.length} medications`);
    
    // Show first few entries for verification
    console.log('\n📋 Sample entries:');
    medications.slice(0, 5).forEach((med, index) => {
      console.log(`${index + 1}. ${med.itemCode} - ${med.itemDescription} - ${med.packSize} - ${med.taxCode} - ${med.price}`);
    });
    
    if (medications.length > 0) {
      const proceed = await askQuestion('\n❓ Proceed with database import? (y/n): ');
      if (proceed === 'y') {
        await importToDatabase(medications);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

function parseMedicationLine(line) {
  // Pattern: ItemCode ItemDescription PackSize TaxCode Price
  // Example: "GSKP001 3TC Tablets (Epivir) 150mg 60s 60s 0.00 4,800.2"
  
  // Split by whitespace but preserve multi-word descriptions
  const parts = line.split(/\s+/);
  
  if (parts.length < 3) return null;
  
  // First part should be item code (letters + numbers)
  const itemCode = parts[0];
  if (!/^[A-Z]+\d+$/.test(itemCode)) return null;
  
  // Last part should be price (number with possible comma and decimal)
  const lastPart = parts[parts.length - 1];
  const price = parseFloat(lastPart.replace(/,/g, ''));
  if (isNaN(price)) return null;
  
  // Second to last should be tax code (decimal number)
  const taxPart = parts[parts.length - 2];
  const taxCode = parseFloat(taxPart);
  if (isNaN(taxCode)) return null;
  
  // Find pack size (usually ends with 's', 'ml', 'g', etc.)
  let packSize = null;
  let packSizeIndex = -1;
  
  for (let i = parts.length - 3; i >= 1; i--) {
    const part = parts[i];
    if (/\d+(s|ml|g|mg|L|litre|Litre)$/.test(part) || /^\d+$/.test(part)) {
      packSize = part;
      packSizeIndex = i;
      break;
    }
  }
  
  // Description is everything between item code and pack size (or tax code if no pack size)
  const endIndex = packSizeIndex > 0 ? packSizeIndex : parts.length - 2;
  const itemDescription = parts.slice(1, endIndex).join(' ');
  
  if (!itemDescription) return null;
  
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

function askQuestion(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

if (require.main === module) {
  importOmaeraMedications().catch(console.error);
}