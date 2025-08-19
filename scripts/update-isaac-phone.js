#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('pg');

async function updateIsaacPhone() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Zuri@2025', 10);
    
    const result = await client.query(`
      UPDATE "Users" 
      SET telephone1 = '+254750355684', password = $1
      WHERE surname = 'Dr.' AND "otherNames" = 'Isaac' AND email = 'isaacwambiri254@gmail.com'
      RETURNING id, surname, "otherNames", telephone1
    `, [hashedPassword]);

    if (result.rows.length > 0) {
      console.log('✅ Updated Dr. Isaac phone number and password:', result.rows[0]);
      console.log('New password: Zuri@2025');
    } else {
      console.log('❌ Dr. Isaac not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  updateIsaacPhone().catch(console.error);
}