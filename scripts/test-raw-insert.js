#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('pg');

async function testRawInsert() {
  console.log('=== Testing Raw PostgreSQL Insert ===');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('1. Connecting to database...');
    await client.connect();
    console.log('✅ Connected');
    
    console.log('2. Testing simple insert...');
    const phone = `+254700${Math.floor(Math.random() * 900000) + 100000}`;
    const patientNumber = `TEST${Date.now()}`;
    
    const result = await client.query(`
      INSERT INTO "Patients" (
        id, surname, "otherNames", sex, "dateOfBirth", 
        nationality, telephone1, town, residence, 
        "idType", "idNumber", "patientNumber", status, 
        "paymentScheme", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 'RAW', 'TEST', 'FEMALE', '1990-01-01',
        'Kenyan', $1, 'Test', 'Test',
        'NATIONAL_ID', $2, $3, 'WAITING',
        '{"type": "CASH", "provider": null}', true, NOW(), NOW()
      ) RETURNING id, "patientNumber"
    `, [phone, patientNumber, patientNumber]);
    
    console.log('✅ Raw insert successful:', result.rows[0]);
    
    console.log('3. Testing with transaction...');
    await client.query('BEGIN');
    
    const phone2 = `+254700${Math.floor(Math.random() * 900000) + 100000}`;
    const patientNumber2 = `TEST${Date.now()}`;
    
    const result2 = await client.query(`
      INSERT INTO "Patients" (
        id, surname, "otherNames", sex, "dateOfBirth", 
        nationality, telephone1, town, residence, 
        "idType", "idNumber", "patientNumber", status, 
        "paymentScheme", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 'TRANS', 'TEST', 'MALE', '1990-01-01',
        'Kenyan', $1, 'Test', 'Test',
        'NATIONAL_ID', $2, $3, 'WAITING',
        '{"type": "CASH", "provider": null}', true, NOW(), NOW()
      ) RETURNING id, "patientNumber"
    `, [phone2, patientNumber2, patientNumber2]);
    
    await client.query('COMMIT');
    console.log('✅ Transaction insert successful:', result2.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError.message);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  testRawInsert().catch(console.error);
}