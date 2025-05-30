const labTestCatalogService = require('../services/lab-test-catalog.service');

const labTestCatalogController = {
  /**
   * Get all available tests
   * @route GET /api/v1/lab-test-catalog/tests
   */
  getAllTests: async (req, res, next) => {
    try {
      const { active, category, search } = req.query;
      
      let tests;
      
      if (search) {
        tests = await labTestCatalogService.searchTests(search);
      } else if (category) {
        tests = await labTestCatalogService.getTestsByCategory(category);
      } else if (active === 'true') {
        tests = await labTestCatalogService.getActiveTests();
      } else {
        tests = await labTestCatalogService.getAllTests();
      }

      // Filter by active status if specified
      if (active !== undefined && !search && !category) {
        tests = tests.filter(test => test.active === (active === 'true'));
      }

      res.json({
        success: true,
        count: tests.length,
        tests
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get test by ID
   * @route GET /api/v1/lab-test-catalog/tests/:id
   */
  getTestById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const test = await labTestCatalogService.getTestById(id);

      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }

      res.json({
        success: true,
        test
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all categories
   * @route GET /api/v1/lab-test-catalog/categories
   */
  getCategories: async (req, res, next) => {
    try {
      const categories = await labTestCatalogService.getCategories();

      res.json({
        success: true,
        categories
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add new test
   * @route POST /api/v1/lab-test-catalog/tests
   */
  addTest: async (req, res, next) => {
    try {
      const testData = req.body;
      const newTest = await labTestCatalogService.addTest(testData);

      res.status(201).json({
        success: true,
        message: 'Test added successfully',
        test: newTest
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * Update test
   * @route PUT /api/v1/lab-test-catalog/tests/:id
   */
  updateTest: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedTest = await labTestCatalogService.updateTest(id, updateData);

      res.json({
        success: true,
        message: 'Test updated successfully',
        test: updatedTest
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * Delete test (soft delete)
   * @route DELETE /api/v1/lab-test-catalog/tests/:id
   */
  deleteTest: async (req, res, next) => {
    try {
      const { id } = req.params;
      await labTestCatalogService.deleteTest(id);

      res.json({
        success: true,
        message: 'Test deactivated successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * Permanently remove test
   * @route DELETE /api/v1/lab-test-catalog/tests/:id/permanent
   */
  removeTest: async (req, res, next) => {
    try {
      const { id } = req.params;
      await labTestCatalogService.removeTest(id);

      res.json({
        success: true,
        message: 'Test permanently removed'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * Add category
   * @route POST /api/v1/lab-test-catalog/categories
   */
  addCategory: async (req, res, next) => {
    try {
      const { id, name, description } = req.body;
      
      if (!id || !name) {
        return res.status(400).json({
          success: false,
          message: 'Category ID and name are required'
        });
      }

      const categoryData = { name, description };
      const newCategory = await labTestCatalogService.addCategory(id, categoryData);

      res.status(201).json({
        success: true,
        message: 'Category added successfully',
        category: { id, ...newCategory }
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  },

/**
  * Get test statistics
  * @route GET /api/v1/lab-test-catalog/statistics
  */
getStatistics: async (req, res, next) => {
    try {
      const stats = await labTestCatalogService.getTestStatistics();
 
      res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      next(error);
    }
  },
 
  /**
   * Export catalog
   * @route GET /api/v1/lab-test-catalog/export
   */
  exportCatalog: async (req, res, next) => {
    try {
      const catalog = await labTestCatalogService.exportCatalog();
 
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="lab-test-catalog.json"');
      
      res.json(catalog);
    } catch (error) {
      next(error);
    }
  },
 
  /**
   * Import catalog
   * @route POST /api/v1/lab-test-catalog/import
   */
  importCatalog: async (req, res, next) => {
    try {
      const catalogData = req.body;
      const importedCatalog = await labTestCatalogService.importCatalog(catalogData);
 
      res.json({
        success: true,
        message: 'Catalog imported successfully',
        catalog: importedCatalog
      });
    } catch (error) {
      if (error.message.includes('Invalid catalog format')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  },
 
  /**
   * Search tests
   * @route GET /api/v1/lab-test-catalog/search
   */
  searchTests: async (req, res, next) => {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }
 
      const tests = await labTestCatalogService.searchTests(q);
 
      res.json({
        success: true,
        query: q,
        count: tests.length,
        tests
      });
    } catch (error) {
      next(error);
    }
  },
 
  /**
   * Get tests for dropdown/selection
   * @route GET /api/v1/lab-test-catalog/tests/selection
   */
  getTestsForSelection: async (req, res, next) => {
    try {
      const tests = await labTestCatalogService.getActiveTests();
      
      // Format for frontend dropdown/selection
      const formattedTests = tests.map(test => ({
        id: test.id,
        name: test.name,
        displayName: test.displayName,
        category: test.category,
        price: test.price,
        fastingRequired: test.fastingRequired,
        sampleType: test.sampleType,
        turnaroundTime: test.turnaroundTime
      }));
 
      res.json({
        success: true,
        count: formattedTests.length,
        tests: formattedTests
      });
    } catch (error) {
      next(error);
    }
  }
 };
 
 module.exports = labTestCatalogController;