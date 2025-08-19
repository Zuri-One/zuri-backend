#!/usr/bin/env node

require('dotenv').config();
const { sequelize } = require('../src/models');

async function checkDatabaseLocks() {
  console.log('=== Checking Database Locks ===');
  
  try {
    console.log('1. Testing basic connection...');
    await sequelize.authenticate();
    console.log('✅ Connection OK');
    
    console.log('2. Checking for active locks...');
    const locks = await sequelize.query(`
      SELECT 
        pg_locks.pid,
        pg_stat_activity.usename,
        pg_stat_activity.query,
        pg_stat_activity.state,
        pg_locks.mode,
        pg_locks.locktype,
        pg_locks.relation::regclass as table_name
      FROM pg_locks
      JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
      WHERE pg_stat_activity.state != 'idle'
      ORDER BY pg_locks.pid;
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Active locks:', locks);
    
    console.log('3. Checking for blocking queries...');
    const blocking = await sequelize.query(`
      SELECT 
        blocked_locks.pid AS blocked_pid,
        blocked_activity.usename AS blocked_user,
        blocking_locks.pid AS blocking_pid,
        blocking_activity.usename AS blocking_user,
        blocked_activity.query AS blocked_statement,
        blocking_activity.query AS current_statement_in_blocking_process
      FROM pg_catalog.pg_locks blocked_locks
      JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
      JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
      WHERE NOT blocked_locks.granted;
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Blocking queries:', blocking);
    
    console.log('4. Checking table constraints...');
    const constraints = await sequelize.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        tc.constraint_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'Patients'
      ORDER BY tc.constraint_type, tc.constraint_name;
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Patient table constraints:', constraints);
    
    console.log('5. Testing simple INSERT without transaction...');
    const testPhone = `+254700${Math.floor(Math.random() * 900000) + 100000}`;
    const testPatientNumber = `TEST${Date.now()}`;
    
    try {
      await sequelize.query(`
        INSERT INTO "Patients" (
          "id", "surname", "otherNames", "sex", "dateOfBirth", 
          "nationality", "telephone1", "town", "residence", 
          "idType", "idNumber", "patientNumber", "status", 
          "paymentScheme", "isActive", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), 'TEST', 'SIMPLE', 'FEMALE', '1990-01-01',
          'Kenyan', '${testPhone}', 'Test', 'Test',
          'NATIONAL_ID', '${testPatientNumber}', '${testPatientNumber}', 'WAITING',
          '{"type": "CASH", "provider": null}', true, NOW(), NOW()
        )
      `);
      console.log('✅ Simple INSERT worked');
    } catch (error) {
      console.error('❌ Simple INSERT failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  checkDatabaseLocks().catch(console.error);
}