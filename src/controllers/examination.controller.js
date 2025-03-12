// controllers/examination.controller.js
const { Examination, Patient, User } = require('../models');
const { PROCEDURES, BODY_SYSTEMS } = require('../constants/medical');

exports.createExamination = async (req, res, next) => {
  try {
    const {
      patientId,
      triageId,
      generalExamination,
      systemicExaminations,
      proceduresPerformed,
      nursingNotes
    } = req.body;

    console.log('Received examination data:', {
      patientId,
      triageId,
      generalExamination,
      systemicExaminations,
      proceduresPerformed,
      nursingNotes
    });
    
    // Log body composition data if present
    const bodyCompositionFields = [
      'waistHipRatio', 'bodyFat', 'fatFreeBodyWeight', 'subcutaneousFat', 
      'visceralFat', 'bodyWater', 'skeletalMuscle', 'muscleMass', 
      'boneMass', 'protein', 'basicMetabolicRate', 'metabolicAge'
    ];
    
    const bodyCompositionData = {};
    bodyCompositionFields.forEach(field => {
      if (generalExamination[field] !== undefined) {
        bodyCompositionData[field] = generalExamination[field];
      }
    });
    
    if (Object.keys(bodyCompositionData).length > 0) {
      console.log('Body composition data received:', bodyCompositionData);
    }

    // Calculate BMI
    const weight = generalExamination.weight;
    const height = generalExamination.height;
    const bmi = weight / ((height / 100) * (height / 100));
    generalExamination.bmi = parseFloat(bmi.toFixed(2));

    const examination = await Examination.create({
      patientId,
      triageId,
      performedBy: req.user.id,
      generalExamination,
      systemicExaminations,
      proceduresPerformed,
      nursingNotes
    });

    res.status(201).json({
      success: true,
      examination
    });
  } catch (error) {
    console.error('Examination creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};


// Add to controllers/examination.controller.js
exports.updateExamination = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      generalExamination,
      systemicExaminations,
      proceduresPerformed,
      nursingNotes
    } = req.body;

    console.log('Updating examination data:', {
      id,
      generalExamination,
      systemicExaminations,
      proceduresPerformed,
      nursingNotes
    });
    
    // Find the examination first
    const examination = await Examination.findByPk(id);
    
    if (!examination) {
      return res.status(404).json({
        success: false,
        message: 'Examination record not found'
      });
    }
    
    // Verify that the user has permission to update this examination
    // (Either the user created it or has admin/supervisor privileges)
    if (examination.performedBy !== req.user.id && 
        !['ADMIN', 'HEAD_NURSE', 'DOCTOR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this examination'
      });
    }

    // Calculate BMI if weight and height are provided
    if (generalExamination?.weight && generalExamination?.height) {
      const weight = generalExamination.weight;
      const height = generalExamination.height;
      const bmi = weight / ((height / 100) * (height / 100));
      generalExamination.bmi = parseFloat(bmi.toFixed(2));
    }

    // Update the examination
    await examination.update({
      generalExamination: generalExamination || examination.generalExamination,
      systemicExaminations: systemicExaminations || examination.systemicExaminations,
      proceduresPerformed: proceduresPerformed || examination.proceduresPerformed,
      nursingNotes: nursingNotes !== undefined ? nursingNotes : examination.nursingNotes,
      lastUpdatedBy: req.user.id,
      lastUpdatedAt: new Date()
    });

    // Fetch the updated examination with examiner details
    const updatedExamination = await Examination.findByPk(id, {
      include: [
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'surname', 'otherNames', 'role']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Examination updated successfully',
      examination: updatedExamination
    });
  } catch (error) {
    console.error('Examination update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};


exports.getExamination = async (req, res, next) => {
  try {
    const examination = await Examination.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'surname', 'otherNames', 'role']
        }
      ]
    });

    if (!examination) {
      return res.status(404).json({
        success: false,
        message: 'Examination record not found'
      });
    }

    res.json({
      success: true,
      examination
    });
  } catch (error) {
    next(error);
  }
};

exports.getAvailableProcedures = async (req, res) => {
  res.json({
    success: true,
    procedures: PROCEDURES
  });
};

exports.getBodySystems = async (req, res) => {
  res.json({
    success: true,
    bodySystems: BODY_SYSTEMS
  });
};

exports.getPatientExaminations = async (req, res, next) => {
  try {
    const examinations = await Examination.findAll({
      where: {
        patientId: req.params.patientId
      },
      include: [
        {
          model: User,
          as: 'examiner',
          attributes: ['id', 'surname', 'otherNames', 'role']
        }
      ],
      order: [['examinationDateTime', 'DESC']]
    });

    res.json({
      success: true,
      examinations
    });
  } catch (error) {
    next(error);
  }
};