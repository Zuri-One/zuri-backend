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
  staffLogin
  
} = require('../../controllers/auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validatePasswordReset } = require('../../middleware/validation.middleware');
router.post('/staff-login', staffLogin);
router.post('/register', register);
router.post('/verify-email-code', verifyEmailWithCode);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', validatePasswordReset, resetPassword);
router.post('/enable-2fa', authenticate, enable2FA);
router.post('/verify-2fa', verify2FA);


if (process.env.NODE_ENV === 'development') {
  router.delete('/purge-users', async (req, res) => {
    try {
      await User.deleteMany({});
      res.json({ message: 'All users purged successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error purging users' });
    }
  });
}

if (process.env.NODE_ENV !== 'production') {
  router.get('/debug-user/:email', async (req, res) => {
    const user = await User.findOne({ email: req.params.email });
    res.json({
      exists: !!user,
      user: user ? {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isEmailVerified
      } : null
    });
  });
}

if (process.env.NODE_ENV === 'development') {
  router.get('/debug-password/:email', async (req, res) => {
    try {
      const user = await User.findOne({ 
        where: { email: req.params.email }
      });
      
      if (!user) {
        return res.json({ exists: false });
      }

      // Test password
      const testPassword = '20405011006@Ki';
      const isMatch = await user.comparePassword(testPassword);

      res.json({
        exists: true,
        passwordHash: user.password,
        testPassword,
        isMatch,
        isHashed: user.password !== testPassword && user.password.length === 60 // bcrypt hashes are always 60 chars
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}


if (process.env.NODE_ENV === 'development') {
  router.get('/debug-user/:email', async (req, res) => {
    try {
      const user = await User.findOne({ email: req.params.email })
        .select('+emailVerificationCode +password'); 
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({
        user: {
          ...user.toObject(),
          emailVerificationCode: user.emailVerificationCode,
          emailVerificationExpires: user.emailVerificationExpires
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user data' });
    }
  });
}


module.exports = router;