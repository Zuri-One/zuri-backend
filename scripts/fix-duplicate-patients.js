#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('pg');

async function fixDuplicatePatients() {
  console.log('=== Fixing Duplicate CCP Patients ===');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Find all patients created by the import (with ZH numbers from today)
    const duplicatesResult = await client.query(`
      SELECT surname, "otherNames", COUNT(*) as count, 
             array_agg(id) as patient_ids,
             array_agg("patientNumber") as patient_numbers
      FROM "Patients" 
      WHERE "patientNumber" LIKE 'ZH%'
        AND "createdAt" > CURRENT_DATE
      GROUP BY surname, "otherNames"
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);

    const duplicates = duplicatesResult.rows;
    console.log(`Found ${duplicates.length} patients with duplicates:`);
    
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. ${dup.surname} ${dup.otherNames} - ${dup.count} duplicates`);
      console.log(`   Patient Numbers: ${dup.patient_numbers.join(', ')}`);
    });

    if (duplicates.length === 0) {
      console.log('No duplicates found.');
      return;
    }

    console.log('\n=== Cleanup Plan ===');
    console.log('1. Keep the FIRST patient record for each person');
    console.log('2. Delete the duplicate patient records');
    console.log('3. Create CCP follow-up records for each month they appeared');

    // For each duplicate group, keep first and delete others
    let totalDeleted = 0;
    
    for (const dup of duplicates) {
      const patientIds = dup.patient_ids;
      const keepId = patientIds[0]; // Keep first one
      const deleteIds = patientIds.slice(1); // Delete the rest
      
      console.log(`\nProcessing: ${dup.surname} ${dup.otherNames}`);
      console.log(`Keeping: ${keepId}`);
      console.log(`Deleting: ${deleteIds.join(', ')}`);
      
      // Delete duplicate patients
      for (const deleteId of deleteIds) {
        await client.query('DELETE FROM "Patients" WHERE id = $1', [deleteId]);
        totalDeleted++;
      }
    }

    console.log(`\n✅ Cleanup completed:`);
    console.log(`- Kept ${duplicates.length} unique patients`);
    console.log(`- Deleted ${totalDeleted} duplicate records`);
    
    // Show final count
    const finalCountResult = await client.query(`
      SELECT COUNT(*) as count FROM "Patients" 
      WHERE "patientNumber" LIKE 'ZH%' AND "createdAt" > CURRENT_DATE
    `);
    
    console.log(`- Final patient count: ${finalCountResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  fixDuplicatePatients().catch(console.error);
}