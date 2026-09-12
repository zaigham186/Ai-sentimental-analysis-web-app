const express = require('express');
const codingController = require('../controllers/codingController');
const { authenticateAdmin, requireResearcher } = require('../middleware/adminAuth');
const { nlpLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * Coding Routes
 * Phase 10: Response Coding System + Phase 10 Enhancement: AI-Assisted Coding
 * All routes require researcher authentication
 * All routes prefixed with /api/admin/coding
 */

/**
 * GET /api/admin/coding/stats
 * Get coding statistics
 * NOTE: Must come before /responses/:id to avoid route conflict
 */
router.get('/stats', authenticateAdmin, requireResearcher, codingController.getStatistics);

/**
 * GET /api/admin/coding/validation-status
 * Get research NLP validation and calibration status
 * Phase 6: Research Validation & Calibration
 * NOTE: Must come before /responses/:id to avoid route conflict
 */
router.get('/validation-status', authenticateAdmin, requireResearcher, codingController.getValidationStatus);

/**
 * GET /api/admin/coding/config
 * Get coding configuration/categories
 * NOTE: Must come before /responses/:id to avoid route conflict
 */
router.get('/config', authenticateAdmin, requireResearcher, codingController.getConfig);

/**
 * GET /api/admin/coding/pending-review
 * Get responses with pending AI review
 * Phase 10 Enhancement: AI-Assisted Coding
 * NOTE: Must come before /:id routes to avoid conflict
 */
router.get('/pending-review', authenticateAdmin, requireResearcher, codingController.getPendingReview);

/**
 * GET /api/admin/coding/responses
 * Get all responses with coding status
 * Query params: coded, condition, video, search, page, limit
 */
router.get('/responses', authenticateAdmin, requireResearcher, codingController.getAllResponses);

/**
 * GET /api/admin/coding/responses/:id
 * Get single response with coding details
 */
router.get('/responses/:id', authenticateAdmin, requireResearcher, codingController.getResponseById);

/**
 * POST /api/admin/coding/bulk-analyze
 * Bulk AI analysis of multiple responses
 * Hardened with nlpLimiter for resource protection
 * Phase 10 Enhancement: AI-Assisted Coding
 */
router.post('/bulk-analyze', authenticateAdmin, requireResearcher, nlpLimiter, codingController.bulkAnalyze);

/**
 * POST /api/admin/coding/:id/analyze
 * Trigger AI analysis for a response
 * Hardened with nlpLimiter for resource protection
 * Phase 10 Enhancement: AI-Assisted Coding
 */
router.post('/:id/analyze', authenticateAdmin, requireResearcher, nlpLimiter, codingController.analyzeWithAI);

/**
 * POST /api/admin/coding/:id/review
 * Human review of AI suggestion (accept/modify/reject)
 * Phase 10 Enhancement: AI-Assisted Coding
 */
router.post('/:id/review', authenticateAdmin, requireResearcher, codingController.reviewAISuggestion);

/**
 * POST /api/admin/coding
 * Create coding for a response
 */
router.post('/', authenticateAdmin, requireResearcher, codingController.createCoding);

/**
 * PUT /api/admin/coding/:id
 * Update existing coding
 */
router.put('/:id', authenticateAdmin, requireResearcher, codingController.updateCoding);

/**
 * DELETE /api/admin/coding/:id
 * Delete coding record
 */
router.delete('/:id', authenticateAdmin, requireResearcher, codingController.deleteCoding);

module.exports = router;
