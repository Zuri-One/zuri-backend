// controllers/patient-consent.controller.js
const { User, MedicalRecord } = require('../models');
const sendEmail = require('../utils/email.util');

const { 
    generateVerificationEmail,
    generateResetPasswordEmail,
    generate2FAEmail,
    generatePasswordResetEmail,
    generatePasswordChangeConfirmationEmail,
    generateAccessRequestEmail
  } = require('../utils/email-templates.util');

exports.requestAccess = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    // Get patient and doctor details
    const [patient, doctor] = await Promise.all([
      User.findByPk(patientId),
      User.findByPk(doctorId)
    ]);

    if (!patient || !doctor) {
      return res.status(404).json({
        success: false,
        message: 'Patient or doctor not found'
      });
    }

    // Generate unique access token
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Store access request in database
    const accessRequest = await AccessRequest.create({
      patientId,
      doctorId,
      status: 'PENDING',
      accessToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Send email to patient
    const approvalLink = `${process.env.FRONTEND_URL}/consent/approve/${accessToken}`;
    const rejectLink = `${process.env.FRONTEND_URL}/consent/reject/${accessToken}`;

    await sendEmail({
      to: patient.email,
      subject: 'Medical Records Access Request',
      html: generateAccessRequestEmail({
        patientName: patient.name,
        doctorName: doctor.name,
        doctorSpecialization: doctor.specialization,
        approvalLink,
        rejectLink,
        requestId: accessRequest.id
      })
    });

    res.json({
      success: true,
      message: 'Access request sent to patient',
      requestId: accessRequest.id
    });
  } catch (error) {
    next(error);
  }
};

exports.handleAccessResponse = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { action } = req.body;

    const accessRequest = await AccessRequest.findOne({
      where: {
        accessToken: token,
        status: 'PENDING',
        expiresAt: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: User,
          as: 'DOCTOR',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!accessRequest) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired access request'
      });
    }

    accessRequest.status = action.toUpperCase();
    await accessRequest.save();

    // Notify doctor of the decision
    await sendEmail({
      to: accessRequest.DOCTOR.email,
      subject: 'Medical Records Access Request Update',
      html: generateAccessResponseEmail({
        doctorName: accessRequest.DOCTOR.name,
        patientName: accessRequest.PATIENT.name,
        status: action,
        reason: req.body.reason || ''
      })
    });

    res.json({
      success: true,
      message: `Access request ${action}`
    });
  } catch (error) {
    next(error);
  }
};

exports.checkAccessStatus = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    const activeAccess = await AccessRequest.findOne({
      where: {
        patientId,
        doctorId,
        status: 'APPROVED',
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });

    res.json({
      success: true,
      hasAccess: !!activeAccess
    });
  } catch (error) {
    next(error);
  }
};