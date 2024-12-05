// src/controllers/medical-record.controller.js
const { MedicalRecord, User } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const sendEmail = require('../utils/email.util');

exports.createMedicalRecord = async (req, res, next) => {
  try {
    const {
      patientId,
      visitType,
      chiefComplaint,
      presentIllness,
      vitalSigns,
      physicalExamination,
      diagnoses,
      treatmentPlan,
      followUpPlan,
      confidentialityLevel
    } = req.body;

    // Validate patient exists
    const patient = await User.findOne({
      where: { id: patientId, role: 'PATIENT' }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Calculate BMI if height and weight provided
    if (vitalSigns?.height && vitalSigns?.weight) {
      vitalSigns.bmi = calculateBMI(vitalSigns.height, vitalSigns.weight);
    }

    const record = await MedicalRecord.create({
      patientId,
      practitionerId: req.user.id,
      departmentId: req.user.departmentId,
      visitType,
      visitDate: new Date(),
      chiefComplaint,
      presentIllness,
      vitalSigns,
      physicalExamination,
      diagnoses,
      treatmentPlan,
      followUpPlan,
      confidentialityLevel,
      status: 'DRAFT'
    });

    // Log the creation access
    await record.logAccess(req.user.id, 'CREATED');

    // Fetch the complete record with associations
    const completeRecord = await MedicalRecord.findByPk(record.id, {
      include: getDefaultIncludes()
    });

    res.status(201).json({
      success: true,
      record: completeRecord
    });
  } catch (error) {
    next(error);
  }
};




exports.updateMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const record = await MedicalRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check if record is finalized
    if (record.status === 'FINALIZED') {
      // Create amendment instead of direct update
      await record.addAmendment({
        changes: updateData,
        reason: req.body.amendmentReason || 'Record update'
      }, req.user.id);
    } else {
      // Update draft record
      await record.update(updateData);
    }

    // Log the update
    await record.logAccess(req.user.id, 'UPDATED');

    res.json({
      success: true,
      message: record.status === 'FINALIZED' ? 'Amendment added' : 'Record updated',
      record: await MedicalRecord.findByPk(id, {
        include: getDefaultIncludes()
      })
    });
  } catch (error) {
    next(error);
  }
};


exports.addProgressNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, noteType, isConfidential } = req.body;

    const record = await MedicalRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    const note = await record.addProgressNote(content, req.user.id);
    await note.update({ noteType, isConfidential });

    res.json({
      success: true,
      message: 'Progress note added',
      note
    });
  } catch (error) {
    next(error);
  }
};


const getDefaultIncludes = () => [
  {
    model: User,
    as: 'patient',
    attributes: ['id', 'name', 'dateOfBirth', 'gender']
  },
  {
    model: User,
    as: 'practitioner',
    attributes: ['id', 'name', 'role']
  },
  {
    model: Department,
    attributes: ['id', 'name']
  },
  {
    model: ProgressNote,
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'name', 'role']
    }]
  },
  {
    model: Consent,
    where: {
      status: 'ACTIVE'
    },
    required: false
  }
];

const checkRecordAccess = async (user, record) => {
  // Admin has full access
  if (user.role === 'ADMIN') return true;

  // Patient can only access their own records
  if (user.role === 'PATIENT') {
    return user.id === record.patientId;
  }

  // Healthcare providers can access based on department and confidentiality
  if (['DOCTOR', 'NURSE'].includes(user.role)) {
    if (record.confidentialityLevel === 'HIGHLY_RESTRICTED') {
      return record.practitionerId === user.id;
    }
    return true;
  }

  return false;
};

const calculateBMI = (height, weight) => {
  const heightInMeters = height.unit === 'm' ? height.value : height.value / 100;
  const weightInKg = weight.unit === 'kg' ? weight.value : weight.value * 0.453592;
  return (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
};


exports.finalizeMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const record = await MedicalRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    if (record.status === 'FINALIZED') {
      return res.status(400).json({
        success: false,
        message: 'Record is already finalized'
      });
    }

    await record.update({
      status: 'FINALIZED',
      metadata: {
        ...record.metadata,
        finalizedBy: req.user.id,
        finalizedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Medical record finalized',
      record
    });
  } catch (error) {
    next(error);
  }
};

exports.getMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const record = await MedicalRecord.findByPk(id, {
      include: getDefaultIncludes()
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check access permissions
    if (!await checkRecordAccess(req.user, record)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this medical record'
      });
    }

    // Log access
    await record.logAccess(req.user.id, 'VIEWED');

    res.json({
      success: true,
      record
    });
  } catch (error) {
    next(error);
  }
};

exports.getPatientRecords = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { 
      startDate, 
      endDate, 
      visitType, 
      department,
      status,
      page = 1,
      limit = 10
    } = req.query;

    const whereClause = { patientId };

    // Apply filters
    if (startDate && endDate) {
      whereClause.visitDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    if (visitType) whereClause.visitType = visitType;
    if (status) whereClause.status = status;
    if (department) whereClause.departmentId = department;

    // Check access permissions
    if (req.user.role === 'PATIENT' && req.user.id !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to patient records'
      });
    }

    const { count, rows: records } = await MedicalRecord.findAndCountAll({
      where: whereClause,
      include: getDefaultIncludes(),
      order: [['visitDate', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      records
    });
  } catch (error) {
    next(error);
  }
};


exports.getPatientMedicalRecords = async (req, res, next) => {
    try {
      const { patientId } = req.params;
  
      // Check if user has permission (doctor viewing their patient, the patient themselves, or admin)
      const isAuthorized = 
        req.user.role === 'admin' || 
        req.user.id === patientId || 
        (req.user.role === 'doctor');
  
      if (!isAuthorized) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized to view these records' 
        });
      }
  
      const records = await MedicalRecord.findAll({
        where: { patientId },
        include: [
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['visitDate', 'DESC']]
      });
  
      res.json({
        success: true,
        count: records.length,
        records
      });
    } catch (error) {
      next(error);
    }
  };

  
exports.getMedicalRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = { id };

    // Add user-specific conditions
    if (req.user.role === 'patient') {
      where.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const medicalRecord = await MedicalRecord.findOne({
      where,
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    res.json({ medicalRecord });
  } catch (error) {
    next(error);
  }
};



module.exports = exports;