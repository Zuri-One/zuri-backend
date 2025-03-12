// src/routes/v1/icd.route.js
const express = require('express');
const router = express.Router();
const {
  searchICD,
  getICDEntity,
  clearCache,
  debugICD
} = require('../../controllers/icd.controller');

/**
 * @swagger
 * tags:
 *   name: ICD
 *   description: International Classification of Diseases (ICD) API endpoints
 */

/**
 * @swagger
 * /api/v1/icd/search:
 *   get:
 *     summary: Search ICD codes or diseases
 *     tags: [ICD]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (code or disease name)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: en
 *         description: Language code (e.g., en, fr, es)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [simple, detailed]
 *           default: detailed
 *         description: Response format (simple or detailed)
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Entity ID
 *                       code:
 *                         type: string
 *                         description: ICD code
 *                       title:
 *                         type: string
 *                         description: Disease name/title
 *                 meta:
 *                   type: object
 *                   properties:
 *                     source:
 *                       type: string
 *                       enum: [cache, api]
 *                     query:
 *                       type: string
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 */
router.get('/search', searchICD);

/**
 * @swagger
 * /api/v1/icd/entity/{codeOrUri}:
 *   get:
 *     summary: Get ICD entity details by code or URI
 *     tags: [ICD]
 *     parameters:
 *       - in: path
 *         name: codeOrUri
 *         required: true
 *         schema:
 *           type: string
 *         description: ICD code or entity URI
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: en
 *         description: Language code (e.g., en, fr, es)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [simple, detailed]
 *           default: detailed
 *         description: Response format (simple or detailed)
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     title:
 *                       type: string
 *                     definition:
 *                       type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     source:
 *                       type: string
 *                       enum: [cache, api]
 *                     codeOrUri:
 *                       type: string
 */
router.get('/entity/:codeOrUri', getICDEntity);

/**
 * @swagger
 * /api/v1/icd/cache/clear:
 *   post:
 *     summary: Clear ICD API cache
 *     tags: [ICD]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [token, search, entity]
 *         description: Type of cache to clear (all if not specified)
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/cache/clear', clearCache);


// Only available in development environment
if (process.env.NODE_ENV === 'development') {
  /**
   * @swagger
   * /api/v1/icd/debug:
   *   get:
   *     summary: Debug ICD API (Development Only)
   *     tags: [ICD]
   *     responses:
   *       200:
   *         description: Debug information
   *       403:
   *         description: Not available in production
   */
  router.get('/debug', debugICD);
}

module.exports = router;