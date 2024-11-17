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


const validateAvailabilityUpdate = (req, res, next) => {
  const { weeklySchedule, exceptions } = req.body;

  if (!weeklySchedule || typeof weeklySchedule !== 'object') {
    return res.status(400).json({
      message: 'Weekly schedule is required and must be an object'
    });
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day in weeklySchedule) {
    if (!days.includes(day.toLowerCase())) {
      return res.status(400).json({
        message: `Invalid day: ${day}`
      });
    }

    if (!Array.isArray(weeklySchedule[day])) {
      return res.status(400).json({
        message: `Schedule for ${day} must be an array`
      });
    }

    for (const slot of weeklySchedule[day]) {
      if (!slot.startTime || !slot.endTime) {
        return res.status(400).json({
          message: `Each slot must have startTime and endTime`
        });
      }
    }
  }

  if (exceptions) {
    if (!Array.isArray(exceptions)) {
      return res.status(400).json({
        message: 'Exceptions must be an array'
      });
    }

    for (const exception of exceptions) {
      if (!exception.date || typeof exception.isAvailable !== 'boolean') {
        return res.status(400).json({
          message: 'Each exception must have date and isAvailable properties'
        });
      }
    }
  }

  next();
};

const validateDoctorProfileUpdate = (req, res, next) => {
  const {
    specialization,
    qualifications,
    experience,
    consultationFee,
    bio,
    languagesSpoken
  } = req.body;

  if (!specialization) {
    return res.status(400).json({
      message: 'Specialization is required'
    });
  }

  if (experience && typeof experience !== 'number') {
    return res.status(400).json({
      message: 'Experience must be a number'
    });
  }

  if (consultationFee && typeof consultationFee !== 'number') {
    return res.status(400).json({
      message: 'Consultation fee must be a number'
    });
  }

  if (languagesSpoken && !Array.isArray(languagesSpoken)) {
    return res.status(400).json({
      message: 'Languages spoken must be an array'
    });
  }

  next();
};

exports.validateAvailabilityQuery = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    // Check if doctor exists and is active
    const doctor = await User.findOne({
      where: {
        id: doctorId,
        role: 'doctor',
        isActive: true
      }
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Validate date
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const requestedDate = moment(date);
    if (!requestedDate.isValid()) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Check if date is in the past
    if (requestedDate.isBefore(moment().startOf('day'))) {
      return res.status(400).json({ message: 'Cannot check availability for past dates' });
    }

    // Check if date is too far in the future (e.g., more than 3 months)
    if (requestedDate.isAfter(moment().add(3, 'months'))) {
      return res.status(400).json({ 
        message: 'Cannot check availability more than 3 months in advance' 
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validatePasswordReset,
  validateAppointment,
  validateAvailabilityUpdate,
  validateDoctorProfileUpdate,
};