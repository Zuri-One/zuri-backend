const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';

// Function to send password reset link
const sendPasswordResetLink = async (email) => {
  try {
    console.log(`📧 Sending password reset link to: ${email}`);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/forgot-password`,
      { email },
      { headers }
    );
    
    console.log(`✅ Password reset email sent successfully to ${email}!`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.data) {
      console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Error sending reset link to ${email}: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    throw error;
  }
};

// Main function
const resetUsers = async () => {
  // List of all emails to process
  const emails = [
    "cynthia@zuri.health",
    "danakemuma@gmail.com",
    "barbara@zuri.health",
    "antony@zuri.health",
    "kaninir63@gmail.com",
    "daphinekamau2018@gmail.com"
  ];
  
  console.log(`🔄 Starting password reset process for multiple users...`);
  
  // Track overall status
  let successCount = 0;
  let failureCount = 0;
  
  // Process each email
  for (const email of emails) {
    try {
      await sendPasswordResetLink(email);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Failed to send password reset link to ${email}.`);
      failureCount++;
    }
  }
  
  // Summary report
  console.log("\n📊 Password Reset Summary:");
  console.log(`✅ Successfully sent: ${successCount}`);
  console.log(`❌ Failed to send: ${failureCount}`);
  console.log(`📧 Total processed: ${emails.length}`);
};

// Run the script
resetUsers().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});