#!/usr/bin/env node

/**
 * Test script for CCP External API endpoints
 * Tests all external API endpoints with CCP token authentication
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';
const CCP_TOKEN = process.env.CCP_TOKEN;

if (!CCP_TOKEN) {
  console.error('❌ CCP_TOKEN not found in environment variables');
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-ccp-token': CCP_TOKEN,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const tests = [];
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

const addTest = (name, testFn) => {
  tests.push({ name, testFn });
};

const runTest = async (test) => {
  testResults.total++;
  try {
    log(`🧪 Testing: ${test.name}`);
    await test.testFn();
    log(`✅ PASSED: ${test.name}`);
    testResults.passed++;
  } catch (error) {
    log(`❌ FAILED: ${test.name}`, {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    testResults.failed++;
  }
  console.log('---');
};

// Test 1: Get Patients
addTest('GET /api/v1/ccp/api/patients', async () => {
  const response = await api.get('/api/v1/ccp/api/patients?limit=5');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  if (!response.data.data.patients) {
    throw new Error('Response should contain patients array');
  }
  
  if (!response.data.data.pagination) {
    throw new Error('Response should contain pagination info');
  }
  
  log('✓ Patients retrieved successfully', {
    count: response.data.data.patients.length,
    totalRecords: response.data.data.pagination.totalRecords
  });
});

// Test 2: Get Patients with Search
addTest('GET /api/v1/ccp/api/patients with search', async () => {
  const response = await api.get('/api/v1/ccp/api/patients?search=ZH&limit=3');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  log('✓ Patient search working', {
    searchResults: response.data.data.patients.length
  });
});

// Test 3: Get Specific Patient (if any exist)
addTest('GET /api/v1/ccp/api/patients/:id', async () => {
  // First get a patient ID
  const patientsResponse = await api.get('/api/v1/ccp/api/patients?limit=1');
  
  if (patientsResponse.data.data.patients.length === 0) {
    log('⚠️ No patients found, skipping individual patient test');
    return;
  }
  
  const patientId = patientsResponse.data.data.patients[0].id;
  const response = await api.get(`/api/v1/ccp/api/patients/${patientId}`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.data.id) {
    throw new Error('Response should contain patient data');
  }
  
  log('✓ Individual patient retrieved', {
    patientId: response.data.data.id,
    patientNumber: response.data.data.patientNumber
  });
});

// Test 4: Update Patient (if any exist)
addTest('PUT /api/v1/ccp/api/patients/:id', async () => {
  // First get a patient ID
  const patientsResponse = await api.get('/api/v1/ccp/api/patients?limit=1');
  
  if (patientsResponse.data.data.patients.length === 0) {
    log('⚠️ No patients found, skipping patient update test');
    return;
  }
  
  const patientId = patientsResponse.data.data.patients[0].id;
  const updateData = {
    residence: `Test Address Updated ${Date.now()}`
  };
  
  const response = await api.put(`/api/v1/ccp/api/patients/${patientId}`, updateData);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Update should be successful');
  }
  
  log('✓ Patient updated successfully', {
    patientId,
    updatedField: 'residence'
  });
});

// Test 5: Get Follow-ups
addTest('GET /api/v1/ccp/api/followups', async () => {
  const response = await api.get('/api/v1/ccp/api/followups?limit=5');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Follow-ups retrieved successfully', {
    count: response.data.data.followups.length,
    totalRecords: response.data.data.pagination.totalRecords
  });
});

// Test 6: Create Follow-up (if patients exist)
addTest('POST /api/v1/ccp/api/followups', async () => {
  // First get a patient
  const patientsResponse = await api.get('/api/v1/ccp/api/patients?limit=1');
  
  if (patientsResponse.data.data.patients.length === 0) {
    log('⚠️ No patients found, skipping followup creation test');
    return;
  }
  
  const patientId = patientsResponse.data.data.patients[0].id;
  const currentDate = new Date();
  const followupData = {
    patientId,
    followupMonth: currentDate.getMonth() + 2, // Next month
    followupYear: currentDate.getFullYear(),
    followupType: 'ROUTINE',
    followupMode: 'PHONE_CALL'
  };
  
  try {
    const response = await api.post('/api/v1/ccp/api/followups', followupData);
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    log('✓ Follow-up created successfully', {
      followupId: response.data.data.id,
      patientId
    });
  } catch (error) {
    if (error.response?.status === 409) {
      log('⚠️ Follow-up already exists for this month/year, which is expected');
    } else {
      throw error;
    }
  }
});

// Test 7: Get Insurer Summary
addTest('GET /api/v1/ccp/api/summary/insurers', async () => {
  const response = await api.get('/api/v1/ccp/api/summary/insurers');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Insurer summary retrieved', {
    totalPatients: response.data.data.totalPatients,
    insurerCount: response.data.data.insurers.length
  });
});

// Test 8: Get Doctor Summary
addTest('GET /api/v1/ccp/api/summary/doctors', async () => {
  const response = await api.get('/api/v1/ccp/api/summary/doctors');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Doctor summary retrieved', {
    totalFollowups: response.data.data.totalFollowups,
    doctorCount: response.data.data.doctors.length
  });
});

// Test 9: Get Monthly Summary
addTest('GET /api/v1/ccp/api/summary/monthly', async () => {
  const currentYear = new Date().getFullYear();
  const response = await api.get(`/api/v1/ccp/api/summary/monthly?year=${currentYear}`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Monthly summary retrieved', {
    year: response.data.data.year,
    monthsWithData: response.data.data.months.filter(m => m.total > 0).length
  });
});

// Test 10: Invalid Token Test
addTest('Invalid CCP Token Test', async () => {
  const invalidApi = axios.create({
    baseURL: BASE_URL,
    headers: {
      'x-ccp-token': 'invalid-token',
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
  
  try {
    await invalidApi.get('/api/v1/ccp/api/patients');
    throw new Error('Should have failed with invalid token');
  } catch (error) {
    if (error.response?.status === 401) {
      log('✓ Invalid token properly rejected');
    } else {
      throw new Error(`Expected 401, got ${error.response?.status}`);
    }
  }
});

// Run all tests
const runAllTests = async () => {
  log('🚀 Starting CCP External API Tests');
  log(`Base URL: ${BASE_URL}`);
  log(`CCP Token: ${CCP_TOKEN ? 'Set' : 'Not Set'}`);
  console.log('='.repeat(50));
  
  for (const test of tests) {
    await runTest(test);
  }
  
  console.log('='.repeat(50));
  log('📊 Test Results Summary', testResults);
  
  if (testResults.failed > 0) {
    log('❌ Some tests failed. Check the logs above for details.');
    process.exit(1);
  } else {
    log('✅ All tests passed successfully!');
    process.exit(0);
  }
};

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  log('❌ Test runner failed:', error);
  process.exit(1);
});