// src/controllers/auth.controller.js
const crypto = require('crypto');
const { User, Department } = require('../models');
const {Patient} = require('../models');
const sendEmail = require('../utils/email.util');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const whatsappService = require('../services/whatsapp.service');
const { Op } = require('sequelize');
const { 
  generateVerificationEmail,
  generateResetPasswordEmail,
  generate2FAEmail,
  generatePasswordResetEmail,
  generatePasswordChangeConfirmationEmail
} = require('../utils/email-templates.util');



exports.registerAdmin = async (req, res, next) => {
  try {
    const {
      surname,
      otherNames,
      email,
      password,
      employeeId,
      telephone1,
      telephone2,
      gender,
      dateOfBirth,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      idType,
      idNumber,
      nationality,
      designation
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'surname',
      'otherNames',
      'email',
      'password',
      'employeeId',
      'telephone1',
      'gender',
      'dateOfBirth',
      'town',
      'areaOfResidence',
      'idType',
      'nationality'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check for existing email or employeeId
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { employeeId }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        message: existingUser.email === email.toLowerCase() ? 
          'Email already registered' : 
          'Employee ID already registered'
      });
    }

    // Generate verification code and token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create admin user
    const user = await User.create({
      surname,
      otherNames,
      email: email.toLowerCase(),
      password: password, // bcrypt hashing happens in the User model's beforeSave hook
      role: 'ADMIN',
      employeeId,
      telephone1,
      telephone2,
      gender: gender.toUpperCase(),
      dateOfBirth,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      idType,
      idNumber,
      nationality,
      designation,
      joiningDate: new Date(),
      emailVerificationCode: verificationCode,
      emailVerificationToken: crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex'),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true,
      status: 'active'
    });

    // Log registration success and return response immediately
    console.log(`Admin registration successful for ${email}`);
    
    res.status(201).json({
      message: 'Admin registration successful',
      userId: user.id,
      employeeId: user.employeeId
    });

    // Send verification email asynchronously
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Verify your email - Zuri Health Admin Account',
        html: generateVerificationEmail(
          `${user.surname} ${user.otherNames}`,
          verificationUrl,
          verificationCode
        )
      });

      // Send welcome email with login instructions
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Zuri Health - Admin Account Created',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Zuri Health - Admin Account</h2>
            <p>Dear ${user.surname} ${user.otherNames},</p>
            <p>Your administrator account has been successfully created with the following details:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Employee ID:</strong> ${user.employeeId}</p>
              <p><strong>Role:</strong> Administrator</p>
            </div>
            <p>You can access the Zuri Health Management System at: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
            <p>For security reasons, we strongly recommend changing your password after your first login.</p>
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0066cc;">
              <p><strong>Important:</strong></p>
              <p>Please check your email for a separate verification link to complete your account setup.</p>
            </div>
            <p>If you have any questions or need assistance, please contact the system support team.</p>
            <p>Best regards,<br>Zuri Health Team</p>
          </div>
        `
      });
      
      console.log(`Admin registration emails sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send admin registration emails:', emailError);
      // Email failure doesn't affect registration success
    }

  } catch (error) {
    console.error('Admin registration error:', error);
    next(error);
  }
};

