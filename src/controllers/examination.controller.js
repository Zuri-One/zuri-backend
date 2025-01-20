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
    next(error);
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