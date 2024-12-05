// controllers/progress-note.controller.js
const { ProgressNote, MedicalRecord, User } = require('../models');
const { Op } = require('sequelize');

exports.getProgressNotes = async (req, res, next) => {
  try {
    const { medicalRecordId, noteType, startDate, endDate } = req.query;
    const whereClause = {};

    if (medicalRecordId) whereClause.medicalRecordId = medicalRecordId;
    if (noteType) whereClause.noteType = noteType;
    
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp[Op.gte] = new Date(startDate);
      if (endDate) whereClause.timestamp[Op.lte] = new Date(endDate);
    }

    const notes = await ProgressNote.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'role']
        },
        {
          model: MedicalRecord,
          attributes: ['id', 'visitDate', 'visitType']
        }
      ],
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      notes
    });
  } catch (error) {
    next(error);
  }
};

exports.getProgressNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await ProgressNote.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'role']
        },
        {
          model: MedicalRecord,
          attributes: ['id', 'visitDate', 'visitType']
        }
      ]
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Progress note not found'
      });
    }

    res.json({
      success: true,
      note
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProgressNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const note = await ProgressNote.findByPk(id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Progress note not found'
      });
    }

    // Only allow update if author or higher privilege
    if (note.createdBy !== req.user.id && !['ADMIN', 'DOCTOR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this note'
      });
    }

    // Add edit history
    const editHistory = note.metadata.editHistory || [];
    editHistory.push({
      editedBy: req.user.id,
      timestamp: new Date(),
      previousContent: note.content
    });

    await note.update({
      ...updateData,
      metadata: {
        ...note.metadata,
        editHistory
      }
    });

    res.json({
      success: true,
      message: 'Progress note updated successfully',
      note
    });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const note = await ProgressNote.findByPk(id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Progress note not found'
      });
    }

    // Add comment to metadata
    const comments = note.metadata.comments || [];
    comments.push({
      content: comment,
      createdBy: req.user.id,
      timestamp: new Date()
    });

    await note.update({
      metadata: {
        ...note.metadata,
        comments
      }
    });

    res.json({
      success: true,
      message: 'Comment added successfully',
      note
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleConfidential = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isConfidential } = req.body;

    const note = await ProgressNote.findByPk(id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Progress note not found'
      });
    }

    // Only allow toggle if author or higher privilege
    if (note.createdBy !== req.user.id && !['ADMIN', 'DOCTOR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify note confidentiality'
      });
    }

    await note.update({
      isConfidential,
      metadata: {
        ...note.metadata,
        confidentialityUpdatedBy: req.user.id,
        confidentialityUpdatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `Note marked as ${isConfidential ? 'confidential' : 'non-confidential'}`,
      note
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;