const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticateAdmin, requireResearcher } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * Analytics Routes
 * Phase 11: Analytics + Research Export
 * All routes require researcher authentication
 * All routes prefixed with /api/admin/analytics
 */

/**
 * GET /api/admin/analytics/dashboard
 * Get comprehensive analytics dashboard
 */
router.get('/dashboard', authenticateAdmin, requireResearcher, analyticsController.getDashboard);

/**
 * GET /api/admin/analytics/condition-comparison
 * Get descriptive condition comparison (anonymous vs identifiable)
 */
router.get('/condition-comparison', authenticateAdmin, requireResearcher, analyticsController.getConditionComparison);

/**
 * GET /api/admin/analytics/video-responses
 * Get video/response analytics
 */
router.get('/video-responses', authenticateAdmin, requireResearcher, analyticsController.getVideoResponseAnalytics);

/**
 * GET /api/admin/analytics/coding
 * Get coding analytics
 */
router.get('/coding', authenticateAdmin, requireResearcher, analyticsController.getCodingAnalytics);

/**
 * GET /api/admin/analytics/aggression
 * Get aggression analytics
 */
router.get('/aggression', authenticateAdmin, requireResearcher, analyticsController.getAggressionAnalytics);

module.exports = router;
