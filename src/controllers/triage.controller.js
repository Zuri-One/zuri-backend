// controllers/triage.controller.js
const { Triage, User, Department,  } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.createTriageAssessment = async (req, res, next) => {
  try {
    const { patientId, chiefComplaint, vitalSigns, consciousness } = req.body;

    // Create base triage with calculated fields
    const triage = await Triage.create({
      patientId,
      assessedBy: req.user.id,
      assessmentDateTime: new Date(),
      chiefComplaint,
      vitalSigns,
      consciousness,
      status: 'IN_PROGRESS',
      category: 'GREEN',  // Default
      priorityScore: 0,   // Will be updated
      recommendedAction: 'STANDARD_CARE',
      reassessmentRequired: false,
      alerts: []
    });

    // Calculate scores and update
    const priorityScore = triage.calculatePriorityScore();
    const category = triage.determineCategory();

    await triage.update({
      priorityScore,
      category,
      recommendedAction: determineRecommendedAction(category)
    });

    res.status(201).json({
      success: true,
      triage
    });
  } catch (error) {
    console.error('Triage creation error:', error);
    next(error);
  }
};

const determineRecommendedAction = (category) => {
  switch(category) {
    case 'RED': return 'IMMEDIATE_TREATMENT';
    case 'YELLOW': return 'URGENT_CARE';
    default: return 'STANDARD_CARE';
  }
};

exports.assignPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { departmentId, doctorId } = req.body;

    const triage = await Triage.findByPk(id);
    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage record not found'
      });
    }

    // Get current queue number for department
    const currentQueue = await Triage.count({
      where: {
        assignedDepartmentId: departmentId,
        consultationStatus: {
          [Op.in]: ['WAITING', 'IN_PROGRESS']
        },
        createdAt: {
          [Op.gte]: new Date().setHours(0,0,0,0)
        }
      }
    });

    // Calculate estimated consultation time
    const averageConsultationTime = 15; // minutes
    const estimatedTime = new Date();
    estimatedTime.setMinutes(estimatedTime.getMinutes() + (currentQueue * averageConsultationTime));

    await triage.update({
      assignedDepartmentId: departmentId,
      assignedDoctorId: doctorId,
      queueNumber: currentQueue + 1,
      estimatedConsultationTime: estimatedTime,
      consultationStatus: 'WAITING'
    });

    // Create calendar entry for doctor
    await Appointment.create({
      doctorId,
      patientId: triage.patientId,
      dateTime: estimatedTime,
      type: 'consultation',
      status: 'scheduled',
      triageId: triage.id,
      notes: triage.chiefComplaint
    });

    res.json({
      success: true,
      triage,
      queueNumber: currentQueue + 1,
      estimatedTime: estimatedTime
    });
  } catch (error) {
    next(error);
  }
};

exports.updateConsultationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const triage = await Triage.findByPk(id);
    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage record not found'
      });
    }

    await triage.update({
      consultationStatus: status
    });

    if (status === 'IN_PROGRESS') {
      // Notify waiting patients about delay
      const waitingPatients = await Triage.findAll({
        where: {
          assignedDepartmentId: triage.assignedDepartmentId,
          consultationStatus: 'WAITING',
          queueNumber: {
            [Op.gt]: triage.queueNumber
          }
        }
      });

      // Update their estimated times
      for (const patient of waitingPatients) {
        const newEstimatedTime = new Date(patient.estimatedConsultationTime);
        newEstimatedTime.setMinutes(newEstimatedTime.getMinutes() + 15);
        await patient.update({
          estimatedConsultationTime: newEstimatedTime
        });
      }
    }

    res.json({
      success: true,
      message: `Consultation status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTriageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const triage = await Triage.findByPk(id);
    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage record not found'
      });
    }

    // Ensure notes is a string
    const noteText = typeof notes === 'object' ? JSON.stringify(notes) : String(notes || '');

    await triage.update({
      status,
      notes: noteText
    });

    res.json({
      success: true,
      message: 'Triage status updated successfully',
      triage
    });
  } catch (error) {
    next(error);
  }
};

exports.getActiveTriages = async (req, res, next) => {
  try {
    const triages = await Triage.findAll({
      where: { status: ['IN_PROGRESS', 'REASSESSED'] },
      include: [
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name', 'gender']
        },
        {
          model: User,
          as: 'nurse',
          attributes: ['id', 'name']
        }
      ],
      order: [['category', 'ASC'], ['assessmentDateTime', 'ASC']]
    });

    // Calculate waiting time for each triage
    const triagesWithWaitTime = triages.map(triage => {
      const waitingTime = Math.floor(
        (new Date() - new Date(triage.assessmentDateTime)) / (1000 * 60)
      );
      return {
        ...triage.toJSON(),
        waitingTime
      };
    });
 
    res.json({ 
      success: true, 
      triages: triagesWithWaitTime 
    });
  } catch (error) {
    next(error);
  }
};

exports.getTriageStats = async (req, res, next) => {
  try {
    // Count by category
    const stats = {
      RED: await Triage.count({ where: { category: 'RED' } }), 
      YELLOW: await Triage.count({ where: { category: 'YELLOW' } }),
      GREEN: await Triage.count({ where: { category: 'GREEN' } }),
      BLACK: await Triage.count({ where: { category: 'BLACK' } }),
      vitalAlerts: await Triage.count({
        where: sequelize.literal(`"vitalSigns"->>'isAbnormal' = 'true'`)
      })
    };

    res.json({ success: true, stats });
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


exports.getTriageById = async (req, res, next) => {
  if (req.params.id === 'stats') {
    return this.getTriageStats(req, res, next);
  }
  try {
    const { id } = req.params;

    const triage = await Triage.findByPk(id, {
      include: [
        {
          model: User,
          as: 'PATIENT',
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


exports.getWaitingCount = async (req, res, next) => {
  try {
    const count = await Triage.count({
      where: {
        status: 'IN_PROGRESS',
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

exports.reassessPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vitalSigns } = req.body;

    const triage = await Triage.findByPk(id);
    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage assessment not found'
      });
    }

    // Update vital signs and recalculate
    await triage.updateVitalSigns(vitalSigns);

    res.json({
      success: true,
      message: 'Patient reassessed successfully',
      triage
    });
  } catch (error) {
    next(error);
  }
};
// // Helper functions
// const determineRecommendedAction = (category, vitalSigns, symptoms) => {
//   if (category === 'RED') return 'IMMEDIATE_TREATMENT';
//   if (category === 'YELLOW') return 'URGENT_CARE';
//   return 'STANDARD_CARE';
// };

const createCriticalAlert = async (triage) => {
  // Implementation for critical alert notification
  // This could involve WebSocket notifications, SMS alerts, etc.
};

module.exports = exports;