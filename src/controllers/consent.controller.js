// controllers/consent.controller.js
const { Consent, User, MedicalRecord } = require('../models');
const { Op } = require('sequelize');

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
          as: 'patient',
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
          as: 'patient',
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
          as: 'patient',
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
    const { patientId, consentType } = req.query;

    const activeConsent = await Consent.findOne({
      where: {
        patientId,
        consentType,
        status: 'ACTIVE',
        validUntil: {
          [Op.or]: [
            { [Op.gt]: new Date() },
            { [Op.is]: null }
          ]
        }
      }
    });

    res.json({
      success: true,
      hasValidConsent: !!activeConsent,
      consent: activeConsent
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

module.exports = exports;