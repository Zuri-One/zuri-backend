// src/config/gcp.js
const { Storage } = require('@google-cloud/storage');

// Validate required environment variables
if (!process.env.GCP_PROJECT_ID) {
  console.error('GCP_PROJECT_ID environment variable is required');
}
if (!process.env.GCP_CLIENT_EMAIL) {
  console.error('GCP_CLIENT_EMAIL environment variable is required');
}
if (!process.env.GCP_PRIVATE_KEY) {
  console.error('GCP_PRIVATE_KEY environment variable is required');
}
if (!process.env.GCP_BUCKET_NAME) {
  console.error('GCP_BUCKET_NAME environment variable is required');
}

let storage, bucket;

try {
  // Create GCP credentials object from environment variables
  storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
      client_email: process.env.GCP_CLIENT_EMAIL,
      private_key: process.env.GCP_PRIVATE_KEY ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    }
  });

  bucket = storage.bucket(process.env.GCP_BUCKET_NAME);
  
  console.log('GCP Storage initialized successfully');
} catch (error) {
  console.error('Failed to initialize GCP Storage:', error.message);
}

module.exports = { storage, bucket };