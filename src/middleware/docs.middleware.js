// src/middleware/docs.middleware.js
const express = require('express');
const path = require('path');
const fs = require('fs');

/**
 * Middleware to serve Docusaurus documentation
 * Serves the built documentation at /docs path
 */
const serveDocumentation = () => {
  const router = express.Router();
  
  // Path to the built Docusaurus site
  const docsPath = path.join(__dirname, '../../docs/build');
  
  // Check if documentation build exists
  if (!fs.existsSync(docsPath)) {
    console.warn('Documentation build not found. Run "npm run build:docs" to build documentation.');
    
    // Return middleware that shows build instructions
    return (req, res, next) => {
      if (req.path.startsWith('/docs')) {
        return res.status(404).json({
          success: false,
          message: 'Documentation not available',
          error: {
            code: 'DOCS_NOT_BUILT',
            details: 'Documentation needs to be built. Run "npm run build:docs" to build the documentation.',
            instructions: [
              'cd docs',
              'npm install',
              'npm run build',
              'Restart the server'
            ]
          }
        });
      }
      next();
    };
  }
  
  // Serve static files from the build directory
  router.use('/docs', express.static(docsPath, {
    index: 'index.html',
    setHeaders: (res, path) => {
      // Set appropriate headers for different file types
      if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      } else if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
      
      // Set cache headers for static assets
      if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for HTML
      }
    }
  }));
  
  // Handle client-side routing for Docusaurus
  router.get('/docs/*', (req, res, next) => {
    const filePath = path.join(docsPath, req.path.replace('/docs', ''));
    
    // If file exists, serve it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return next();
    }
    
    // Otherwise, serve index.html for client-side routing
    res.sendFile(path.join(docsPath, 'index.html'));
  });
  
  return router;
};

/**
 * Development middleware to proxy to Docusaurus dev server
 * Only used in development mode
 */
const proxyDocsDev = () => {
  if (process.env.NODE_ENV !== 'development') {
    return (req, res, next) => next();
  }
  
  const { createProxyMiddleware } = require('http-proxy-middleware');
  
  return createProxyMiddleware('/docs', {
    target: 'http://localhost:3001', // Docusaurus dev server port
    changeOrigin: true,
    pathRewrite: {
      '^/docs': '', // Remove /docs prefix when proxying
    },
    onError: (err, req, res) => {
      console.error('Documentation proxy error:', err.message);
      res.status(503).json({
        success: false,
        message: 'Documentation service unavailable',
        error: {
          code: 'DOCS_SERVICE_UNAVAILABLE',
          details: 'Documentation development server is not running. Start it with "cd docs && npm start"'
        }
      });
    }
  });
};

/**
 * Middleware to add documentation links to API responses
 */
const addDocsLinks = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add documentation links to successful responses
    if (data && data.success !== false && req.path.startsWith('/api/v1')) {
      data._links = {
        documentation: `${req.protocol}://${req.get('host')}/docs`,
        apiReference: `${req.protocol}://${req.get('host')}/docs/api/overview`,
        swagger: `${req.protocol}://${req.get('host')}/api-docs`
      };
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Health check endpoint for documentation
 */
const docsHealthCheck = (req, res) => {
  const docsPath = path.join(__dirname, '../../docs/build');
  const isBuilt = fs.existsSync(docsPath);
  const indexExists = fs.existsSync(path.join(docsPath, 'index.html'));
  
  res.json({
    success: true,
    service: 'documentation',
    status: isBuilt && indexExists ? 'healthy' : 'unavailable',
    details: {
      built: isBuilt,
      indexExists: indexExists,
      path: '/docs',
      buildPath: docsPath
    },
    links: {
      documentation: `${req.protocol}://${req.get('host')}/docs`,
      apiReference: `${req.protocol}://${req.get('host')}/docs/api/overview`,
      swagger: `${req.protocol}://${req.get('host')}/api-docs`
    }
  });
};

module.exports = {
  serveDocumentation,
  proxyDocsDev,
  addDocsLinks,
  docsHealthCheck
};