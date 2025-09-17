/* scripts/check-medications.js
   Checks if specified medications exist in imported OmaeraMedication data (and Medication as fallback).
   Usage:
     node scripts/check-medications.js
     node scripts/check-medications.js "Olmat 40mg Tabs" "Lndil 10mg Tabs" "Ldnil 20mg Tabs"
*/

require('dotenv').config();
const { Op } = require('sequelize');

(async () => {
  const startTs = Date.now();
  let sequelize, OmaeraMedication, Medication;
  try {
    // Lazy import models (initializes sequelize + models)
    const models = require('../src/models');
    sequelize = models.sequelize;
    OmaeraMedication = models.OmaeraMedication;
    Medication = models.Medication;

    if (!sequelize) {
      throw new Error('Sequelize instance not initialized');
    }
    // Authenticate
    await sequelize.authenticate();

    // Targets: from CLI args or defaults
    const args = process.argv.slice(2).filter(Boolean);
    const targets = args.length
      ? args
      : ['Olmat 40mg Tabs', 'Lndil 10mg Tabs', 'Ldnil 20mg Tabs'];

    // Build query helpers
    const buildWhere = (name) => {
      // Generate simple variations for more lenient matching
      const raw = name.trim();
      const compact = raw.replace(/\s+/g, ' ');
      const noTabs = raw.replace(/\bTabs?\b/gi, '').trim();
      const tokens = Array.from(new Set([raw, compact, noTabs]));

      const ors = [];
      tokens.forEach((t) => {
        ors.push({ itemDescription: { [Op.iLike]: `%${t}%` } });
        ors.push({ itemCode: { [Op.iLike]: `%${t}%` } });
      });

      return { [Op.or]: ors, isActive: true };
    };

    const buildWhereMedication = (name) => {
      const raw = name.trim();
      const compact = raw.replace(/\s+/g, ' ');
      const noTabs = raw.replace(/\bTabs?\b/gi, '').trim();
      const tokens = Array.from(new Set([raw, compact, noTabs]));
      const ors = [];
      tokens.forEach((t) => {
        ors.push({ name: { [Op.iLike]: `%${t}%` } });
        ors.push({ genericName: { [Op.iLike]: `%${t}%` } });
        ors.push({ batchNumber: { [Op.iLike]: `%${t}%` } });
      });
      return { [Op.or]: ors };
    };

    const results = [];

    for (const target of targets) {
      const entry = { query: target, omaera: [], medication: [], found: false };

      // Query OmaeraMedication (primary source of imported list)
      if (OmaeraMedication) {
        const omaeraMatches = await OmaeraMedication.findAll({
          where: buildWhere(target),
          attributes: [
            'id',
            'itemCode',
            'itemDescription',
            'packSize',
            'taxCode',
            'currentPrice',
            'originalPrice',
            'isActive',
          ],
          limit: 25,
          order: [['itemDescription', 'ASC']],
        });

        entry.omaera = omaeraMatches.map((m) => ({
          id: m.id,
          itemCode: m.itemCode,
          itemDescription: m.itemDescription,
          packSize: m.packSize,
          taxCode: m.taxCode,
          currentPrice: m.currentPrice,
          originalPrice: m.originalPrice,
          isActive: m.isActive,
        }));
      }

      // Query Medication fallback (if used anywhere)
      if (Medication) {
        const medMatches = await Medication.findAll({
          where: buildWhereMedication(target),
          attributes: [
            'id',
            'name',
            'genericName',
            'strength',
            'type',
            'unitPrice',
            'batchNumber',
            'storageLocation',
          ],
          limit: 25,
          order: [['name', 'ASC']],
        });

        entry.medication = medMatches.map((m) => ({
          id: m.id,
          name: m.name,
          genericName: m.genericName,
          strength: m.strength,
          type: m.type,
          unitPrice: m.unitPrice,
          batchNumber: m.batchNumber,
          storageLocation: m.storageLocation,
        }));
      }

      entry.found = (entry.omaera && entry.omaera.length > 0) || (entry.medication && entry.medication.length > 0);
      results.push(entry);
    }

    // Print a concise human-readable summary
    console.log('=== Medication Presence Check (Omaera/Medication) ===');
    results.forEach((r) => {
      const hitOmaera = r.omaera.length;
      const hitMed = r.medication.length;
      const mark = r.found ? 'FOUND' : 'NOT FOUND';
      console.log(`- "${r.query}": ${mark}  |  Omaera: ${hitOmaera}  |  Medication: ${hitMed}`);
      if (hitOmaera) {
        r.omaera.slice(0, 5).forEach((o, idx) => {
          console.log(
            `   [O${idx + 1}] ${o.itemCode || '-'} | ${o.itemDescription} | pack: ${o.packSize || '-'} | KES ${o.currentPrice || '-'}`
          );
        });
      }
      if (hitMed) {
        r.medication.slice(0, 5).forEach((m, idx) => {
          console.log(
            `   [M${idx + 1}] ${m.name} (${m.genericName || '-'}) | ${m.strength || '-'} | KES ${m.unitPrice || '-'}`
          );
        });
      }
    });

    // Also output structured JSON (e.g., for tooling/CI)
    console.log('\nJSON_RESULT_START');
    console.log(JSON.stringify({ ok: true, results, tookMs: Date.now() - startTs }, null, 2));
    console.log('JSON_RESULT_END');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error while checking medications:', err?.message || err);
    try {
      if (sequelize) await sequelize.close();
    } catch (e) {}
    process.exit(1);
  }
})();