#!/usr/bin/env node

/**
 * Test script for CCP Internal API endpoints
 * Tests all internal API endpoints with JWT authentication
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
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

let jwtToken = null;
let testPatientId = null;

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

// Login to get JWT token
const login = async () => {
  try {
    log('🔐 Logging in to get JWT token...');
    const response = await api.post('/api/v1/auth/login', {
      email: 'admin@zurihealth.com',
      password: 'Admin@123'
    });
    
    if (response.data.success && response.data.token) {
      jwtToken = response.data.token;
      api.defaults.headers.Authorization = `Bearer ${jwtToken}`;
      log('✅ Login successful');
      return true;
    } else {
      throw new Error('Login failed - no token received');
    }
  } catch (error) {
    log('❌ Login failed', {
      error: error.message,
      response: error.response?.data
    });
    return false;
  }
};

// Test 1: Get CCP Patients List
addTest('GET /api/v1/ccp/patients', async () => {
  const response = await api.get('/api/v1/ccp/patients?limit=5');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  if (response.data.patients && response.data.patients.length > 0) {
    testPatientId = response.data.patients[0].id;
  }
  
  log('✓ CCP patients list retrieved', {
    count: response.data.patients?.length || 0,
    total: response.data.total
  });
});

// Test 2: Get Patient Profile
addTest('GET /api/v1/ccp/patient/:id/profile', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping profile test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/profile`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  const profile = response.data.profile;
  log('✓ Patient profile retrieved', {
    patientId: testPatientId,
    personalInfo: {
      fullName: profile.personalInfo?.fullName,
      age: profile.personalInfo?.age,
      patientNumber: profile.personalInfo?.patientNumber,
      contact: profile.personalInfo?.contact?.telephone1
    },
    ccpProgram: {
      enrollmentDate: profile.ccpProgram?.enrollmentDate,
      enrollmentDuration: profile.ccpProgram?.enrollmentDuration,
      status: profile.ccpProgram?.status
    },
    recordCounts: {
      medicalRecords: profile.medicalHistory?.totalRecords || 0,
      examinations: profile.examinations?.totalExaminations || 0,
      labTests: profile.laboratory?.totalTests || 0,
      prescriptions: profile.medications?.prescriptions?.length || 0
    }
  });
});

// Test 3: Get Medical History
addTest('GET /api/v1/ccp/patient/:id/medical-history', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping medical history test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/medical-history?limit=5`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  const sampleRecord = response.data.data.records[0];
  log('✓ Medical history retrieved', {
    recordsCount: response.data.data.records.length,
    totalRecords: response.data.data.pagination.totalRecords,
    sampleRecord: sampleRecord ? {
      date: sampleRecord.date,
      doctor: sampleRecord.doctor,
      diagnosis: sampleRecord.diagnosis,
      complaints: sampleRecord.complaints?.substring(0, 50) + '...'
    } : null
  });
});

// Test 4: Get Vital Trends
addTest('GET /api/v1/ccp/patient/:id/vital-trends', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping vital trends test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/vital-trends`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Vital trends retrieved', {
    totalExaminations: response.data.data.totalExaminations,
    hasTrends: !!response.data.data.trends
  });
});

// Test 5: Get Lab History
addTest('GET /api/v1/ccp/patient/:id/lab-history', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping lab history test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/lab-history?limit=5`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Lab history retrieved', {
    testsCount: response.data.data.tests.length,
    totalRecords: response.data.data.pagination.totalRecords
  });
});

// Test 6: Get Current Medications
addTest('GET /api/v1/ccp/patient/:id/medications', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping medications test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/medications`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Current medications retrieved', {
    activePrescriptions: response.data.data.activePrescriptions.length,
    recentDispenses: response.data.data.recentDispenses.length
  });
});

// Test 7: Get Billing History
addTest('GET /api/v1/ccp/patient/:id/billing', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping billing test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/billing?limit=5`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Billing history retrieved', {
    recordsCount: response.data.data.records.length,
    hasCostAnalysis: !!response.data.data.costAnalysis
  });
});

// Test 8: Get Follow-up Schedule
addTest('GET /api/v1/ccp/patient/:id/follow-up', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping follow-up schedule test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/follow-up`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Follow-up schedule retrieved', {
    upcoming: response.data.data.upcoming.length,
    completed: response.data.data.completed.length,
    overdue: response.data.data.overdue.length
  });
});

// Test 9: Generate Patient Report
addTest('GET /api/v1/ccp/patient/:id/report', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping report test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/report?includeVitals=true&includeLabs=true`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Patient report generated', {
    hasPatientInfo: !!response.data.report.patient,
    hasReportPeriod: !!response.data.report.reportPeriod,
    hasVitals: !!response.data.report.vitals,
    hasLabTests: !!response.data.report.labTests
  });
});

// Test 10: Get Patient Follow-ups
addTest('GET /api/v1/ccp/patient/:id/followups', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping patient followups test');
    return;
  }
  
  const response = await api.get(`/api/v1/ccp/patient/${testPatientId}/followups?limit=5`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Patient follow-ups retrieved', {
    followupsCount: response.data.followups.length,
    total: response.data.total
  });
});

// Test 11: Get Follow-up Dashboard
addTest('GET /api/v1/ccp/followups/dashboard', async () => {
  const response = await api.get('/api/v1/ccp/followups/dashboard');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Follow-up dashboard retrieved', {
    totalFollowups: response.data.dashboard.summary.totalFollowups,
    completionRate: response.data.dashboard.summary.completionRate,
    overdueCount: response.data.dashboard.summary.overdueCount
  });
});

// Test 12: Get Overdue Follow-ups
addTest('GET /api/v1/ccp/followups/overdue', async () => {
  const response = await api.get('/api/v1/ccp/followups/overdue?limit=5');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ Overdue follow-ups retrieved', {
    overdueCount: response.data.overdueFollowups.length,
    total: response.data.total
  });
});

// Test 13: Get CCP Analytics
addTest('GET /api/v1/ccp/analytics', async () => {
  const response = await api.get('/api/v1/ccp/analytics');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
  
  log('✓ CCP analytics retrieved', {
    overview: response.data.analytics.overview,
    period: response.data.analytics.period
  });
});

// Test 14: Create Follow-up
addTest('POST /api/v1/ccp/patient/:id/followups', async () => {
  if (!testPatientId) {
    log('⚠️ No test patient ID available, skipping followup creation test');
    return;
  }
  
  const followupData = {
    followupFrequency: '1_MONTH',
    followupType: 'ROUTINE',
    followupMode: 'PHONE_CALL',
    priority: 'NORMAL',
    followupFeedback: 'Test followup created by automated test'
  };
  
  try {
    const response = await api.post(`/api/v1/ccp/patient/${testPatientId}/followups`, followupData);
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    log('✓ Follow-up created successfully', {
      followupId: response.data.followup.id,
      patientId: testPatientId,
      followupData: {
        frequency: response.data.followup.followupFrequency,
        type: response.data.followup.followupType,
        mode: response.data.followup.followupMode,
        status: response.data.followup.status,
        month: response.data.followup.followupMonth,
        year: response.data.followup.followupYear
      }
    });
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      log('⚠️ Follow-up already exists for this month/year, which is expected');
    } else {
      throw error;
    }
  }
});

// Test 15: Update Follow-up
addTest('PUT /api/v1/ccp/followups/:id', async () => {
  // Get a followup to update
  const followupsResponse = await api.get('/api/v1/ccp/followups/overdue?limit=1');
  
  if (followupsResponse.data.overdueFollowups.length === 0) {
    log('⚠️ No overdue followups found, skipping followup update test');
    return;
  }
  
  const followupId = followupsResponse.data.overdueFollowups[0].id;
  const updateData = {
    followupFeedback: `Updated by test at ${new Date().toISOString()}`,
    status: 'IN_PROGRESS'
  };
  
  const response = await api.put(`/api/v1/ccp/followups/${followupId}`, updateData);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  log('✓ Follow-up updated successfully', {
    followupId,
    updatedStatus: response.data.followup.status,
    updatedFeedback: response.data.followup.followupFeedback?.substring(0, 50) + '...'
  });
});

// Test 16: Complete Follow-up
addTest('POST /api/v1/ccp/followups/:id/complete', async () => {
  // Get an incomplete followup
  const followupsResponse = await api.get('/api/v1/ccp/followups/overdue?limit=1');
  
  if (followupsResponse.data.overdueFollowups.length === 0) {
    log('⚠️ No incomplete followups found, skipping completion test');
    return;
  }
  
  const followupId = followupsResponse.data.overdueFollowups[0].id;
  const completionData = {
    followupFeedback: 'Completed by automated test',
    consultationFeedback: 'Patient doing well',
    medicationCompliance: 'GOOD',
    duration: 15
  };
  
  try {
    const response = await api.post(`/api/v1/ccp/followups/${followupId}/complete`, completionData);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    log('✓ Follow-up completed successfully', {
      followupId,
      isCompleted: response.data.followup.isFollowupCompleted,
      completedDate: response.data.followup.actualFollowupDate,
      duration: response.data.followup.duration
    });
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already completed')) {
      log('⚠️ Follow-up already completed, which is expected');
    } else {
      throw error;
    }
  }
});

// Run all tests
const runAllTests = async () => {
  log('🚀 Starting CCP Internal API Tests');
  log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(50));
  
  // First login
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('❌ Cannot proceed without authentication');
    process.exit(1);
  }
  
  console.log('---');
  
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