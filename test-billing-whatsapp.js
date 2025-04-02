// test-billing-whatsapp.js
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:10000/api/v1'; // Your server's API base URL
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFiODIwZjNhLTJiMjYtNDc2NC04NjljLTM4Mjg4NjYyMDdkZSIsInJvbGUiOiJSRUNFUFRJT05JU1QiLCJwZXJtaXNzaW9ucyI6WyJzY2hlZHVsZV9hcHBvaW50bWVudHMiLCJyZWdpc3Rlcl9wYXRpZW50cyIsIm1hbmFnZV92aXNpdG9yX2xvZ3MiXSwiaWF0IjoxNzQzNTc3MDE2LCJleHAiOjE3NDM2NjM0MTZ9.YAcfUyiTlFYI_USBqh5JzpwmYGYf2JUNAVrFPwROvkg'; 

// Test patient data - use your valid patient ID
const testPatientId = '9de9872e-af2a-4bb8-a6d9-25bf17c82e2d';
const testPhoneNumber = '0757913538'; // Your phone number

/**
 * Test the finalizePayment endpoint with WhatsApp receipt
 */
async function testFinalizePayment() {
  console.log('Testing finalizePayment with WhatsApp receipt...');
  
  try {
    // Check if there's an active billing record for the patient
    const billingStatus = await checkActiveBilling(testPatientId);
    
    if (!billingStatus.exists) {
      console.log('Creating test billing record...');
      await createTestBilling(testPatientId);
      
      // Check again after creating
      const updatedStatus = await checkActiveBilling(testPatientId);
      if (!updatedStatus.exists) {
        throw new Error('Failed to create a billing record');
      }
    }
    
    // Now finalize the payment with WhatsApp receipt option
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/billing/patient/${testPatientId}/finalize`, // Corrected path
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        paymentMethod: 'CASH',
        paymentReference: `TEST-${Date.now()}`,
        sendReceipt: true // Enable WhatsApp receipt sending
      }
    });
    
    console.log('Payment finalized successfully:');
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data?.data?.receiptUrl) {
      console.log('Receipt URL:', response.data.data.receiptUrl);
      console.log('Check your WhatsApp at +' + testPhoneNumber + ' for the receipt!');
    } else {
      console.log('Receipt URL not found in response. Check server logs.');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error finalizing payment:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

/**
 * Check if there's an active billing for the patient
 */
async function checkActiveBilling(patientId) {
  try {
    const response = await axios({
      method: 'get',
      url: `${API_BASE_URL}/billing/patient/${patientId}/current`, // Corrected path
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    const billExists = !!(response.data?.data?.currentBill && 
                         response.data.data.currentBill.id &&
                         response.data.data.currentBill.items && 
                         response.data.data.currentBill.items.length > 0);
    
    console.log('Active billing check:', billExists ? 'Found' : 'Not found');
    if (billExists) {
      console.log('Current bill amount:', response.data.data.currentBill.totalAmount);
      console.log('Items count:', response.data.data.currentBill.items.length);
    }
    
    return {
      exists: billExists,
      data: response.data?.data?.currentBill
    };
  } catch (error) {
    console.error('Error checking active billing:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return { exists: false };
  }
}

/**
 * Create a test billing record for the patient
 */
async function createTestBilling(patientId) {
  try {
    // Get valid departments first
    const departmentsResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/departments`,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    if (!departmentsResponse.data?.data || departmentsResponse.data.data.length === 0) {
      throw new Error('No departments found in the system');
    }
    
    // Use the first department
    const departmentId = departmentsResponse.data.data[0].id;
    console.log(`Using department: ${departmentId}`);
    
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/billing/add-items`, // Corrected path
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        patientId,
        departmentId,
        type: 'TRIAGE',
        notes: 'Test billing for WhatsApp receipt',
        items: [
          {
            id: 'BASIC_NURSING',
            type: 'PACKAGE',
            quantity: 1
          },
          {
            id: 'CANNULA',
            type: 'ITEM',
            quantity: 2
          }
        ]
      }
    });
    
    console.log('Test billing created successfully:');
    console.log('Status:', response.status);
    console.log('Bill ID:', response.data?.data?.id);
    console.log('Total Amount:', response.data?.data?.totalAmount);
    
    return response.data;
  } catch (error) {
    console.error('Error creating test billing:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

/**
 * Test the receipt endpoint directly
 */
async function testGetReceipt() {
  console.log('Testing getReceipt endpoint with WhatsApp sending...');
  
  try {
    // First check if the patient has any previous paid billings
    const paidBillings = await getPaidBillings(testPatientId);
    
    if (!paidBillings || paidBillings.length === 0) {
      console.log('No paid billings found. Please run the finalizePayment test first.');
      return;
    }
    
    // Use the first paid billing ID
    const billingId = paidBillings[0].id;
    console.log(`Using billing ID: ${billingId} for receipt test`);
    
    // Call the getReceipt endpoint with WhatsApp option
    const response = await axios({
      method: 'get',
      url: `${API_BASE_URL}/billing/receipt/${billingId}`, // This matches your route
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      },
      params: {
        regenerate: true,
        sendWhatsApp: true
      }
    });
    
    console.log('Receipt generated successfully:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data?.data?.receiptUrl) {
      console.log('Receipt URL:', response.data.data.receiptUrl);
      console.log('Check your WhatsApp at +' + testPhoneNumber + ' for the receipt!');
    } else {
      console.log('Receipt URL not found in response. Check server logs.');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting receipt:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

/**
 * Get paid billings for the patient
 */
async function getPaidBillings(patientId) {
  try {
    const response = await axios({
      method: 'get',
      url: `${API_BASE_URL}/billing/history`,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      },
      params: {
        patientId,
        status: 'ACTIVE',
        paymentStatus: 'PAID'
      }
    });
    
    if (response.data?.data) {
      console.log(`Found ${response.data.data.length} paid billings.`);
      return response.data.data;
    }
    
    console.log('No paid billings found or unexpected response format.');
    return [];
  } catch (error) {
    console.error('Error fetching paid billings:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return [];
  }
}

// Run the tests
async function runTests() {
  console.log('=== TESTING BILLING WHATSAPP RECEIPT FUNCTIONALITY ===');
  
  try {
    // Test 1: Finalize payment with WhatsApp receipt
    console.log('\n=== TEST 1: Finalize Payment with WhatsApp Receipt ===');
    await testFinalizePayment();
    
    // Test 2: Get receipt with WhatsApp sending
    console.log('\n=== TEST 2: Get Receipt with WhatsApp Sending ===');
    await testGetReceipt();
    
    console.log('\n=== ALL TESTS COMPLETED ===');
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
  }
}

// Run the tests
runTests();