// src/middleware/validation.middleware.js
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

const validateAppointment = (req, res, next) => {
  const { doctorId, dateTime, type, reason } = req.body;

  if (!doctorId || !dateTime || !type || !reason) {
    return res.status(400).json({
      message: 'Please provide all required fields: doctorId, dateTime, type, and reason'
    });
  }

  if (!['in-person', 'video'].includes(type)) {
    return res.status(400).json({
      message: 'Appointment type must be either "in-person" or "video"'
    });
  }

  // Validate that dateTime is in the future
  if (new Date(dateTime) <= new Date()) {
    return res.status(400).json({
      message: 'Appointment date must be in the future'
    });
  }

  next();
};

module.exports = {
  validatePasswordReset,
  validateAppointment
};