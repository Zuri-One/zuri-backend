// db-check-antony.js
const { Client } = require('pg');
require('dotenv').config();

async function findAntonyUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Search for users with name containing "antony" (case insensitive)
    const query = `
      SELECT 
        id,
        surname,
        "otherNames",
        email,
        telephone1,
        telephone2,
        role,
        "employeeId",
        password IS NOT NULL as has_password,
        "isActive",
        status,
        "loginAttempts",
        "lockUntil",
        "createdAt",
        "updatedAt"
      FROM "Users" 
      WHERE 
        LOWER(surname) LIKE '%antony%' 
        OR LOWER("otherNames") LIKE '%antony%'
        OR LOWER(CONCAT(surname, ' ', "otherNames")) LIKE '%antony%'
      ORDER BY "createdAt" DESC;
    `;

    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('No users found with name containing "antony"');
      
      // Also check in Patients table if no staff found
      const patientQuery = `
        SELECT 
          id,
          surname,
          "otherNames",
          email,
          telephone1,
          telephone2,
          "patientNumber",
          "isActive",
          "createdAt"
        FROM "Patients" 
        WHERE 
          LOWER(surname) LIKE '%antony%' 
          OR LOWER("otherNames") LIKE '%antony%'
          OR LOWER(CONCAT(surname, ' ', "otherNames")) LIKE '%antony%'
        ORDER BY "createdAt" DESC;
      `;
      
      const patientResult = await client.query(patientQuery);
      
      if (patientResult.rows.length > 0) {
        console.log('\n=== PATIENTS FOUND ===');
        patientResult.rows.forEach((user, index) => {
          console.log(`\n--- Patient ${index + 1} ---`);
          console.log(`ID: ${user.id}`);
          console.log(`Name: ${user.surname} ${user.otherNames}`);
          console.log(`Email: ${user.email || 'Not set'}`);
          console.log(`Phone 1: ${user.telephone1 || 'Not set'}`);
          console.log(`Phone 2: ${user.telephone2 || 'Not set'}`);
          console.log(`Patient Number: ${user.patientNumber || 'Not set'}`);
          console.log(`Active: ${user.isActive}`);
          console.log(`Created: ${user.createdAt}`);
        });
      } else {
        console.log('No patients found either.');
      }
      
    } else {
      console.log(`\n=== STAFF/USERS FOUND: ${result.rows.length} ===`);
      
      result.rows.forEach((user, index) => {
        console.log(`\n--- User ${index + 1} ---`);
        console.log(`ID: ${user.id}`);
        console.log(`Name: ${user.surname} ${user.otherNames}`);
        console.log(`Email: ${user.email}`);
        console.log(`Phone 1: ${user.telephone1 || 'Not set'}`);
        console.log(`Phone 2: ${user.telephone2 || 'Not set'}`);
        console.log(`Role: ${user.role}`);
        console.log(`Employee ID: ${user.employeeId || 'Not set'}`);
        console.log(`Has Password: ${user.has_password}`);
        console.log(`Active: ${user.isActive}`);
        console.log(`Status: ${user.status}`);
        console.log(`Login Attempts: ${user.loginAttempts}`);
        console.log(`Locked Until: ${user.lockUntil || 'Not locked'}`);
        console.log(`Created: ${user.createdAt}`);
        console.log(`Updated: ${user.updatedAt}`);
      });
    }

  } catch (error) {
    console.error('Database query error:', error);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
findAntonyUser().catch(console.error);