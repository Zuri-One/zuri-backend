// src/controllers/auth.controller.js
const crypto = require('crypto');
const { User } = require('../models');
const sendEmail = require('../utils/email.util');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { Op } = require('sequelize');
const { 
  generateVerificationEmail,
  generateResetPasswordEmail,
  generate2FAEmail,
  generatePasswordResetEmail,
  generatePasswordChangeConfirmationEmail
} = require('../utils/email-templates.util');





exports.staffLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ 
      where: { 
        email: email.toLowerCase() 
      } 
    });

    
    if (!user || user.role === 'PATIENT' || user.role === 'ADMIN') {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Add some logging here to debug password issues
      console.log('Password match failed for user:', email);
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const token = user.generateAuthToken();
    user.lastLogin = new Date();
    await user.save();

    // Make sure this matches your frontend ROLE_REDIRECTS
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,  // Will be lowercase from DB
        department: user.department,
        permissions: User.rolePermissions[user.role.toUpperCase()] || []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.verifyEmailWithCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    console.log('Verification attempt:', { email, code });

    const user = await User.findOne({
      where: {
        email,
        emailVerificationCode: code,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        }
      }
    });
    
    if (!user) {
      console.log('User not found or code invalid/expired');
      return res.status(400).json({
        message: 'Invalid or expired verification code'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    next(error);
  }
};


const generateUniqueRegistrationId = async (name, attempt = 0) => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const suffix = attempt > 0 ? `-${attempt}` : '';
  const registrationId = `ZURI-${cleanName}-${day}${month}${year}${suffix}`;

  // Check if ID exists
  const existingUser = await User.findOne({ where: { registrationId } });
  if (existingUser) {
    return generateUniqueRegistrationId(name, attempt + 1);
  }
  
  return registrationId;
};



