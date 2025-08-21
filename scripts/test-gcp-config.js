#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 Testing GCP Configuration...\n');

// Check environment variables
const requiredVars = ['GCP_PROJECT_ID', 'GCP_CLIENT_EMAIL', 'GCP_PRIVATE_KEY', 'GCP_BUCKET_NAME'];
let missingVars = [];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: NOT SET`);
  } else {
    console.log(`✅ ${varName}: SET (${varName === 'GCP_PRIVATE_KEY' ? 'hidden' : process.env[varName]})`);
  }
});

if (missingVars.length > 0) {
  console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.log('\nPlease set these variables in your .env file or environment.');
  process.exit(1);
}

// Test GCP Storage initialization
try {
  const { storage, bucket } = require('../src/config/gcp');
  console.log('\n✅ GCP Storage client initialized successfully');
  
  // Test actual upload functionality (what we really need)
  console.log('🔍 Testing file upload capability...');
  
  const testFileName = 'test-upload.txt';
  const testContent = 'Test upload for signature service';
  
  const file = bucket.file(testFileName);
  
  file.save(testContent)
    .then(() => {
      console.log('✅ Upload successful');
      return file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
    })
    .then(([signedUrl]) => {
      console.log('✅ Signed URL generated');
      console.log('✅ Signature URL:', signedUrl.substring(0, 100) + '...');
      
      // Clean up test file
      return file.delete();
    })
    .then(() => {
      console.log('✅ Cleanup successful');
      console.log('\n🎉 GCP configuration is working correctly for signatures!');
    })
    .catch(error => {
      console.error('❌ Upload test failed:', error.message);
      console.log('\n💡 Need permissions:');
      console.log('- storage.objects.create (upload files)');
      console.log('- storage.objects.get (generate signed URLs)');
      console.log('- storage.objects.delete (cleanup)');
    });
    
} catch (error) {
  console.error('❌ Failed to initialize GCP Storage:', error.message);
  console.log('\n💡 Check your GCP credentials format, especially the private key.');
}