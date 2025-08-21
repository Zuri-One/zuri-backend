const { bucket } = require('../config/gcp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class SignatureService {
  constructor() {
    this.bucketName = process.env.GCP_BUCKET_NAME;
    this.signatureFolder = 'signatures/';
  }

  /**
   * Upload signature to GCP Storage
   */
  async uploadSignature(userId, fileBuffer, originalName) {
    try {
      const fileExtension = path.extname(originalName);
      const fileName = `${this.signatureFolder}${userId}-${uuidv4()}${fileExtension}`;
      
      const file = bucket.file(fileName);
      
      await file.save(fileBuffer, {
        metadata: {
          contentType: this.getContentType(fileExtension),
          metadata: {
            userId: userId,
            uploadedAt: new Date().toISOString(),
            originalName: originalName
          }
        }
      });

      // Make file publicly readable
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
      
      return {
        url: publicUrl,
        fileName: fileName,
        originalName: originalName
      };
    } catch (error) {
      console.error('Error uploading signature:', error);
      throw new Error('Failed to upload signature');
    }
  }

  /**
   * Delete signature from GCP Storage
   */
  async deleteSignature(fileName) {
    try {
      const file = bucket.file(fileName);
      await file.delete();
      return true;
    } catch (error) {
      console.error('Error deleting signature:', error);
      throw new Error('Failed to delete signature');
    }
  }

  /**
   * Get content type based on file extension
   */
  getContentType(extension) {
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Validate signature file
   */
  validateSignatureFile(file) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only PNG, JPEG, GIF, and SVG files are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    return true;
  }
}

module.exports = new SignatureService();