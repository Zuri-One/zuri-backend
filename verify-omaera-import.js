#!/usr/bin/env node

/**
 * Verification script for OmaeraMedications import
 * - Confirms rows exist
 * - Checks for duplicates by itemCode
 * - Reports null packSize/taxCode counts
 * - Reports min/max price
 * - Prints sample rows
 * - Exits with non-zero code if basic sanity checks fail
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function run() {
  const result = {
    ok: false,
    checks: {},
    samples: [],
    errors: [],
  };

  try {
    console.log('🔎 Verifying OmaeraMedications import...');

    // 1) Row count
    const countRows = await sequelize.query(
      'SELECT COUNT(*)::int AS count FROM "OmaeraMedications";'
    );
    const total = countRows?.[0]?.[0]?.count ?? 0;
    result.checks.totalRows = total;
    console.log(`  • Total rows: ${total}`);

    // 2) Duplicates by itemCode
    const dupRows = await sequelize.query(
      'SELECT COUNT(*)::int AS total, COUNT(DISTINCT "itemCode")::int AS distinct FROM "OmaeraMedications";'
    );
    const totals = dupRows?.[0]?.[0] ?? { total: 0, distinct: 0 };
    result.checks.distinctItemCodes = totals.distinct;
    result.checks.duplicateItemCodes = Math.max(0, totals.total - totals.distinct);
    console.log(`  • Distinct itemCodes: ${totals.distinct}`);
    console.log(`  • Duplicate itemCodes: ${result.checks.duplicateItemCodes}`);

    // 3) Null counts
    const nullPack = await sequelize.query(
      'SELECT COUNT(*)::int AS cnt FROM "OmaeraMedications" WHERE "packSize" IS NULL;'
    );
    const nullTax = await sequelize.query(
      'SELECT COUNT(*)::int AS cnt FROM "OmaeraMedications" WHERE "taxCode" IS NULL;'
    );
    result.checks.nullPackSize = nullPack?.[0]?.[0]?.cnt ?? 0;
    result.checks.nullTaxCode = nullTax?.[0]?.[0]?.cnt ?? 0;
    console.log(`  • NULL packSize: ${result.checks.nullPackSize}`);
    console.log(`  • NULL taxCode: ${result.checks.nullTaxCode}`);

    // 4) Price ranges
    const priceAgg = await sequelize.query(
      'SELECT MIN("currentPrice") AS min, MAX("currentPrice") AS max FROM "OmaeraMedications";'
    );
    const minPrice = parseFloat(priceAgg?.[0]?.[0]?.min ?? 0);
    const maxPrice = parseFloat(priceAgg?.[0]?.[0]?.max ?? 0);
    result.checks.minPrice = isNaN(minPrice) ? null : minPrice;
    result.checks.maxPrice = isNaN(maxPrice) ? null : maxPrice;
    console.log(`  • Price range: min=${result.checks.minPrice} max=${result.checks.maxPrice}`);

    // 5) Sample rows
    const samples = await sequelize.query(`
      SELECT "itemCode","itemDescription","packSize","taxCode","currentPrice"
      FROM "OmaeraMedications"
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);
    result.samples = samples?.[0] ?? [];
    console.log('  • Sample rows:');
    for (const row of result.samples) {
      console.log(
        `    - ${row.itemCode} | ${row.itemDescription} | ${row.packSize ?? 'NULL'} | ${row.taxCode ?? 'NULL'} | ${row.currentPrice}`
      );
    }

    // 6) Basic sanity rules
    const sanity = {
      hasRows: total > 0,
      noDuplicates: result.checks.duplicateItemCodes === 0,
      hasPositivePrices: result.checks.minPrice !== null && result.checks.minPrice > 0,
    };
    result.checks.sanity = sanity;

    const failures = [];
    if (!sanity.hasRows) failures.push('No rows found in OmaeraMedications');
    if (!sanity.noDuplicates) failures.push('Duplicate itemCodes detected');
    if (!sanity.hasPositivePrices) failures.push('Minimum price is not positive');

    if (failures.length) {
      result.errors.push(...failures);
      console.error('❌ Verification failed:', failures.join('; '));
      result.ok = false;
      // Print JSON payload for machine consumption
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = 2;
      return;
    }

    result.ok = true;
    console.log('✅ Verification passed.');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Verification error:', err.message);
    result.errors.push(err.message);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) {
  run();
}