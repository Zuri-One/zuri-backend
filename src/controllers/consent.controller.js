// controllers/consent.controller.js
const { Consent, User, MedicalRecord } = require('../models');
const { Op } = require('sequelize');
const sendEmail = require('../utils/email.util');



exports.createConsent = async (req, res, next) => {
  try {
    const {
      medicalRecordId,
      patientId,
      consentType,
      description,
      consentGivenBy,
      consentorDetails,
      validUntil,
      signature
    } = req.body;

    // Validate medical record exists
    const record = await MedicalRecord.findByPk(medicalRecordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Create consent record
    const consent = await Consent.create({
      medicalRecordId,
      patientId,
      consentType,
      description,
      consentGivenBy,
      consentorDetails,
      validUntil,
      signature,
      witnessId: req.user.id
    });

    // Fetch complete consent with associations
    const completeConsent = await Consent.findByPk(consent.id, {
      include: [
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'witness',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      consent: completeConsent
    });
  } catch (error) {
    next(error);
  }
};

exports.getConsents = async (req, res, next) => {
  try {
    const { patientId, status, type } = req.query;
    const whereClause = {};

    if (patientId) whereClause.patientId = patientId;
    if (status) whereClause.status = status;
    if (type) whereClause.consentType = type;

    const consents = await Consent.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'witness',
          attributes: ['id', 'name', 'role']
        },
        {
          model: MedicalRecord,
          attributes: ['id', 'visitDate', 'visitType']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      consents
    });
  } catch (error) {
    next(error);
  }
};

exports.getConsentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consent = await Consent.findByPk(id, {
      include: [
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'witness',
          attributes: ['id', 'name', 'role']
        },
        {
          model: MedicalRecord,
          attributes: ['id', 'visitDate', 'visitType']
        }
      ]
    });

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent record not found'
      });
    }

    res.json({
      success: true,
      consent
    });
  } catch (error) {
    next(error);
  }
};

exports.withdrawConsent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const consent = await Consent.findByPk(id);
    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent record not found'
      });
    }

    // Verify authority to withdraw
    if (req.user.role === 'PATIENT' && req.user.id !== consent.patientId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to withdraw this consent'
      });
    }

    await consent.withdraw(reason);

    res.json({
      success: true,
      message: 'Consent withdrawn successfully',
      consent
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyConsent = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    const doctorId = req.user.id;

    const activeConsent = await Consent.findOne({
      where: {
        patientId,
        consentType: 'RECORDS_ACCESS',
        status: 'ACTIVE',
        validUntil: {
          [Op.gt]: new Date()
        },
        'consentorDetails.doctorId': doctorId,
        'consentorDetails.status': 'APPROVED'
      }
    });

    res.json({
      success: true,
      hasValidConsent: !!activeConsent
    });
  } catch (error) {
    next(error);
  }
};

exports.updateConsent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const consent = await Consent.findByPk(id);
    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Consent record not found'
      });
    }

    if (consent.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Can only update active consents'
      });
    }

    // Update consent details
    await consent.update({
      ...updateData,
      metadata: {
        ...consent.metadata,
        lastUpdatedBy: req.user.id,
        lastUpdatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Consent updated successfully',
      consent
    });
  } catch (error) {
    next(error);
  }
};

exports.getConsentHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const consentHistory = await Consent.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'witness',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Group by consent type
    const groupedHistory = consentHistory.reduce((acc, consent) => {
      if (!acc[consent.consentType]) {
        acc[consent.consentType] = [];
      }
      acc[consent.consentType].push(consent);
      return acc;
    }, {});

    res.json({
      success: true,
      history: groupedHistory
    });
  } catch (error) {
    next(error);
  }
};



exports.requestAccess = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { patientId } = req.body;

    // Check for existing active consent
    const existingConsent = await Consent.findOne({
      where: {
        patientId,
        consentType: 'DATA_SHARING',
        status: 'ACTIVE',
        validUntil: {
          [Op.gt]: new Date()
        },
        consentorDetails: {
          doctorId
        }
      }
    });

    if (existingConsent) {
      return res.status(400).json({
        success: false,
        message: 'Access request already exists'
      });
    }

    // Create new consent request
    const consent = await Consent.create({
      patientId,
      consentType: 'DATA_SHARING',
      description: 'Request for medical records access',
      consentGivenBy: 'PATIENT',
      consentorDetails: {
        doctorId,
        requestType: 'RECORDS_ACCESS',
        status: 'PENDING'
      },
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      status: 'PENDING',
      signature: 'PENDING',
      metadata: {
        requestedBy: doctorId,
        requestedAt: new Date()
      }
    });

    // Get doctor and patient details for email
    const [doctor, patient] = await Promise.all([
      User.findByPk(doctorId),
      User.findByPk(patientId)
    ]);

    // Send email notification
    await sendEmail({
      to: patient.email,
      subject: 'Medical Records Access Request',
      html: generateAccessRequestEmail({
        patientName: patient.name,
        doctorName: doctor.name,
        doctorSpecialization: doctor.specialization || 'Doctor',
        consentId: consent.id
      })
    });

    res.status(201).json({
      success: true,
      message: 'Access request sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getPendingRequests = async (req, res, next) => {
  try {
    const requests = await Consent.findAll({
      where: {
        patientId: req.user.id,
        consentType: 'DATA_SHARING',
        status: 'ACTIVE',
        'consentorDetails.requestType': 'RECORDS_ACCESS',
        'consentorDetails.status': 'PENDING',
        validUntil: {
          [Op.gt]: new Date()
        }
      },
      include: [{
        model: User,
        as: 'witness', // This will be the doctor in this case
        attributes: ['id', 'name', 'specialization']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      requests: requests.map(request => ({
        id: request.id,
        doctor: {
          id: request.consentorDetails.doctorId,
          name: request.witness.name,
          specialization: request.witness.specialization
        },
        createdAt: request.createdAt,
        validUntil: request.validUntil
      }))
    });
  } catch (error) {
    next(error);
  }
};

exports.handleAccessResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const patientId = req.user.id;

    const consent = await Consent.findOne({
      where: {
        id,
        patientId,
        consentType: 'DATA_SHARING',
        status: 'ACTIVE',
        'consentorDetails.status': 'PENDING'
      }
    });

    if (!consent) {
      return res.status(404).json({
        success: false,
        message: 'Access request not found'
      });
    }

    if (action === 'APPROVE') {
      await consent.update({
        status: 'ACTIVE',
        signature: 'APPROVED',
        consentorDetails: {
          ...consent.consentorDetails,
          status: 'APPROVED',
          approvedAt: new Date()
        }
      });
    } else {
      await consent.withdraw('Request rejected by patient');
    }

    // Notify doctor
    const doctor = await User.findByPk(consent.consentorDetails.doctorId);
    await sendEmail({
      to: doctor.email,
      subject: `Medical Records Access Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      html: generateAccessResponseEmail({
        doctorName: doctor.name,
        status: action,
        patientName: req.user.name
      })
    });

    res.json({
      success: true,
      message: `Access request ${action.toLowerCase()}ed successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;