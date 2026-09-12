const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const { consentValidation, registrationValidation, validate } = require('../validators/participantValidators');
const { authenticateParticipant, checkExistingSession } = require('../middleware/participantAuth');
const rateLimit = require('express-rate-limit');

const config = require('../config');

/**
 * Participant Routes
 * Handles consent, registration, and session management
 */

// Stricter rate limiting for registration endpoints (environment-aware: 10 per 15 min in production, 1000 in test)
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 1000 : 10,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/participants/consent
 * Submit consent form
 */
router.post('/consent',
  registrationLimiter,
  consentValidation,
  validate,
  participantController.submitConsent
);

/**
 * POST /api/participants/register
 * Register new participant
 */
router.post('/register',
  registrationLimiter,
  registrationValidation,
  validate,
  participantController.registerParticipant
);

/**
 * GET /api/participants/session
 * Check session status (public)
 */
router.get('/session',
  participantController.checkSession
);

/**
 * GET /api/participants/me
 * Get current participant profile
 * Requires authentication
 */
router.get('/me',
  authenticateParticipant,
  participantController.getProfile
);

/**
 * POST /api/participants/logout
 * Logout participant
 */
router.post('/logout',
  participantController.logout
);

module.exports = router;