exports.registerPatient = async (req, res, next) => {
  try {
    const {
      surname,
      otherNames,
      email,
      password,
      dateOfBirth,
      gender,
      telephone1,
      telephone2,
      postalAddress,
      postalCode,
      occupation,
      idType,
      idNumber,
      nationality,
      town,
      areaOfResidence,
      nextOfKin,
      medicalHistory,
      insuranceInfo
    } = req.body;

    // Basic validation for required fields
    const requiredFields = [
      'surname',
      'otherNames',
      'dateOfBirth',
      'gender',
      'telephone1',
      'occupation',
      'idType',
      'nationality',
      'town',
      'areaOfResidence'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate next of kin
    if (!nextOfKin?.name || !nextOfKin?.relationship || !nextOfKin?.phone) {
      return res.status(400).json({
        message: 'Next of kin requires name, relationship and phone'
      });
    }

    // Check for existing email if provided
    if (email) {
      const existingUser = await User.findOne({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'Email already registered'
        });
      }

      // Validate password if email is provided
      if (!password) {
        return res.status(400).json({
          message: 'Password is required when email is provided'
        });
      }
    }

    // Generate patient number
    const lastPatient = await User.findOne({
      where: {
        patientNumber: {
          [Op.like]: 'ZH%'
        },
        role: 'PATIENT'
      },
      order: [['patientNumber', 'DESC']]
    });

    let nextNumber = 1;
    if (lastPatient && lastPatient.patientNumber) {
      const lastNumber = parseInt(lastPatient.patientNumber.substring(2));
      nextNumber = lastNumber + 1;
    }
    const patientNumber = `ZH${nextNumber.toString().padStart(6, '0')}`;

    // Generate verification code and token if email is provided
    let verificationCode, verificationToken, hashedPassword;
    if (email && password) {
      verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      verificationToken = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Create user
    const user = await User.create({
      surname,
      otherNames,
      email: email?.toLowerCase(),
      password: hashedPassword,
      dateOfBirth,
      gender: gender.toUpperCase(),
      telephone1,
      telephone2,
      postalAddress,
      postalCode,
      occupation,
      idType,
      idNumber,
      nationality,
      town,
      areaOfResidence,
      nextOfKin,
      medicalHistory: medicalHistory || {
        existingConditions: [],
        allergies: []
      },
      insuranceInfo: insuranceInfo || {
        scheme: null,
        provider: null,
        membershipNumber: null,
        principalMember: null
      },
      role: 'PATIENT',
      patientNumber,
      emailVerificationCode: verificationCode,
      emailVerificationToken: verificationToken ? 
        crypto.createHash('sha256').update(verificationToken).digest('hex') 
        : null,
      emailVerificationExpires: verificationToken ? 
        new Date(Date.now() + 24 * 60 * 60 * 1000) 
        : null,
      isActive: true,
      status: 'active'
    });

    // Try to send verification email if email is provided
    if (email && verificationToken) {
      try {
        const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        await sendEmail({
          to: user.email,
          subject: 'Verify your email - Zuri Health',
          html: generateVerificationEmail(
            `${user.surname} ${user.otherNames}`,
            verificationUrl,
            verificationCode
          )
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Continue without throwing error
      }
    }

    // Return success response
    res.status(201).json({
      message: email ? 
        'Registration successful. Please check your email for verification instructions.' : 
        'Registration successful',
      patientNumber: user.patientNumber,
      registrationDate: user.createdAt,
      userId: user.id,
      patientInfo: {
        name: `${user.surname} ${user.otherNames}`,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        nationality: user.nationality,
        contact: user.telephone1
      }
    });

  } catch (error) {
    console.error('Patient registration error:', error);
    next(error);
  }
};

const generatePatientNumber = async () => {
  const prefix = 'ZH';
  const padLength = 6;

  // Find the last patient number
  const lastPatient = await User.findOne({
    where: {
      patientNumber: {
        [Op.like]: `${prefix}%`
      },
      role: 'PATIENT'
    },
    order: [['patientNumber', 'DESC']]
  });

  let nextNumber = 1;
  if (lastPatient && lastPatient.patientNumber) {
    // Extract the number part and increment
    const lastNumber = parseInt(lastPatient.patientNumber.substring(2));
    nextNumber = lastNumber + 1;
  }

  // Pad with zeros
  return `${prefix}${nextNumber.toString().padStart(padLength, '0')}`;
};


exports.register = async (req, res, next) => {
  console.log('Complete request body:', req.body);
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      employeeId,
      licenseNumber,
      specialization,
      qualification,
      contactNumber,
      gender,
      bloodGroup,
      dateOfBirth,
      emergencyContact,
      medicalHistory,
      insuranceInfo,
      nationalId  // Add this field
    } = req.body;

    console.log('Incoming registration data:', {
      role,
      normalizedRole: role ? role.toUpperCase() : 'PATIENT'
    });

    const validRoles = [
      'PATIENT',
      'DOCTOR',
      'NURSE',
      'LAB_TECHNICIAN',
      'PHARMACIST',
      'RADIOLOGIST',
      'PHYSIOTHERAPIST',
      'NUTRITIONIST',
      'RECEPTIONIST',
      'BILLING_STAFF',
      'MEDICAL_ASSISTANT',
      'WARD_MANAGER'
    ];

    if (role && role !== 'PATIENT' && !validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role specified'
      });
    }

    // Check for existing email or nationalId (for patients)
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          ...(!role || role === 'PATIENT' ? [{ nationalId }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email.toLowerCase() ? 
          'Email already registered' : 
          'National ID already registered'
      });
    }

    if (role !== 'PATIENT') {
      if (!employeeId) {
        return res.status(400).json({
          message: 'Employee ID is required for staff registration'
        });
      }

      if (['DOCTOR', 'DOCTOR', 'DOCTOR', 'LAB_TECHNICIAN'].includes(role)) {
        if (!licenseNumber) {
          return res.status(400).json({
            message: 'License number is required for medical professionals'
          });
        }
      }
    }

    let normalizedRole = role ? role : 'PATIENT';
    
    // If it's a patient registration, require National ID
    if ((!role || normalizedRole === 'PATIENT') && !nationalId) {
      return res.status(400).json({
        message: 'National ID is required for patient registration'
      });
    }

    // Generate registration ID for patients
    const registrationId = (!role || normalizedRole === 'PATIENT') ? 
    await generateUniqueRegistrationId(name) : 
    null;
    
    // These special cases should also be lowercase
    if (normalizedRole === 'lab_technician') {
      normalizedRole = 'lab_technician';
    } else if (normalizedRole === 'billing_staff') {
      normalizedRole = 'billing_staff';
    } else if (normalizedRole === 'ward_manager') {
      normalizedRole = 'ward_manager';
    } else if (normalizedRole === 'medical_assistant') {
      normalizedRole = 'medical_assistant';
    }

    console.log('Attempting to create user with role:', normalizedRole);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed successfully');

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    try {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: normalizedRole,  // Let the hook handle the case conversion
        department,
        employeeId,
        licenseNumber,
        specialization,
        qualification,
        contactNumber,
        gender,             // Let the hook handle the case conversion
        bloodGroup,         // Let the hook handle the case conversion
        dateOfBirth,
        emergencyContact,
        medicalHistory,
        insuranceInfo,
        nationalId,         // Add the new field
        registrationId,     // Add the registration ID
        emailVerificationCode: verificationCode,
        emailVerificationToken: crypto
          .createHash('sha256')
          .update(verificationToken)
          .digest('hex'),
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        joiningDate: normalizedRole !== 'PATIENT' ? new Date() : null
      });
    } catch (createError) {
      console.error('User creation error:', createError);
      return res.status(400).json({
        message: 'Invalid role or data format',
        error: createError.message
      });
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: generateVerificationEmail(user.name, verificationUrl, verificationCode)
    });

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      userId: user.id,
      ...((!role || normalizedRole === 'PATIENT') && {
        registrationId: user.registrationId
      })
    });
  } catch (error) {
    next(error);
  }
};


