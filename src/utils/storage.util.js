// src/utils/storage.util.js
const aws = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Local storage as fallback
const LOCAL_STORAGE_PATH = path.join(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
  fs.mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
}

exports.uploadToStorage = async (filePath, destinationPath) => {
  try {
    // If AWS credentials are configured, use S3
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const fileContent = fs.readFileSync(filePath);
      
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: destinationPath,
        Body: fileContent,
        ContentType: getContentType(filePath)
      };

      const result = await s3.upload(params).promise();
      return result.Location;
    } 
    // Otherwise use local storage
    else {
      const destination = path.join(LOCAL_STORAGE_PATH, destinationPath);
      const destinationDir = path.dirname(destination);

      // Create directories if they don't exist
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      // Copy file to destination
      fs.copyFileSync(filePath, destination);
      
      // Return local path
      return `/uploads/${destinationPath}`;
    }
  } catch (error) {
    console.error('Storage upload error:', error);
    throw new Error('Failed to upload file');
  }
};

exports.deleteFromStorage = async (filePath) => {
  try {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: filePath.replace(/^\//, '') // Remove leading slash
      };

      await s3.deleteObject(params).promise();
    } else {
      const fullPath = path.join(LOCAL_STORAGE_PATH, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (error) {
    console.error('Storage deletion error:', error);
    throw new Error('Failed to delete file');
  }
};

exports.getFileStream = async (filePath) => {
  try {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: filePath.replace(/^\//, '')
      };

      return s3.getObject(params).createReadStream();
    } else {
      const fullPath = path.join(LOCAL_STORAGE_PATH, filePath);
      return fs.createReadStream(fullPath);
    }
  } catch (error) {
    console.error('Stream creation error:', error);
    throw new Error('Failed to create file stream');
  }
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv'
  };

  return contentTypes[ext] || 'application/octet-stream';
}

module.exports = exports;