// src/routes/v1/auth.route.js
const router = require('express').Router();
const { 
  register, 
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  enable2FA,
  verify2FA,
  verifyEmailWithCode,
  staffLogin,
  registerPatient,
  registerAdmin,
  verifyAdminLogin,    
  verifyStaffLogin,
  resetPasswordForm,
  processPasswordReset,
  passwordResetSuccess,

} = require('../../controllers/auth.controller');

const { 
  authenticate, 
  authorizeAdmin    
} = require('../../middleware/auth.middleware');
const { validatePasswordReset } = require('../../middleware/validation.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *         role:
 *           type: string
 *           enum: [ADMIN, DOCTOR, NURSE, PATIENT, LAB_TECHNICIAN, PHARMACIST, RECEPTIONIST]
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER]
 *         bloodGroup:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         contactNumber:
 *           type: string
 *         isEmailVerified:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [active, suspended, on_leave, terminated]
 *     LoginCredentials:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *         role:
 *           type: string
 *           enum: [ADMIN, DOCTOR, NURSE, PATIENT, LAB_TECHNICIAN, PHARMACIST, RECEPTIONIST]
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             role:
 *               type: string
 *             permissions:
 *               type: array
 *               items:
 *                 type: string
 *
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and registration endpoints
 */

/**
 * @swagger
 * /api/v1/auth/staff-login:
 *   post:
 *     summary: Login for staff members
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginCredentials'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/staff-login', staffLogin);

/**
 * @swagger
 * /api/v1/auth/verify-admin-login:
 *   post:
 *     summary: Verify admin login with 2FA code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tempToken
 *               - code
 *             properties:
 *               tempToken:
 *                 type: string
 *                 description: Temporary token received after initial login
 *               code:
 *                 type: string
 *                 description: Verification code sent via WhatsApp or email
 *     responses:
 *       200:
 *         description: Login verification successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid verification code
 *       400:
 *         description: Invalid token
 */
router.post('/verify-admin-login', verifyAdminLogin);

/**
 * @swagger
 * /api/v1/auth/verify-staff-login:
 *   post:
 *     summary: Verify staff login with 2FA code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tempToken
 *               - code
 *             properties:
 *               tempToken:
 *                 type: string
 *                 description: Temporary token received after initial login
 *               code:
 *                 type: string
 *                 description: Verification code sent via WhatsApp or email
 *     responses:
 *       200:
 *         description: Login verification successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid verification code
 *       400:
 *         description: Invalid token
 */
router.post('/verify-staff-login', verifyStaffLogin);


/**
 * @swagger
 * /api/v1/auth/register-admin:
 *   post:
 *     summary: Register a new admin user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - surname
 *               - otherNames
 *               - email
 *               - password
 *               - employeeId
 *               - telephone1
 *               - gender
 *               - dateOfBirth
 *               - town
 *               - areaOfResidence
 *               - idType
 *               - nationality
 *             properties:
 *               surname:
 *                 type: string
 *                 description: Admin's surname/last name
 *               otherNames:
 *                 type: string
 *                 description: Admin's other names (first and middle names)
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               employeeId:
 *                 type: string
 *                 description: Unique employee ID for the admin
 *               telephone1:
 *                 type: string
 *                 description: Primary phone number
 *               telephone2:
 *                 type: string
 *                 description: Secondary phone number (optional)
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               postalAddress:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               town:
 *                 type: string
 *               areaOfResidence:
 *                 type: string
 *               idType:
 *                 type: string
 *                 enum: [NATIONAL_ID, PASSPORT, MILITARY_ID, ALIEN_ID]
 *               idNumber:
 *                 type: string
 *               nationality:
 *                 type: string
 *               designation:
 *                 type: string
 *                 description: Admin's job title or designation
 *     responses:
 *       201:
 *         description: Admin registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 employeeId:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - Requires admin privileges
 *       409:
 *         description: Email or Employee ID already exists
 */
router.post('/register-admin',  registerAdmin);
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 registrationId:
 *                   type: string
 *                   description: Only for patient registration
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already exists
 */
router.post('/register', register);


