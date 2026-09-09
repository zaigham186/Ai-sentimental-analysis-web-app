const express = require('express');
const videoController = require('../controllers/videoController');
const { authenticateAdmin, requireResearcher } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * Video Management Routes
 * Phase 9: Video Stimulus Management
 * All routes require admin authentication
 * Prefix: /api/admin/videos
 */

/**
 * GET /api/admin/videos/stats
 * Get video statistics
 * Requires researcher role or higher
 */
router.get('/stats', authenticateAdmin, requireResearcher, videoController.getStatistics);

/**
 * GET /api/admin/videos/validate-set
 * Validate stimulus set (exactly 10 approved active videos)
 * Requires researcher role or higher
 */
router.get('/validate-set', authenticateAdmin, requireResearcher, videoController.validateStimulusSet);

/**
 * GET /api/admin/videos
 * Get all videos with optional filtering
 * Query params: status, active, search
 * Requires researcher role or higher
 */
router.get('/', authenticateAdmin, requireResearcher, videoController.getAllVideos);

/**
 * GET /api/admin/videos/:id
 * Get single video by ID
 * Requires researcher role or higher
 */
router.get('/:id', authenticateAdmin, requireResearcher, videoController.getVideoById);

/**
 * POST /api/admin/videos
 * Create new video
 * Requires researcher role or higher
 */
router.post('/', authenticateAdmin, requireResearcher, videoController.createVideo);

/**
 * PUT /api/admin/videos/:id
 * Update video
 * Requires researcher role or higher
 */
router.put('/:id', authenticateAdmin, requireResearcher, videoController.updateVideo);

/**
 * DELETE /api/admin/videos/:id
 * Delete video (only if no participant responses)
 * Requires researcher role or higher
 */
router.delete('/:id', authenticateAdmin, requireResearcher, videoController.deleteVideo);

/**
 * POST /api/admin/videos/:id/approve
 * Approve video for use in experiment
 * Requires researcher role or higher
 */
router.post('/:id/approve', authenticateAdmin, requireResearcher, videoController.approveVideo);

/**
 * POST /api/admin/videos/:id/reject
 * Reject video (requires notes)
 * Requires researcher role or higher
 */
router.post('/:id/reject', authenticateAdmin, requireResearcher, videoController.rejectVideo);

module.exports = router;
