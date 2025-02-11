// controllers/triage.controller.js
const { Triage, User, Department,  ConsultationQueue, Patient } = require('../models');
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


exports.getPatientExaminations = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Fetch examinations with associated examiner details
    const examinations = await sequelize.models.Examination.findAll({
      where: { patientId },
      include: [
        {
          model: sequelize.models.User,
          as: 'examiner',
          attributes: ['id', 'surname', 'otherNames']
        },
        {
          model: sequelize.models.Triage,
          as: 'triage',
          attributes: ['id', 'category', 'priorityScore']
        }
      ],
      order: [['examinationDateTime', 'DESC']], // Most recent first
    });

    // Format the response
    const formattedExaminations = examinations.map(exam => ({
      id: exam.id,
      examinationDateTime: exam.examinationDateTime,
      examiner: {
        id: exam.examiner.id,
        name: `${exam.examiner.surname} ${exam.examiner.otherNames}`
      },
      generalExamination: exam.generalExamination,
      systemicExaminations: exam.systemicExaminations,
      proceduresPerformed: exam.proceduresPerformed,
      nursingNotes: exam.nursingNotes,
      triage: exam.triage ? {
        category: exam.triage.category,
        priorityScore: exam.triage.priorityScore
      } : null
    }));

    res.json({
      success: true,
      data: formattedExaminations
    });
  } catch (error) {
    console.error('Error fetching patient examinations:', error);
    next(error);
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
      where: { 
        status: ['IN_PROGRESS', 'REASSESSED']
      },
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
    const triagesWithWaitTime = await Promise.all(triages.map(async (triage) => {
      const waitingTime = Math.floor(
        (new Date() - new Date(triage.assessmentDateTime)) / (1000 * 60)
      );

      // Check if there's a consultation queue entry for this patient
      const existingQueue = await sequelize.models.ConsultationQueue.findOne({
        where: {
          triageId: triage.id,
          status: {
            [Op.in]: ['WAITING', 'IN_PROGRESS']  // Removed WAITING_FOR_DOCTOR
          }
        }
      });

      // Only include triages that don't have active consultation queue entries
      if (!existingQueue) {
        return {
          ...triage.toJSON(),
          waitingTime
        };
      }
      return null;
    }));
 
    // Filter out null values (patients that are already in consultation queue)
    const filteredTriages = triagesWithWaitTime.filter(t => t !== null);

    res.json({ 
      success: true, 
      triages: filteredTriages 
    });
  } catch (error) {
    console.error('Error in getActiveTriages:', error);
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

exports.getTriageReports = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      category,
      departmentId,
      status 
    } = req.query;

    // Build where clause based on filters
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.assessmentDateTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Remove potential null/undefined filters
    if (category && category !== 'ALL') {
      whereClause.category = category;
    }

    if (departmentId && departmentId !== 'ALL') {
      whereClause.referredToDepartment = departmentId;
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    console.log('Where clause:', JSON.stringify(whereClause, null, 2));

    // First, let's do a basic count to verify data exists
    const count = await Triage.count();
    console.log('Total triage records:', count);

    // Fetch triage data with related information
    const triageData = await Triage.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'PATIENT',
          attributes: ['id', 'surname', 'otherNames', 'sex', 'dateOfBirth'],
          required: false
        },
        {
          model: User,
          as: 'NURSE',
          attributes: ['id', 'surname', 'otherNames', 'role'],
          required: false
        },
        {
          model: Department,
          as: 'referredDepartment',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['assessmentDateTime', 'DESC']]
    });

    console.log('Retrieved triage records:', triageData.length);
    if (triageData.length > 0) {
      console.log('Sample record:', JSON.stringify(triageData[0].toJSON(), null, 2));
    }

    // Generate summary statistics
    const summary = {
      totalTriages: triageData.length,
      categoryBreakdown: {
        RED: triageData.filter(t => t.category === 'RED').length,
        YELLOW: triageData.filter(t => t.category === 'YELLOW').length,
        GREEN: triageData.filter(t => t.category === 'GREEN').length,
        BLACK: triageData.filter(t => t.category === 'BLACK').length
      },
      statusBreakdown: {
        IN_PROGRESS: triageData.filter(t => t.status === 'IN_PROGRESS').length,
        COMPLETED: triageData.filter(t => t.status === 'COMPLETED').length,
        REASSESSED: triageData.filter(t => t.status === 'REASSESSED').length,
        TRANSFERRED: triageData.filter(t => t.status === 'TRANSFERRED').length
      },
      averageWaitingTime: calculateAverageWaitingTime(triageData),
      criticalCases: triageData.filter(t => 
        t.category === 'RED' || 
        (t.vitalSigns && Object.values(t.vitalSigns).some(v => v?.isAbnormal))
      ).length
    };

    // Calculate department-wise distribution
    const departmentDistribution = {};
    triageData.forEach(triage => {
      if (triage.referredDepartment) {
        const deptName = triage.referredDepartment.name;
        departmentDistribution[deptName] = (departmentDistribution[deptName] || 0) + 1;
      }
    });

    // Format detailed records
    const detailedRecords = triageData.map(triage => {
      try {
        return {
          id: triage.id,
          patient: triage.PATIENT ? {
            id: triage.PATIENT.id,
            name: `${triage.PATIENT.surname} ${triage.PATIENT.otherNames}`,
            sex: triage.PATIENT.sex,
            age: calculateAge(triage.PATIENT.dateOfBirth)
          } : null,
          assessmentDateTime: triage.assessmentDateTime,
          nurse: triage.NURSE ? {
            id: triage.NURSE.id,
            name: `${triage.NURSE.surname} ${triage.NURSE.otherNames}`,
            role: triage.NURSE.role
          } : null,
          category: triage.category,
          priorityScore: triage.priorityScore,
          status: triage.status,
          chiefComplaint: triage.chiefComplaint,
          vitalSigns: triage.vitalSigns,
          consciousness: triage.consciousness,
          recommendedAction: triage.recommendedAction,
          department: triage.referredDepartment?.name,
          symptoms: triage.symptoms,
          physicalAssessment: triage.physicalAssessment,
          alerts: triage.alerts,
          reassessmentRequired: triage.reassessmentRequired,
          reassessmentInterval: triage.reassessmentInterval,
          notes: triage.notes
        };
      } catch (error) {
        console.error('Error formatting triage record:', error);
        console.error('Problematic triage record:', triage);
        return null;
      }
    }).filter(record => record !== null);

    res.json({
      success: true,
      summary,
      departmentDistribution,
      detailedRecords
    });

  } catch (error) {
    console.error('Error generating triage reports:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    next(error);
  }
};

// Helper function to calculate average waiting time
const calculateAverageWaitingTime = (triages) => {
  try {
    const waitingTimes = triages
      .filter(t => t.assessmentDateTime)
      .map(t => {
        const waitTime = new Date() - new Date(t.assessmentDateTime);
        return waitTime / (1000 * 60); // Convert to minutes
      });

    if (waitingTimes.length === 0) return 0;
    return Math.round(waitingTimes.reduce((a, b) => a + b, 0) / waitingTimes.length);
  } catch (error) {
    console.error('Error calculating average waiting time:', error);
    return 0;
  }
};

// Helper function to calculate age
const calculateAge = (dateOfBirth) => {
  try {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
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