// Update login controller to handle role-specific logic
exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
        role
      }
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive || user.status !== 'active') {
      return res.status(401).json({
        message: 'Account is not active. Please contact administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Generate role-specific token
    const token = user.generateAuthToken();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: User.rolePermissions[user.role] || []
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ 
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Email already verified'
      });
    }

    // Generate new verification token and code
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationCode = generateVerificationCode();

    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Generate verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Email Verification',
      html: generateVerificationEmail(user.name, verificationUrl, verificationCode)
    });

    res.json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log('Password reset requested for:', email);

    const user = await User.findOne({ 
      where: { email: email.toLowerCase() }
    });
    
    // Security best practice: same response whether user exists or not
    if (!user) {
      console.log('No user found with email:', email);
      return res.status(200).json({
        message: 'If this email exists, you will receive a password reset code'
      });
    }

    console.log('User found:', { userId: user.id, email: user.email });

    // Generate reset code
    const resetCode = generateResetCode();
    console.log('Generated reset code for user:', resetCode);

    // Hash reset code
    const hashedResetCode = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');

    // Update user with reset code
    user.resetPasswordToken = hashedResetCode;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Code - Zuri Health',
      html: generatePasswordResetEmail(user.name, resetCode)
    });

    console.log('Reset code email sent successfully to:', email);

    res.status(200).json({
      message: 'If this email exists, you will receive a password reset code'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'An error occurred while processing your request'
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { code, password } = req.body;

    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedCode,
        resetPasswordExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset code'
      });
    }

    // Validate new password
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Send password change confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully - Zuri Health',
      html: generatePasswordChangeConfirmationEmail(user.name)
    });

    res.json({
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    next(error);
  }
};

exports.enable2FA = async (req, res, next) => {
  try {
    const { id } = req.user;
    
    const secret = speakeasy.generateSecret({
      name: `HMS:${req.user.email}`
    });

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    // Send email notification
    await sendEmail({
      to: user.email,
      subject: '2FA Enabled',
      html: generate2FAEmail(user.name)
    });

    res.json({
      message: '2FA enabled successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.verify2FA = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;

    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.require2FA) {
      return res.status(400).json({
        message: 'Invalid token'
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify 2FA code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow for some time drift
    });

    if (!verified) {
      return res.status(401).json({
        message: 'Invalid 2FA code'
      });
    }

    // Generate final token
    const token = user.generateAuthToken();

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;