exports.staffLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include department information
    const user = await User.findOne({ 
      where: { 
        email: email.toLowerCase(),
        role: {
          [Op.notIn]: ['PATIENT', 'ADMIN']  // Exclude patients and admin
        },
        isActive: true,  // Only active users can login
        status: 'active' // Only users with active status
      },
      include: [
        {
          model: Department,
          as: 'assignedDepartment',
          attributes: ['id', 'name']
        },
        {
          model: Department,
          as: 'primaryDepartment',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check account lock
    if (user.isAccountLocked()) {
      return res.status(401).json({
        message: 'Account is locked. Please try again later.'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment login attempts
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate verification code for 2FA
    const verificationCode = generateVerificationCode();
    
    // Store verification code and set expiry (5 minutes)
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();
    
    // Create a temporary token containing user info
    const tempToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role,
        require2FA: true,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes expiry
      }, 
      process.env.JWT_SECRET
    );
    
    // Try to send verification code via WhatsApp first if phone exists
    let verificationSent = false;
    let verificationMethod = null;
    
    if (user.telephone1) {
      try {
        await whatsappService.sendVerificationCode(user.telephone1, verificationCode);
        verificationSent = true;
        verificationMethod = 'whatsapp';
      } catch (error) {
        console.error('WhatsApp verification failed:', error);
        // Fall back to email
      }
    }
    
    // Fall back to email if WhatsApp failed or no phone exists
    if (!verificationSent) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Your verification code - Zuri Health',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Login Verification</h2>
              <p>Hello ${user.surname} ${user.otherNames},</p>
              <p>Your verification code is:</p>
              <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0; font-weight: bold;">
                ${verificationCode}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p>If you did not request this code, please ignore this message and consider changing your password.</p>
              <p>Best regards,<br>Zuri Health Team</p>
            </div>
          `
        });
        verificationSent = true;
        verificationMethod = 'email';
      } catch (error) {
        console.error('Email verification failed:', error);
      }
    }
    
    if (!verificationSent) {
      return res.status(500).json({
        message: 'Failed to send verification code. Please try again later.'
      });
    }
    
    // Send response with temporary token and verification method
    return res.status(200).json({
      message: `Verification code sent via ${verificationMethod}. Please enter the code to complete login.`,
      tempToken: tempToken,
      verificationMethod: verificationMethod,
      requiresVerification: true
    });
    
  } catch (error) {
    console.error('Staff login error:', error);
    next(error);
  }
};

exports.verifyAdminLogin = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    
    // Verify the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.require2FA || decoded.role !== 'ADMIN') {
        return res.status(400).json({
          message: 'Invalid token'
        });
      }
    } catch (err) {
      return res.status(400).json({
        message: 'Invalid or expired token. Please login again.'
      });
    }
    
    // Find the user
    const user = await User.findOne({
      where: {
        id: decoded.id,
        email: decoded.email,
        role: 'ADMIN',
        emailVerificationCode: code,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        }
      }
    });
    
    if (!user) {
      return res.status(401).json({
        message: 'Invalid or expired verification code'
      });
    }
    
    // Clear verification code
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate final authentication token
    const token = user.generateAuthToken();
    
    // Format the response to match the admin login response
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
    console.error('Admin verification error:', error);
    next(error);
  }
};

// Verification controller for staff login
exports.verifyStaffLogin = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    
    // Verify the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.require2FA || decoded.role === 'ADMIN' || decoded.role === 'PATIENT') {
        return res.status(400).json({
          message: 'Invalid token'
        });
      }
    } catch (err) {
      return res.status(400).json({
        message: 'Invalid or expired token. Please login again.'
      });
    }
    
    // Find the user with department information
    const user = await User.findOne({
      where: {
        id: decoded.id,
        email: decoded.email,
        emailVerificationCode: code,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        },
        role: {
          [Op.notIn]: ['PATIENT', 'ADMIN']  // Ensure it's a staff user
        }
      },
      include: [
        {
          model: Department,
          as: 'assignedDepartment',
          attributes: ['id', 'name']
        },
        {
          model: Department,
          as: 'primaryDepartment',
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!user) {
      return res.status(401).json({
        message: 'Invalid or expired verification code'
      });
    }
    
    // Clear verification code
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate final authentication token
    const token = user.generateAuthToken();
    
    // Format the response to match the staff login response
    res.json({
      token,
      user: {
        id: user.id,
        fullName: `${user.surname} ${user.otherNames}`,
        email: user.email,
        role: user.role,
        department: user.assignedDepartment ? {
          id: user.assignedDepartment.id,
          name: user.assignedDepartment.name
        } : null,
        primaryDepartment: user.primaryDepartment ? {
          id: user.primaryDepartment.id,
          name: user.primaryDepartment.name
        } : null,
        permissions: User.rolePermissions[user.role] || [],
        employeeId: user.employeeId,
        designation: user.designation,
        specialization: user.specialization,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Staff verification error:', error);
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

    user.isEmailVerified = null;
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
      sex,
      telephone1,
      telephone2,
      postalAddress,
      postalCode,
      occupation,
      idType,
      idNumber,
      nationality,
      town,
      residence,
      nextOfKin,
      paymentScheme,
      isEmergency,
      registrationNotes
    } = req.body;

    // Basic validation for required fields
    const requiredFields = [
      'surname',
      'otherNames',
      'dateOfBirth',
      'sex',
      'telephone1',
      'occupation',
      'idType',
      'nationality',
      'town',
      'residence',
      'nextOfKin',
      'paymentScheme'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate next of kin
    if (!nextOfKin?.name || !nextOfKin?.relationship || !nextOfKin?.contact) {
      return res.status(400).json({
        message: 'Next of kin requires name, relationship and contact number'
      });
    }

    // Check for existing telephone number
    const existingPhone = await Patient.findOne({
      where: { telephone1 }
    });

    if (existingPhone) {
      return res.status(400).json({
        message: 'Phone number already registered'
      });
    }

    // Check for existing email only if email is provided
    let hashedPassword = null;
    let verificationCode = null;
    let verificationToken = null;

    if (email) {
      const existingUser = await Patient.findOne({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'Email already registered'
        });
      }

      // Validate password only if email is provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        verificationToken = crypto.randomBytes(32).toString('hex');
      }
    }

    // Generate patient number (keeping existing logic)
    const lastPatient = await Patient.findOne({
      where: {
        patientNumber: {
          [Op.like]: 'ZH%'
        }
      },
      order: [['patientNumber', 'DESC']]
    });

    let nextNumber = 1;
    if (lastPatient && lastPatient.patientNumber) {
      const lastNumber = parseInt(lastPatient.patientNumber.substring(2));
      nextNumber = lastNumber + 1;
    }
    const patientNumber = `ZH${nextNumber.toString().padStart(6, '0')}`;

    // Create patient with updated model fields
    const patient = await Patient.create({
      surname,
      otherNames,
      email: email?.toLowerCase(),
      password: hashedPassword,
      dateOfBirth,
      sex: sex.toUpperCase(),
      telephone1,
      telephone2,
      postalAddress,
      postalCode,
      occupation,
      idType,
      idNumber,
      nationality,
      town,
      residence,
      nextOfKin,
      patientNumber,
      isEmergency: isEmergency || false,
      isRevisit: false,
      status: 'WAITING',
      registrationNotes,
      paymentScheme,
      emailVerificationCode: verificationCode,
      emailVerificationToken: verificationToken ? 
        crypto.createHash('sha256').update(verificationToken).digest('hex') 
        : null,
      emailVerificationExpires: verificationToken ? 
        new Date(Date.now() + 24 * 60 * 60 * 1000) 
        : null,
      isActive: true
    });

    // Send verification email only if email and password are provided
    if (email && verificationToken) {
      try {
        const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        await sendEmail({
          to: patient.email,
          subject: 'Verify your email - Zuri Health',
          html: generateVerificationEmail(
            `${patient.surname} ${patient.otherNames}`,
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
      patientNumber: patient.patientNumber,
      registrationDate: patient.createdAt,
      patientId: patient.id,
      patientInfo: {
        name: `${patient.surname} ${patient.otherNames}`,
        sex: patient.sex,
        dateOfBirth: patient.dateOfBirth,
        nationality: patient.nationality,
        contact: patient.telephone1
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
  try {
    const {
      surname,
      otherNames,
      email,
      password,
      role,
      departmentId,
      primaryDepartmentId,
      employeeId,
      licenseNumber,
      specialization,
      qualification,
      telephone1,
      telephone2,
      gender,
      dateOfBirth,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      idType,
      idNumber,
      nationality,
      designation,
      expertise,
      dutySchedule,
      workSchedule
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'surname',
      'otherNames',
      'email',
      'password',
      'role',
      'employeeId',
      'telephone1',
      'gender',
      'dateOfBirth',
      'town',
      'areaOfResidence',
      'idType',
      'nationality'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate role
    const validRoles = [
      'DOCTOR',
      'NURSE',
      'LAB_TECHNICIAN',
      'PHARMACIST',
      'RADIOLOGIST',
      'PHYSIOTHERAPIST',
      'CARDIOLOGIST',
      'NEUROLOGIST',
      'PEDIATRICIAN',
      'PSYCHIATRIST',
      'SURGEON',
      'ANESTHESIOLOGIST',
      'EMERGENCY_PHYSICIAN',
      'WARD_MANAGER',
      'BILLING_STAFF',
      'RECEPTIONIST'
    ];

    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({
        message: 'Invalid role specified'
      });
    }

    // Check for medical roles that require license
    const medicalRoles = [
      'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST',
      'RADIOLOGIST', 'PHYSIOTHERAPIST', 'CARDIOLOGIST',
      'NEUROLOGIST', 'PEDIATRICIAN', 'PSYCHIATRIST',
      'SURGEON', 'ANESTHESIOLOGIST', 'EMERGENCY_PHYSICIAN'
    ];

    if (medicalRoles.includes(role.toUpperCase()) && !licenseNumber) {
      return res.status(400).json({
        message: 'License number is required for medical professionals'
      });
    }

    // Check for existing email or employeeId
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { employeeId }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email.toLowerCase() ? 
          'Email already registered' : 
          'Employee ID already registered'
      });
    }

    // Generate verification code and token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Hash password
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    // Create staff user
    const user = await User.create({
      surname,
      otherNames,
      email: email.toLowerCase(),
      password: password,
      role: role.toUpperCase(),
      departmentId,
      primaryDepartmentId,
      employeeId,
      licenseNumber,
      specialization: specialization ? Array.isArray(specialization) ? specialization : [specialization] : [],
      qualification: qualification || [],
      telephone1,
      telephone2,
      gender: gender.toUpperCase(),
      dateOfBirth,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      idType,
      idNumber,
      nationality,
      designation,
      expertise: expertise || {},
      dutySchedule: dutySchedule || {},
      workSchedule: workSchedule || {},
      joiningDate: new Date(),
      emailVerificationCode: verificationCode,
      emailVerificationToken: crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex'),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true,
      status: 'active'
    });

    // Log registration success and return response immediately
    console.log(`Staff registration successful for ${email}`);
    
    res.status(201).json({
      message: 'Staff registration successful',
      userId: user.id,
      employeeId: user.employeeId
    });

    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Zuri Health - Registration Successful',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Zuri Health!</h2>
            <p>Dear ${user.surname} ${user.otherNames},</p>
            <p>Your staff account has been successfully created with the following details:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Employee ID:</strong> ${user.employeeId}</p>
              <p><strong>Role:</strong> ${user.role}</p>
              <p><strong>Password:</strong> ${password}</p>
            </div>
            <p>You can access the Zuri Health Management System at: <a href="https://hms.zuri.health">hms.zuri.health</a></p>
            <p>For security reasons, we strongly recommend changing your password after your first login.</p>
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0066cc;">
              <p><strong>Important:</strong></p>
              <p>Please check your email for a separate verification link to complete your account setup.</p>
            </div>
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
            <p>Best regards,<br>Zuri Health Team</p>
          </div>
        `
      });
      console.log(`Registration confirmation email sent to ${email}`);
    } catch (confirmationEmailError) {
      console.error('Failed to send registration confirmation email:', confirmationEmailError);
      // Email failure doesn't affect registration success
    }
    // Attempt to send verification email asynchronously
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Verify your email - Zuri Health Staff',
        html: generateVerificationEmail(
          `${user.surname} ${user.otherNames}`,
          verificationUrl,
          verificationCode
        )
      });
      console.log(`Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Email failure doesn't affect registration success
    }

  } catch (error) {
    console.error('Staff registration error:', error);
    next(error);
  }
};

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

    // For non-ADMIN roles, continue with direct login
    if (role !== 'ADMIN') {
      // Generate role-specific token
      const token = user.generateAuthToken();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return res.json({
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
    }

    // For ADMIN users, implement 2FA
    // Generate verification code for 2FA
    const verificationCode = generateVerificationCode();
    
    // Store verification code and set expiry (5 minutes)
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();
    
    // Create a temporary token containing user info
    const tempToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role,
        require2FA: true,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes expiry
      }, 
      process.env.JWT_SECRET
    );
    
    // Try to send verification code via WhatsApp first if phone exists
    let verificationSent = false;
    let verificationMethod = null;
    
    if (user.telephone1) {
      try {
        await whatsappService.sendVerificationCode(user.telephone1, verificationCode);
        verificationSent = true;
        verificationMethod = 'whatsapp';
      } catch (error) {
        console.error('WhatsApp verification failed:', error);
        // Fall back to email
      }
    }
    
    // Fall back to email if WhatsApp failed or no phone exists
    if (!verificationSent) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Your verification code - Zuri Health',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Login Verification</h2>
              <p>Hello ${user.surname} ${user.otherNames},</p>
              <p>Your verification code is:</p>
              <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0; font-weight: bold;">
                ${verificationCode}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p>If you did not request this code, please ignore this message and consider changing your password.</p>
              <p>Best regards,<br>Zuri Health Team</p>
            </div>
          `
        });
        verificationSent = true;
        verificationMethod = 'email';
      } catch (error) {
        console.error('Email verification failed:', error);
      }
    }
    
    if (!verificationSent) {
      return res.status(500).json({
        message: 'Failed to send verification code. Please try again later.'
      });
    }
    
    // Send response with temporary token and verification method
    return res.status(200).json({
      message: `Verification code sent via ${verificationMethod}. Please enter the code to complete login.`,
      tempToken: tempToken,
      verificationMethod: verificationMethod,
      requiresVerification: true
    });
    
  } catch (error) {
    console.error('Login error:', error);
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

    user.isEmailVerified = null;
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