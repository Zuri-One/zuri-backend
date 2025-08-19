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
const { serveDocumentation, addDocsLinks, docsHealthCheck } = require('./middleware/docs.middleware');

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
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

// Documentation middleware - add links to API responses
app.use(addDocsLinks);

// Serve Docusaurus documentation at /docs
app.use(serveDocumentation());

// Documentation health check
app.get('/docs-health', docsHealthCheck);

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
app.get('/health', async (req, res) => {
 try {
   await sequelize.authenticate();
   res.status(200).json({
     status: 'healthy',
     timestamp: new Date(),
     uptime: process.uptime(),
     services: {
       database: 'connected',
       documentation: 'available'
     },
     links: {
       documentation: `${req.protocol}://${req.get('host')}/docs`,
       apiDocs: `${req.protocol}://${req.get('host')}/api-docs`,
       docsHealth: `${req.protocol}://${req.get('host')}/docs-health`
     }
   });
 } catch (error) {
   res.status(503).json({
     status: 'unhealthy',
     timestamp: new Date(),
     uptime: process.uptime(),
     services: {
       database: 'disconnected',
       documentation: 'available'
     },
     error: error.message
   });
 }
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