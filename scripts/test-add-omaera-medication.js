#!/usr/bin/env node

/**
 * scripts/test-add-omaera-medication.js
 * Verifies the new endpoint to add/update OmaeraMedication works for allowed staff roles.
 *
 * Flow:
 *  1) Find an active staff user with an allowed role (PHARMACIST/RECEPTIONIST/DOCTOR/LAB_TECHNICIAN).
 *  2) Generate JWT using user.generateAuthToken().
 *  3) POST /api/v1/patient-billing/medications with a test itemCode (create).
 *  4) POST again with updated price (update).
 *  5) Verify row via direct DB read (models.OmaeraMedication).
 */

require('dotenv').config();
const axios = require('axios').default;
const { Op } = require('sequelize');

(async () => {
  const start = Date.now();
  let sequelize, User, OmaeraMedication;
  try {
    const models = require('../src/models');
    sequelize = models.sequelize;
    User = models.User;
    OmaeraMedication = models.OmaeraMedication;

    if (!sequelize || !User || !OmaeraMedication) {
      throw new Error('Models not initialized (sequelize/User/OmaeraMedication)');
    }

    await sequelize.authenticate();

    // Allowed roles for this endpoint
    const allowed = ['PHARMACIST', 'RECEPTIONIST', 'DOCTOR', 'LAB_TECHNICIAN', 'ADMIN'];

    // Find an active staff user with allowed role
    let user = await User.findOne({
      where: {
        role: { [Op.in]: allowed },
        isActive: true,
        status: 'active'
      },
      order: [['createdAt', 'ASC']]
    });

    // Fallback to any active admin if none found
    if (!user) {
      user = await User.findOne({
        where: { role: 'ADMIN', isActive: true, status: 'active' },
        order: [['createdAt', 'ASC']]
      });
    }

    if (!user) {
      throw new Error('No active staff/admin user found. Seed or create a user first.');
    }

    // Generate a token via model method
    if (typeof user.generateAuthToken !== 'function') {
      throw new Error('User model lacks generateAuthToken method.');
    }
    const token = user.generateAuthToken();

    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/patient-billing/medications`;

    // Use a unique test code to avoid collisions
    const testCode = `ZZRTEST${Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, '0')}`;

    const commonHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    console.log('=== Test: Create medication via endpoint ===');
    const createBody = {
      itemCode: testCode,
      itemDescription: 'Zuri Test Medication Tabs',
      packSize: "30's 30's",
      taxCode: 0.0,
      currentPrice: 123.45,
      originalPrice: 123.45,
      notes: 'created-by-automation',
      isActive: true
    };

    const createRes = await axios.post(url, createBody, { headers: commonHeaders });
    console.log('Create status:', createRes.status, createRes.data?.action);
    if (!createRes.data?.success) {
      throw new Error(`Create failed: ${JSON.stringify(createRes.data)}`);
    }

    console.log('=== Verify create via DB ===');
    const createdRow = await OmaeraMedication.findOne({ where: { itemCode: testCode } });
    if (!createdRow) {
      throw new Error('Row not found after creation');
    }
    console.log(`Created row: ${createdRow.itemCode} | ${createdRow.itemDescription} | KES ${createdRow.currentPrice}`);

    console.log('=== Test: Update medication via same endpoint (upsert) ===');
    const updateBody = {
      itemCode: testCode,
      itemDescription: 'Zuri Test Medication Tabs',
      packSize: "30's 30's",
      taxCode: 0.0,
      currentPrice: 150.00,
      originalPrice: 150.00,
      notes: 'updated-by-automation',
      isActive: true
    };

    const updateRes = await axios.post(url, updateBody, { headers: commonHeaders });
    console.log('Update status:', updateRes.status, updateRes.data?.action);
    if (!updateRes.data?.success) {
      throw new Error(`Update failed: ${JSON.stringify(updateRes.data)}`);
    }

    console.log('=== Verify update via DB ===');
    const updatedRow = await OmaeraMedication.findOne({ where: { itemCode: testCode } });
    if (!updatedRow) {
      throw new Error('Row not found after update');
    }
    console.log(`Updated row: ${updatedRow.itemCode} | ${updatedRow.itemDescription} | KES ${updatedRow.currentPrice}`);

    console.log('\nSUCCESS: Endpoint create/update flow verified.');
    console.log(`Took ${Date.now() - start} ms`);
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err?.response?.data || err?.message || err);
    try { if (sequelize) await sequelize.close(); } catch (_e) {}
    process.exit(1);
  }
})();