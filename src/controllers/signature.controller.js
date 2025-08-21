const { User } = require('../models');
const signatureService = require('../services/signature.service');

const signatureController = {
  /**
   * Create/Upload user signature
   * @route POST /api/v1/users/signature
   */
  createSignature: async (req, res, next) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No signature file provided'
        });
      }

      // Validate file
      signatureService.validateSignatureFile(req.file);

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete existing signature if exists
      if (user.signatureFileName) {
        try {
          await signatureService.deleteSignature(user.signatureFileName);
        } catch (error) {
          console.warn('Failed to delete existing signature:', error.message);
        }
      }

      // Upload new signature
      const signatureData = await signatureService.uploadSignature(
        userId,
        req.file.buffer,
        req.file.originalname
      );

      // Update user record
      await user.update({
        signatureUrl: signatureData.url,
        signatureFileName: signatureData.fileName,
        signatureUploadedAt: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Signature uploaded successfully',
        signature: {
          url: signatureData.url,
          uploadedAt: user.signatureUploadedAt
        }
      });
    } catch (error) {
      console.error('Create signature error:', error);
      next(error);
    }
  },

  /**
   * Get user signature
   * @route GET /api/v1/users/signature
   */
  getSignature: async (req, res, next) => {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: ['id', 'signatureUrl', 'signatureUploadedAt']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.signatureUrl) {
        return res.status(404).json({
          success: false,
          message: 'No signature found'
        });
      }

      res.json({
        success: true,
        signature: {
          url: user.signatureUrl,
          uploadedAt: user.signatureUploadedAt
        }
      });
    } catch (error) {
      console.error('Get signature error:', error);
      next(error);
    }
  },

  /**
   * Update user signature
   * @route PUT /api/v1/users/signature
   */
  updateSignature: async (req, res, next) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No signature file provided'
        });
      }

      // Validate file
      signatureService.validateSignatureFile(req.file);

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete existing signature if exists
      if (user.signatureFileName) {
        try {
          await signatureService.deleteSignature(user.signatureFileName);
        } catch (error) {
          console.warn('Failed to delete existing signature:', error.message);
        }
      }

      // Upload new signature
      const signatureData = await signatureService.uploadSignature(
        userId,
        req.file.buffer,
        req.file.originalname
      );

      // Update user record
      await user.update({
        signatureUrl: signatureData.url,
        signatureFileName: signatureData.fileName,
        signatureUploadedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Signature updated successfully',
        signature: {
          url: signatureData.url,
          uploadedAt: user.signatureUploadedAt
        }
      });
    } catch (error) {
      console.error('Update signature error:', error);
      next(error);
    }
  },

  /**
   * Delete user signature (Admin only)
   * @route DELETE /api/v1/users/:userId/signature
   */
  deleteSignature: async (req, res, next) => {
    try {
      const { userId } = req.params;

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.signatureFileName) {
        return res.status(404).json({
          success: false,
          message: 'No signature found'
        });
      }

      // Delete from GCP Storage
      await signatureService.deleteSignature(user.signatureFileName);

      // Update user record
      await user.update({
        signatureUrl: null,
        signatureFileName: null,
        signatureUploadedAt: null
      });

      res.json({
        success: true,
        message: 'Signature deleted successfully'
      });
    } catch (error) {
      console.error('Delete signature error:', error);
      next(error);
    }
  }
};

module.exports = signatureController;