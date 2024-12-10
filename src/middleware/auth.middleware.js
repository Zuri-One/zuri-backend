const jwt = require('jsonwebtoken');
const { User, Department } = require('../models');

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
    console.log('Decoded token:', decoded);

    // Remove Department includes since the table doesn't exist
    const user = await User.findOne({
      where: { id: decoded.id, isActive: true }
    });

    if (!user) {
      console.log('User not found for id:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Get role-based permissions from User model
    const rolePermissions = User.rolePermissions[req.user.role] || [];
    
    // Get custom permissions from user object
    let customPermissions = [];
    if (req.user.permissions) {
      customPermissions = Array.isArray(req.user.permissions) 
        ? req.user.permissions 
        : Object.keys(req.user.permissions);
    }

    // Combine role-based and custom permissions
    const allUserPermissions = [...new Set([...rolePermissions, ...customPermissions])];

    // Check if user has all required permissions
    const hasPermission = requiredPermissions.every(
      permission => allUserPermissions.includes(permission)
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
    // // Check both department associations
    // const assignedDept = req.user.assignedDepartment;
    // const primaryDept = req.user.primaryDepartment;

    // if (!assignedDept && !primaryDept) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'No department association'
    //   });
    // }

    // // Check if either department matches the required types
    // const deptTypes = [
    //   assignedDept?.type,
    //   primaryDept?.type
    // ].filter(Boolean);

    // if (!deptTypes.some(type => departmentTypes.includes(type))) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized department access'
    //   });
    // }
    // next();
  };
};
