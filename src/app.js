const express = require('express');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const { sequelize } = require('./models');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes/index.routes');
const errorHandler = require('./middleware/error.middleware');
const billingController = require('./controllers/billing.controller');

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

// Create uploads directory for receipts (async)
(async () => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const uploadsDir = path.join(publicDir, 'uploads', 'receipts');
    
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory ready');
  } catch (err) {
    console.error('❌ Error creating uploads directory:', err);
  }
})();

// Set up static file serving
app.use(express.static(path.join(__dirname, '..', 'public')));

// Set up billing controller static routes
billingController.setupStaticRoutes(app);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Zuri Health HMS API Documentation"
}));

// Test endpoint for WhatsApp (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/v1/test-whatsapp', billingController.testWhatsAppReceipt);
}

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