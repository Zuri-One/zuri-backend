// src/config/gcp.js
const { Storage } = require('@google-cloud/storage');

// Create GCP credentials object from environment variables
// This is more secure than hardcoding the credentials
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

module.exports = { storage, bucket };