/**
 * @swagger
 * /api/v1/auth/registerPatient:
 *   post:
 *     summary: Register a new patient
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - surname
 *               - otherNames
 *               - dateOfBirth
 *               - gender
 *               - telephone1
 *               - occupation
 *               - idType
 *               - nationality
 *               - town
 *               - areaOfResidence
 *               - nextOfKin
 *             properties:
 *               surname:
 *                 type: string
 *                 description: Patient's surname/last name
 *               otherNames:
 *                 type: string
 *                 description: Patient's other names (first and middle names)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Optional email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Required if email is provided
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Patient's date of birth (YYYY-MM-DD)
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               telephone1:
 *                 type: string
 *                 description: Primary phone number
 *               telephone2:
 *                 type: string
 *                 description: Secondary phone number (optional)
 *               postalAddress:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               occupation:
 *                 type: string
 *               idType:
 *                 type: string
 *                 enum: [NATIONAL_ID, PASSPORT, MILITARY_ID, ALIEN_ID]
 *               idNumber:
 *                 type: string
 *               nationality:
 *                 type: string
 *               town:
 *                 type: string
 *               areaOfResidence:
 *                 type: string
 *               nextOfKin:
 *                 type: object
 *                 required:
 *                   - name
 *                   - relationship
 *                   - phone
 *                 properties:
 *                   name:
 *                     type: string
 *                   relationship:
 *                     type: string
 *                   phone:
 *                     type: string
 *               medicalHistory:
 *                 type: object
 *                 properties:
 *                   existingConditions:
 *                     type: array
 *                     items:
 *                       type: string
 *                   allergies:
 *                     type: array
 *                     items:
 *                       type: string
 *               insuranceInfo:
 *                 type: object
 *                 properties:
 *                   scheme:
 *                     type: string
 *                   provider:
 *                     type: string
 *                   membershipNumber:
 *                     type: string
 *                   principalMember:
 *                     type: string
 *     responses:
 *       201:
 *         description: Patient registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 patientNumber:
 *                   type: string
 *                 registrationDate:
 *                   type: string
 *                   format: date-time
 *                 userId:
 *                   type: string
 *       400:
 *         description: Invalid input data or missing required fields
 *       409:
 *         description: Email already exists
 */
router.post('/registerPatient', registerPatient);

/**
 * @swagger
 * /api/v1/auth/verify-email-code:
 *   post:
 *     summary: Verify email with verification code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired verification code
 */
router.post('/verify-email-code', verifyEmailWithCode);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginCredentials'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/login', login);

/**
 * @swagger
 * /api/v1/auth/verify-email/{token}:
 *   get:
 *     summary: Verify email with token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 */
router.post('/resend-verification', resendVerification);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset instructions sent if email exists
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - password
 *             properties:
 *               code:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/reset-password', validatePasswordReset, resetPassword);


/**
 * @swagger
 * /api/v1/auth/reset-password-form:
 *   get:
 *     summary: Display password reset form
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Reset token from email
 *       - in: query
 *         name: setup
 *         schema:
 *           type: boolean
 *         description: Whether this is initial password setup
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error message from previous attempt
 *     responses:
 *       200:
 *         description: Password reset form displayed
 *       400:
 *         description: Invalid or missing token
 */
router.get('/reset-password-form', resetPasswordForm);

/**
 * @swagger
 * /api/v1/auth/process-password-reset:
 *   post:
 *     summary: Process password reset form submission
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *               setup:
 *                 type: boolean
 *     responses:
 *       302:
 *         description: Redirect to success or error page
 */
router.post('/process-password-reset', processPasswordReset);

/**
 * @swagger
 * /api/v1/auth/password-reset-success:
 *   get:
 *     summary: Display password reset success page
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: setup
 *         schema:
 *           type: boolean
 *         description: Whether this was initial password setup
 *     responses:
 *       200:
 *         description: Success page displayed
 */
router.get('/password-reset-success', passwordResetSuccess);


/**
 * @swagger
 * /api/v1/auth/enable-2fa:
 *   post:
 *     summary: Enable two-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/enable-2fa', authenticate, enable2FA);

/**
 * @swagger
 * /api/v1/auth/verify-2fa:
 *   post:
 *     summary: Verify 2FA code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tempToken
 *               - code
 *             properties:
 *               tempToken:
 *                 type: string
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *     responses:
 *       200:
 *         description: 2FA verification successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/verify-2fa', verify2FA);

// Development routes documentation
if (process.env.NODE_ENV === 'development') {
  /**
   * @swagger
   * /api/v1/auth/debug-user/{email}:
   *   get:
   *     summary: Get debug info for user (Development Only)
   *     tags: [Development]
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Debug information retrieved
   */
  router.get('/debug-user/:email', /* ... */);
}

module.exports = router;