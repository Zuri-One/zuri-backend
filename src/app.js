// src/app.js
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

require('events').EventEmitter.defaultMaxListeners = 15;

const connectDB = require('./config/database');
const routes = require('./routes/index.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Routes
app.use('/', routes); // Landing page
app.use('/api', routes); // API routes

// Error handling
app.use(errorHandler);

module.exports = app;