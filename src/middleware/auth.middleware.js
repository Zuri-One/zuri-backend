// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    req.user = user.toJSON(); // Convert to plain object
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ 
      message: error.name === 'JsonWebTokenError' ? 'Invalid token' : error.message 
    });
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!Array.isArray(roles)) {
      roles = [roles]; // Convert single role to array
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Not authorized to access this resource' 
      });
    }
    next();
  };
};

exports.requireVerified = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      message: 'Email verification required'
    });
  }
  next();
};

exports.authenticate = authenticate;
exports.authorize = authorize;