const express = require('express');
const router = express.Router();
const labTestCatalogController = require('../../controllers/lab-test-catalog.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Base route: /api/v1/lab-test-catalog

/**
 * @swagger
 * /api/v1/lab-test-catalog/tests:
 *   get:
 *     summary: Get all available lab tests
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search tests by name or description
 *     responses:
 *       200:
 *         description: Tests retrieved successfully
 */
router.get('/tests', authenticate, labTestCatalogController.getAllTests);

/**
 * @swagger
 * /api/v1/lab-test-catalog/tests/selection:
 *   get:
 *     summary: Get tests formatted for frontend selection/dropdown
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tests for selection retrieved successfully
 */
router.get('/tests/selection', authenticate, labTestCatalogController.getTestsForSelection);

/**
 * @swagger
 * /api/v1/lab-test-catalog/tests/{id}:
 *   get:
 *     summary: Get a specific test by ID
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test retrieved successfully
 *       404:
 *         description: Test not found
 */
router.get('/tests/:id', authenticate, labTestCatalogController.getTestById);

/**
 * @swagger
 * /api/v1/lab-test-catalog/tests:
 *   post:
 *     summary: Add a new test to the catalog
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - displayName
 *               - category
 *               - sampleType
 *               - parameters
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               sampleType:
 *                 type: string
 *               sampleVolume:
 *                 type: string
 *               container:
 *                 type: string
 *               collectionMethods:
 *                 type: array
 *                 items:
 *                   type: string
 *               fastingRequired:
 *                 type: boolean
 *               fastingHours:
 *                 type: integer
 *               turnaroundTime:
 *                 type: string
 *               price:
 *                 type: number
 *               active:
 *                 type: boolean
 *               parameters:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Test added successfully
 *       409:
 *         description: Test already exists
 */
router.post('/tests', 
  authenticate, 
  // authorize(['ADMIN', 'LAB_MANAGER']), 
  labTestCatalogController.addTest
);

/**
 * @swagger
 * /api/v1/lab-test-catalog/tests/{id}:
 *   put:
 *     summary: Update an existing test
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Test updated successfully
 *       404:
 *         description: Test not found
 */
router.put('/tests/:id', 
  authenticate, 
  // authorize(['ADMIN', 'LAB_MANAGER']), 
  labTestCatalogController.updateTest
);

/**
 * @swagger
 * /api/v1/lab-test-catalog/tests/{id}:
 *   delete:
 *     summary: Deactivate a test (soft delete)
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test deactivated successfully
 *       404:
 *         description: Test not found
 */
router.delete('/tests/:id', 
  authenticate, 
  // authorize(['ADMIN', 'LAB_MANAGER']), 
  labTestCatalogController.deleteTest
);

/**
 * @swagger
 * /api/v1/lab-test-catalog/tests/{id}/permanent:
 *   delete:
 *     summary: Permanently remove a test
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test permanently removed
 *       404:
 *         description: Test not found
 */
router.delete('/tests/:id/permanent', 
  authenticate, 
  // authorize(['ADMIN']), 
  labTestCatalogController.removeTest
);

/**
 * @swagger
 * /api/v1/lab-test-catalog/categories:
 *   get:
 *     summary: Get all test categories
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', authenticate, labTestCatalogController.getCategories);

/**
 * @swagger
 * /api/v1/lab-test-catalog/categories:
 *   post:
 *     summary: Add a new test category
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category added successfully
 *       409:
 *         description: Category already exists
 */
router.post('/categories', 
  authenticate, 
  // authorize(['ADMIN', 'LAB_MANAGER']), 
  labTestCatalogController.addCategory
);

/**
 * @swagger
 * /api/v1/lab-test-catalog/search:
 *   get:
 *     summary: Search tests by name or description
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query is required
 */
router.get('/search', authenticate, labTestCatalogController.searchTests);

/**
 * @swagger
 * /api/v1/lab-test-catalog/statistics:
 *   get:
 *     summary: Get catalog statistics
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics', 
  authenticate, 
  // authorize(['ADMIN', 'LAB_MANAGER']), 
  labTestCatalogController.getStatistics
);

/**
 * @swagger
 * /api/v1/lab-test-catalog/export:
 *   get:
 *     summary: Export the entire test catalog
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Catalog exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/export', 
  authenticate, 
  // authorize(['ADMIN', 'LAB_MANAGER']), 
  labTestCatalogController.exportCatalog
);

/**
 * @swagger
 * /api/v1/lab-test-catalog/import:
 *   post:
 *     summary: Import a test catalog
 *     tags: [Lab Test Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Catalog imported successfully
 *       400:
 *         description: Invalid catalog format
 */
router.post('/import', 
  authenticate, 
  // authorize(['ADMIN']), 
  labTestCatalogController.importCatalog
);

module.exports = router;