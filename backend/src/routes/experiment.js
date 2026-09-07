const express = require('express');
const { authenticateParticipant, requireConsent } = require('../middleware/participantAuth');
const {
  startExperiment,
  getCurrentVideo,
  submitResponse,
  getProgress,
  completeExperiment
} = require('../controllers/experimentController');
const { experimentResponseValidation, validate } = require('../validators/experimentValidators');

const router = express.Router();

/**
 * Experiment Routes
 * Handles video-based experiment flow
 * All routes require authentication and consent
 */

/**
 * POST /api/experiment/start
 * Start the experiment session
 */
router.post('/start',
  authenticateParticipant,
  requireConsent,
  startExperiment
);

/**
 * GET /api/experiment/current
 * Get current video to complete
 */
router.get('/current',
  authenticateParticipant,
  requireConsent,
  getCurrentVideo
);

/**
 * POST /api/experiment/respond
 * Submit response for current video
 */
router.post('/respond',
  authenticateParticipant,
  requireConsent,
  experimentResponseValidation,
  validate,
  submitResponse
);

/**
 * GET /api/experiment/progress
 * Get current experiment progress
 */
router.get('/progress',
  authenticateParticipant,
  getProgress
);

/**
 * POST /api/experiment/complete
 * Mark experiment as complete
 */
router.post('/complete',
  authenticateParticipant,
  requireConsent,
  completeExperiment
);

module.exports = router;
