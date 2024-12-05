const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Base authentication middleware
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      where: { id: decoded.id, isActive: true },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code', 'type']
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Role-based authorization middleware
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    next();
  };
};

// Permission-based authorization middleware
exports.hasPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    // Admin and hospital admin have all permissions
    if (['ADMIN', 'HOSPITAL_ADMIN'].includes(req.user.role)) {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

// Department-based authorization
exports.inDepartment = (departmentTypes) => {
  return (req, res, next) => {
    if (!req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'No department association'
      });
    }

    if (!departmentTypes.includes(req.user.department.type)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized department access'
      });
    }
    next();
  };
};
