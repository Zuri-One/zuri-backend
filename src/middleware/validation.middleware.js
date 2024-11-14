const validatePasswordReset = (req, res, next) => {
    const { code, password } = req.body;
  
    if (!code || !password) {
      return res.status(400).json({
        message: 'Please provide both code and password'
      });
    }
  
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }
  
    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
  
    next();
  };
  
  module.exports = {
    validatePasswordReset
  };