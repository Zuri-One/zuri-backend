const express = require('express');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');

const routes = require('./routes/index.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
 origin: '*',
 methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
 credentials: true,
 optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
 res.status(200).json({
   status: 'healthy',
   timestamp: new Date(),
   uptime: process.uptime(),
   dbConnection: sequelize.authenticate()
     .then(() => 'connected')
     .catch(() => 'disconnected')
 });
});

// Routes
app.use('/', routes);
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
 res.status(404).json({
   message: 'Route not found'
 });
});

// Error handling
app.use(errorHandler);

module.exports = app;