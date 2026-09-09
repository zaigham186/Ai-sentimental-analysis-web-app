const express = require('express');
const responseManagementController = require('../controllers/responseManagementController');
const { authenticateAdmin, requireResearcher } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * Response Management Routes (Admin)
 * All routes require researcher authentication
 * All routes prefixed with /api/admin/responses
 */

/**
 * GET /api/admin/responses/stats
 * Get response statistics
 */
router.get('/stats', authenticateAdmin, requireResearcher, responseManagementController.getStatistics);

/**
 * GET /api/admin/responses
 * Get all responses with filters
 */
router.get('/', authenticateAdmin, requireResearcher, responseManagementController.getAllResponses);

/**
 * GET /api/admin/responses/:id
 * Get single response with details
 */
router.get('/:id', authenticateAdmin, requireResearcher, responseManagementController.getResponseById);

module.exports = router;
