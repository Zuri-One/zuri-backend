// src/middleware/error.middleware.js
const { ValidationError, DatabaseError, UniqueConstraintError } = require('sequelize');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof ValidationError) {
    return res.status(400).json({
      message: err.errors.map(error => error.message)
    });
  }

  if (err instanceof UniqueConstraintError) {
    return res.status(400).json({
      message: 'This record already exists'
    });
  }

  if (err instanceof DatabaseError) {
    return res.status(500).json({
      message: 'Database error occurred'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;