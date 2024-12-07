// src/controllers/medical-document.controller.js
const { MedicalDocument, User } = require('../models');


exports.uploadDocument = async (req, res, next) => {
  try {
    console.log('Upload request body:', req.body); // Debug log

    const { 
      fileUrl, 
      category, 
      description, 
      fileName,
      contentType,
      fileSize,
      fileKey 
    } = req.body;
    
    const patientId = req.body.patientId || req.user.id;

    // Validate required fields
    if (!fileUrl) {
      return res.status(400).json({ message: 'File URL is required' });
    }

    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    // Check permissions
    if (req.user.role === 'PATIENT' && patientId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Determine document type from file extension if contentType is not provided
    let documentType = 'unknown';
    if (contentType) {
      documentType = contentType.split('/')[1] || 'unknown';
    } else if (fileName) {
      const extension = fileName.split('.').pop();
      documentType = extension || 'unknown';
    }

    const document = await MedicalDocument.create({
      patientId,
      uploadedById: req.user.id,
      category,
      description: description || '',
      fileName: fileName || 'unnamed-file',
      fileUrl,
      fileKey: fileKey || fileUrl, // Use fileUrl as fileKey if not provided
      fileSize: fileSize || 0,
      contentType: contentType || 'application/octet-stream',
      documentType,
      metadata: {
        uploadedBy: req.user.role,
        uploadTimestamp: new Date().toISOString()
      }
    });

    // Fetch associations
    const documentWithAssociations = await MedicalDocument.findByPk(document.id, {
      include: [
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      document: documentWithAssociations
    });
  } catch (error) {
    console.error('Document upload error details:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const { patientId, category, isArchived } = req.query;
    const whereClause = {};

    if (req.user.role === 'PATIENT') {
      whereClause.patientId = req.user.id;
    } else if (patientId) {
      whereClause.patientId = patientId;
    }

    if (category) {
      whereClause.category = category;
    }

    if (typeof isArchived === 'boolean') {
      whereClause.isArchived = isArchived;
    }

    const documents = await MedicalDocument.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      documents
    });
  } catch (error) {
    next(error);
  }
};

exports.getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await MedicalDocument.findByPk(id, {
      include: [
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check permissions
    if (req.user.role === 'PATIENT' && document.patientId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      description, 
      category,
      isArchived,
      tags
    } = req.body;

    const document = await MedicalDocument.findByPk(id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check permissions
    if (req.user.role === 'PATIENT' && document.patientId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Only allow updating specific fields
    const updateData = {
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(isArchived !== undefined && { isArchived }),
      ...(tags !== undefined && { tags }),
      metadata: {
        ...document.metadata,
        lastUpdatedBy: req.user.role,
        lastUpdateTimestamp: new Date().toISOString()
      }
    };

    await document.update(updateData);

    // Fetch updated document with associations
    const updatedDocument = await MedicalDocument.findByPk(id, {
      include: [
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    res.json({
      success: true,
      document: updatedDocument
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await MedicalDocument.findByPk(id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check permissions
    if (req.user.role === 'PATIENT' && document.patientId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Optional: Add additional authorization checks
    if (req.user.role !== 'admin' && document.uploadedById !== req.user.id) {
      return res.status(403).json({ 
        message: 'Only document uploader or admin can delete documents' 
      });
    }

    // Optional: Instead of hard delete, you might want to soft delete
    if (document.isArchived) {
      // If document is already archived, perform hard delete
      await document.destroy();
    } else {
      // First archive the document
      await document.update({ 
        isArchived: true,
        metadata: {
          ...document.metadata,
          archivedBy: req.user.role,
          archiveTimestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: document.isArchived ? 'Document archived successfully' : 'Document deleted permanently'
    });
  } catch (error) {
    next(error);
  }
};

// Additional utility method to handle bulk operations
exports.bulkUpdateDocuments = async (req, res, next) => {
  try {
    const { documentIds, operation, data } = req.body;
    
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: 'Document IDs array is required' });
    }

    // Fetch all documents
    const documents = await MedicalDocument.findAll({
      where: {
        id: documentIds
      }
    });

    // Check permissions
    if (req.user.role === 'PATIENT') {
      const unauthorized = documents.some(doc => doc.patientId !== req.user.id);
      if (unauthorized) {
        return res.status(403).json({ message: 'Unauthorized access to one or more documents' });
      }
    }

    switch (operation) {
      case 'archive':
        await MedicalDocument.update(
          { 
            isArchived: true,
            metadata: {
              archivedBy: req.user.role,
              archiveTimestamp: new Date().toISOString()
            }
          },
          { where: { id: documentIds } }
        );
        break;

      case 'updateCategory':
        if (!data.category) {
          return res.status(400).json({ message: 'Category is required for bulk update' });
        }
        await MedicalDocument.update(
          { category: data.category },
          { where: { id: documentIds } }
        );
        break;

      case 'addTags':
        if (!data.tags || !Array.isArray(data.tags)) {
          return res.status(400).json({ message: 'Tags array is required' });
        }
        for (const doc of documents) {
          const currentTags = doc.tags || [];
          const newTags = [...new Set([...currentTags, ...data.tags])];
          await doc.update({ tags: newTags });
        }
        break;

      default:
        return res.status(400).json({ message: 'Invalid bulk operation' });
    }

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`
    });
  } catch (error) {
    next(error);
  }
};