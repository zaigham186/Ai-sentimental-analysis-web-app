const express = require('express');
const participantManagementController = require('../controllers/participantManagementController');
const { authenticateAdmin, requireResearcher } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * Participant Management Routes (Admin)
 * All routes require researcher authentication
 * All routes prefixed with /api/admin/participants
 */

/**
 * GET /api/admin/participants/stats
 * Get participant statistics
 */
router.get('/stats', authenticateAdmin, requireResearcher, participantManagementController.getStatistics);

/**
 * GET /api/admin/participants
 * Get all participants with filters
 */
router.get('/', authenticateAdmin, requireResearcher, participantManagementController.getAllParticipants);

/**
 * GET /api/admin/participants/:id
 * Get single participant with details
 */
router.get('/:id', authenticateAdmin, requireResearcher, participantManagementController.getParticipantById);

/**
 * DELETE /api/admin/participants/:id
 * Delete single participant and associated data
 */
router.delete('/:id', authenticateAdmin, requireResearcher, participantManagementController.deleteParticipant);

module.exports = router;
