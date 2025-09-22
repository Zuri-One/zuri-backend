#!/usr/bin/env node

/**
 * One-off patch: Update a patient's dateOfBirth by ID.
 *
 * Target:
 *   id = 793f9a3a-91ce-4f83-8568-a925121db717
 *   new DOB = 1985-07-28
 *
 * Usage:
 *   node scripts/patch-patient-dob.js
 */

require('dotenv').config();

(async () => {
  const { sequelize } = require('../src/config/database');
  const { Patient } = require('../src/models');

  const targetId = '793f9a3a-91ce-4f83-8568-a925121db717';
  const newDobISO = '1985-07-28'; // YYYY-MM-DD

  try {
    console.log('=== Patient DOB Patch ===');
    console.log('Connecting...');
    await sequelize.authenticate();
    console.log('Connected.');

    const patient = await Patient.findByPk(targetId);

    if (!patient) {
      console.error(`Patient not found for id: ${targetId}`);
      process.exit(1);
    }

    console.log('Current patient:');
    console.log('- ID:', patient.id);
    console.log('- Name:', `${patient.surname} ${patient.otherNames}`);
    console.log('- Current DOB:', patient.dateOfBirth);

    // Update DOB
    const newDate = new Date(newDobISO);
    if (isNaN(newDate.getTime())) {
      console.error(`Invalid date provided: ${newDobISO}`);
      process.exit(1);
    }

    patient.dateOfBirth = newDate;

    await patient.save(); // triggers model hooks/validation

    console.log('Update complete.');
    console.log('- New DOB:', patient.dateOfBirth);

  } catch (err) {
    console.error('Patch failed:', err.message);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (e) {}
  }
})();