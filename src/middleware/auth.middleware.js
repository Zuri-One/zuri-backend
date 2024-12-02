const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Base authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { 
        exclude: ['password'],
        include: ['role', 'permissions', 'department', 'status'] 
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive || user.status !== 'active') {
      return res.status(401).json({ message: 'Account is inactive or suspended' });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    req.user = user.toJSON();
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ 
      message: error.name === 'JsonWebTokenError' ? 'Invalid token' : error.message 
    });
  }
};

// Role-based authorization middleware
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Not authorized to access this resource' 
      });
    }
    next();
  };
};

// Permission-based authorization middleware
const hasPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!Array.isArray(requiredPermissions)) {
      requiredPermissions = [requiredPermissions];
    }

    // Admin and hospital_admin have all permissions
    if (['admin', 'hospital_admin'].includes(req.user.role)) {
      return next();
    }

    const userPermissions = User.rolePermissions[req.user.role] || [];
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({ 
        message: 'Insufficient permissions to access this resource' 
      });
    }

    next();
  };
};

// Department-based authorization
const inDepartment = (departments) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!Array.isArray(departments)) {
      departments = [departments];
    }

    if (!departments.includes(req.user.department)) {
      return res.status(403).json({ 
        message: 'Not authorized to access resources from this department' 
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  hasPermission,
  inDepartment
};