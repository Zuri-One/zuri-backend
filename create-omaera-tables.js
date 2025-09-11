#!/usr/bin/env node

require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function createOmaeraTables() {
  try {
    console.log('🔧 Creating Omaera tables...');
    
    // Create OmaeraMedications table
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
    
    // Create PharmacyBills table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "PharmacyBills" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "billNumber" VARCHAR(255) NOT NULL UNIQUE,
        "patientId" UUID NOT NULL REFERENCES "Patients"(id),
        items JSONB NOT NULL DEFAULT '[]',
        subtotal DECIMAL(10,2) NOT NULL,
        "totalTax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "totalAmount" DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'ESCALATED')),
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
    
    console.log('✅ Tables created successfully');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  createOmaeraTables().catch(console.error);
}

module.exports = { createOmaeraTables };