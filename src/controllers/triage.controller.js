// controllers/triage.controller.js
const { Triage, User, Department } = require('../models');
const { Op } = require('sequelize');

exports.createTriageAssessment = async (req, res, next) => {
  try {
    const {
      patientId,
      chiefComplaint,
      vitalSigns,
      consciousness,
      symptoms,
      medicalHistory,
      physicalAssessment
    } = req.body;

    const triage = await Triage.create({
      patientId,
      assessedBy: req.user.id,
      chiefComplaint,
      vitalSigns,
      consciousness,
      symptoms,
      medicalHistory,
      physicalAssessment
    });

    // Calculate initial priority score and category
    const priorityScore = triage.calculatePriorityScore();
    const category = triage.determineCategory();

    // Update triage with calculated values
    await triage.update({
      priorityScore,
      category,
      recommendedAction: determineRecommendedAction(category, vitalSigns, symptoms)
    });

    // If critical, create immediate alert
    if (category === 'RED') {
      await createCriticalAlert(triage);
    }

    res.status(201).json({
      success: true,
      triage: await Triage.findByPk(triage.id, {
        include: [
          {
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'dateOfBirth', 'gender']
          },
          {
            model: User,
            as: 'nurse',
            attributes: ['id', 'name']
          }
        ]
      })
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTriageAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const triage = await Triage.findByPk(id);
    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage assessment not found'
      });
    }

    // Update vital signs and recalculate priority
    if (updateData.vitalSigns) {
      await triage.updateVitalSigns(updateData.vitalSigns);
    }

    // Update other fields
    const updatedTriage = await triage.update(updateData);

    res.json({
      success: true,
      triage: updatedTriage
    });
  } catch (error) {
    next(error);
  }
};

exports.getActiveTriages = async (req, res, next) => {
  try {
    const triages = await Triage.findAll({
      where: {
        status: {
          [Op.in]: ['IN_PROGRESS', 'REASSESSED']
        }
      },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'dateOfBirth', 'gender']
        },
        {
          model: User,
          as: 'nurse',
          attributes: ['id', 'name']
        }
      ],
      order: [
        [sequelize.literal(`CASE 
          WHEN category = 'RED' THEN 1 
          WHEN category = 'YELLOW' THEN 2 
          WHEN category = 'GREEN' THEN 3 
          ELSE 4 END`), 'ASC'],
        ['assessmentDateTime', 'ASC']
      ]
    });

    res.json({
      success: true,
      triages
    });
  } catch (error) {
    next(error);
  }
};

exports.getTriageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const triage = await Triage.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'dateOfBirth', 'gender']
        },
        {
          model: User,
          as: 'nurse',
          attributes: ['id', 'name']
        },
        {
          model: Department,
          as: 'referredDepartment',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage assessment not found'
      });
    }

    res.json({
      success: true,
      triage
    });
  } catch (error) {
    next(error);
  }
};

exports.reassessPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vitalSigns, notes } = req.body;

    const triage = await Triage.findByPk(id);
    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage assessment not found'
      });
    }

    // Update vital signs and recalculate
    await triage.updateVitalSigns(vitalSigns);

    // Add reassessment note
    await triage.createTriageNote({
      type: 'REASSESSMENT',
      notes,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Patient reassessed successfully',
      triage
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const determineRecommendedAction = (category, vitalSigns, symptoms) => {
  if (category === 'RED') return 'IMMEDIATE_TREATMENT';
  if (category === 'YELLOW') return 'URGENT_CARE';
  return 'STANDARD_CARE';
};

const createCriticalAlert = async (triage) => {
  // Implementation for critical alert notification
  // This could involve WebSocket notifications, SMS alerts, etc.
};

module.exports = exports;