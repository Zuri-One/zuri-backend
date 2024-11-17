// src/app.js
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

require('events').EventEmitter.defaultMaxListeners = 15;

const { connectDB } = require('./config/database');
const routes = require('./routes/index.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Connect to PostgreSQL
connectDB();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'
    : process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/', routes); // Landing page
app.use('/api', routes); // API routes

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

// Error handling
app.use(errorHandler);

module.exports = app;