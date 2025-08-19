#!/usr/bin/env node

require('dotenv').config();
const { sequelize } = require('../src/models');

async function killBlockingQueries() {
  console.log('=== Killing Blocking Database Queries ===');
  
  try {
    console.log('1. Finding all blocking processes...');
    const processes = await sequelize.query(`
      SELECT DISTINCT pid, usename, state, query_start, query
      FROM pg_stat_activity 
      WHERE state != 'idle' 
        AND query LIKE '%INSERT INTO "Patients"%'
      ORDER BY query_start;
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`Found ${processes.length} blocking processes:`);
    processes.forEach((proc, index) => {
      console.log(`${index + 1}. PID: ${proc.pid}, User: ${proc.usename}, State: ${proc.state}`);
      console.log(`   Started: ${proc.query_start}`);
      console.log(`   Query: ${proc.query.substring(0, 100)}...`);
    });
    
    if (processes.length === 0) {
      console.log('No blocking processes found.');
      return;
    }
    
    console.log('\n2. Killing all blocking processes...');
    for (const proc of processes) {
      try {
        await sequelize.query(`SELECT pg_terminate_backend(${proc.pid})`);
        console.log(`✅ Killed process ${proc.pid}`);
      } catch (error) {
        console.log(`❌ Failed to kill process ${proc.pid}: ${error.message}`);
      }
    }
    
    console.log('\n3. Verifying cleanup...');
    const remaining = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM pg_stat_activity 
      WHERE state != 'idle' 
        AND query LIKE '%INSERT INTO "Patients"%';
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`Remaining blocking processes: ${remaining[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  killBlockingQueries().catch(console.error);
}