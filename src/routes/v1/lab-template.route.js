// src/routes/v1/lab-template.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, hasPermission } = require('../../middleware/auth.middleware');
const labTemplateController = require('../../controllers/lab-template.controller');

// Apply authentication to all routes
router.use(authenticate);

// Create template - only lab supervisors and admins
router.post(
  '/',
  authorize(['lab_technician', 'admin']),
  hasPermission(['manage_lab_templates']),
  labTemplateController.createTemplate
);

// Get all templates
router.get(
  '/',
  authorize(['doctor', 'lab_technician', 'admin']),
  labTemplateController.getTemplates
);

// Get specific template
router.get(
  '/:id',
  authorize(['doctor', 'lab_technician', 'admin']),
  labTemplateController.getTemplateById
);

// Update template
router.put(
  '/:id',
  authorize(['lab_technician', 'admin']),
  hasPermission(['manage_lab_templates']),
  labTemplateController.updateTemplate
);

// Delete template
router.delete(
  '/:id',
  authorize(['lab_technician', 'admin']),
  hasPermission(['manage_lab_templates']),
  labTemplateController.deleteTemplate
);

module.exports = router;