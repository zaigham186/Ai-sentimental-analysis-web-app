const express = require('express');
const responseManagementController = require('../controllers/responseManagementController');
const { extractAdminId, authenticateAdmin } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * Optional Admin Authentication Middleware
 * If admin session header/cookie is present, verifies admin.
 * If not present, still allows reading paginated responses for study evaluation / public APIs.
 */
const optionalAdminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const cookie = req.cookies?.adminSession;
    const xSession = req.headers['x-admin-session'];

    if (authHeader || cookie || xSession) {
      return authenticateAdmin(req, res, next);
    }
    next();
  } catch (err) {
    next();
  }
};

/**
 * GET /api/responses
 * Returns paginated + searchable results
 * Supports: page, limit, search, sortBy, sortOrder, condition, coded, video
 * Example: GET /api/responses?page=1&limit=10&search=name&sortBy=name
 */
router.get('/', optionalAdminAuth, responseManagementController.getAllResponses);

/**
 * GET /api/responses/stats
 * Get response statistics
 */
router.get('/stats', optionalAdminAuth, responseManagementController.getStatistics);

/**
 * GET /api/responses/:id
 * Get single response by ID
 */
router.get('/:id', optionalAdminAuth, responseManagementController.getResponseById);

module.exports = router;
