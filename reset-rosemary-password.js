// reset-rosemary-password.js
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdlZWNhNDQ4LWNhOTItNGYxOS1hZTc0LWY1MGZlMTVkY2QzYyIsInJvbGUiOiJBRE1JTiIsInBlcm1pc3Npb25zIjpbImFsbCJdLCJpYXQiOjE3NDczMTg3MTQsImV4cCI6MTc0NzQwNTExNH0.JEHC16bQ178H0fzL10wkoTnaHRP_fg5jVrX6RUZhR_I';

// Function to send password reset link
async function sendPasswordReset() {
  try {
    console.log(`📧 Sending password reset link to: agunkiru726@gmail.com`);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/forgot-password`,
      { email: 'agunkiru726@gmail.com' },
      { headers }
    );
    
    console.log(`✅ Password reset email sent successfully!`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.data) {
      console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    }
    
  } catch (error) {
    console.error(`❌ Error sending password reset:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
}

// Run the function
sendPasswordReset().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});