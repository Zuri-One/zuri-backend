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
      // Validate GCP configuration
      if (!this.bucketName) {
        throw new Error('GCP_BUCKET_NAME environment variable is not set');
      }

      const fileExtension = path.extname(originalName);
      const fileName = `${this.signatureFolder}${userId}-${uuidv4()}${fileExtension}`;
      
      console.log('Uploading signature:', { fileName, bucketName: this.bucketName });
      
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

      console.log('File saved, making public...');
      
      // Generate signed URL (works with uniform bucket-level access)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      const publicUrl = signedUrl;
      
      console.log('Signature uploaded successfully:', publicUrl);
      
      return {
        url: publicUrl,
        fileName: fileName,
        originalName: originalName
      };
    } catch (error) {
      console.error('Detailed signature upload error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });
      throw new Error(`Failed to upload signature: ${error.message}`);
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