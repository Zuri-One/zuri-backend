'use strict';

/**
 * Migration: Remove UNIQUE constraint/index from Patients.telephone1
 * - Drops any unique indexes/constraints on telephone1
 * - Ensures column definition is non-unique and NOT NULL
 * 
 * Down:
 * - Re-creates a UNIQUE index on telephone1 (named 'patients_telephone1_unique')
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'Patients';

    // 1) Drop any unique indexes on telephone1 discovered via showIndex
    try {
      const indexes = await queryInterface.showIndex(table);
      for (const idx of indexes) {
        const fields = (idx.fields || []).map(f => f.attribute || f.name);
        const isTelephone1Unique = idx.unique && fields.length === 1 && fields[0] === 'telephone1';
        if (isTelephone1Unique) {
          const name = idx.name;
          try {
            // Remove by name for precision
            await queryInterface.removeIndex(table, name);
            console.log(`[migrate] Removed unique index '${name}' on ${table}(telephone1)`);
          } catch (e) {
            console.warn(`[migrate] Failed removeIndex by name '${name}', trying fields signature:`, e.message);
            // Fallback: remove by fields signature
            try {
              await queryInterface.removeIndex(table, ['telephone1']);
              console.log(`[migrate] Removed unique index by fields on ${table}(telephone1)`);
            } catch (e2) {
              console.warn(`[migrate] removeIndex by fields failed:`, e2.message);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[migrate] showIndex failed for ${table}:`, e.message);
    }

    // 2) Attempt to drop common unique constraint names if present (Postgres)
    const candidateConstraintNames = [
      'Patients_telephone1_key',
      'patients_telephone1_key',
      'Patients_telephone1_unique',
      'patients_telephone1_unique',
      'Patients_telephone1_uk',
      'patients_telephone1_uk',
    ];

    for (const cName of candidateConstraintNames) {
      try {
        await queryInterface.removeConstraint(table, cName);
        console.log(`[migrate] Removed constraint '${cName}' on ${table}(telephone1)`);
      } catch (e) {
        // Best-effort only; ignore if doesn't exist
      }
    }

    // 3) Ensure column definition is NOT NULL and without unique at column-level
    // Note: This does not add any unique clause. It simply reasserts the type and allowNull.
    await queryInterface.changeColumn(table, 'telephone1', {
      type: Sequelize.STRING,
      allowNull: false,
      // DO NOT add 'unique' here; we are explicitly removing it.
      comment: 'Required - Primary contact number'
    });

    console.log(`[migrate] Updated ${table}.telephone1 to be NOT NULL and non-unique`);
  },

  async down(queryInterface, Sequelize) {
    const table = 'Patients';

    // Recreate a unique index (name provided for predictability)
    try {
      await queryInterface.addIndex(table, ['telephone1'], {
        unique: true,
        name: 'patients_telephone1_unique'
      });
      console.log(`[migrate] Re-created unique index 'patients_telephone1_unique' on ${table}(telephone1)`);
    } catch (e) {
      console.warn(`[migrate] Failed to re-create unique index on ${table}(telephone1):`, e.message);
    }
  }
};