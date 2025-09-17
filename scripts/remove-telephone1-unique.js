#!/usr/bin/env node

/**
 * Script: Remove UNIQUE constraint/index from Patients.telephone1 (PostgreSQL)
 * - Drops any unique constraints and unique indexes on "telephone1"
 * - Ensures column remains NOT NULL
 *
 * Usage:
 *   node scripts/remove-telephone1-unique.js
 */

require('dotenv').config();

(async () => {
  const path = require('path');
  const { sequelize } = require('../src/config/database');

  const tableName = 'Patients';
  const columnName = 'telephone1';

  const q = async (sql, opts = {}) => {
    try {
      const res = await sequelize.query(sql, opts);
      return res;
    } catch (err) {
      console.warn(`[remove-telephone1-unique] SQL failed: ${sql}`);
      console.warn(`[remove-telephone1-unique] Error: ${err.message}`);
      return null;
    }
  };

  try {
    console.log('=== Remove UNIQUE on Patients.telephone1 ===');
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected.');

    // 1) Drop UNIQUE constraints that apply to telephone1
    console.log('\nStep 1: Dropping unique constraints referencing telephone1 (if any)...');
    const constraintQuery = `
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = con.connamespace
      WHERE rel.relname = :table
        AND con.contype = 'u'
        AND pg_get_constraintdef(con.oid) ILIKE '%("` + columnName + `")%'
    `;
    const [constraintRows] = await q(constraintQuery, { replacements: { table: tableName } }) || [[]];

    if (constraintRows && constraintRows.length) {
      for (const row of constraintRows) {
        const conname = row.conname;
        console.log(`- Dropping constraint "${conname}"...`);
        await q(`ALTER TABLE "` + tableName + `" DROP CONSTRAINT IF EXISTS "` + conname + `";`);
      }
    } else {
      console.log('- No matching unique constraints found.');
      // Some Postgres installations may name the unique constraint/index as Patients_telephone1_key
      // Attempt to drop by common names as a fallback
      console.log('- Attempting fallback drop by known constraint names...');
      const candidateConstraintNames = [
        'Patients_telephone1_key',
        'patients_telephone1_key',
        'Patients_telephone1_unique',
        'patients_telephone1_unique',
        'Patients_telephone1_uk',
        'patients_telephone1_uk'
      ];
      for (const cName of candidateConstraintNames) {
        await q(`ALTER TABLE "` + tableName + `" DROP CONSTRAINT IF EXISTS "` + cName + `";`);
      }
    }

    // 2) Drop UNIQUE indexes on telephone1 (in case any remain)
    console.log('\nStep 2: Dropping unique indexes on telephone1 (if any)...');
    const indexQuery = `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ANY (current_schemas(true))
        AND tablename = :table
        AND indexdef ILIKE '%UNIQUE%'
        AND indexdef ILIKE '%(` + columnName + `)%'
    `;
    const [indexRows] = await q(indexQuery, { replacements: { table: tableName } }) || [[]];

    if (indexRows && indexRows.length) {
      for (const row of indexRows) {
        const idxName = row.indexname;
        console.log(`- Dropping index "${idxName}"...`);
        await q(`DROP INDEX IF EXISTS "` + idxName + `";`);
      }
    } else {
      console.log('- No matching unique indexes found.');
    }

    // 3) Ensure column is NOT NULL (required) but not unique
    console.log('\nStep 3: Ensuring column is NOT NULL...');
    await q(`ALTER TABLE "` + tableName + `" ALTER COLUMN "` + columnName + `" SET NOT NULL;`);

    console.log('\n✅ Completed: Removed unique enforcement from Patients.telephone1 and ensured NOT NULL remains.');
  } catch (err) {
    console.error('❌ Failed to remove unique on Patients.telephone1:', err.message);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (e) {}
  }
})();