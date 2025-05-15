// reset-dana.js
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
    console.error(`❌ Error sending reset link: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    throw error;
  }
};

// Main function
const resetDana = async () => {
  const danaEmail = "danakemuma@gmail.com";
  
  console.log(`🔄 Starting password reset process for Dana Kemuma Nyangaresi...`);
  
  try {
    await sendPasswordResetLink(danaEmail);
    console.log("\n✅ Password reset link sent successfully to Dana!");
  } catch (error) {
    console.error(`\n❌ Failed to send password reset link to Dana.`);
  }
};

// Run the script
resetDana().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});