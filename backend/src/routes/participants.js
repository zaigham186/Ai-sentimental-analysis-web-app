const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const { consentValidation, registrationValidation, validate } = require('../validators/participantValidators');
const { authenticateParticipant, checkExistingSession } = require('../middleware/participantAuth');
const rateLimit = require('express-rate-limit');

/**
 * Participant Routes
 * Handles consent, registration, and session management
 */

// Stricter rate limiting for registration endpoints
// TEMPORARILY DISABLED FOR TESTING - RE-ENABLE FOR PRODUCTION!
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for testing (was 5)
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.'
  }
});

/**
 * POST /api/participants/consent
 * Submit consent form
 */
router.post('/consent',
  // registrationLimiter, // DISABLED FOR TESTING
  // checkExistingSession, // DISABLED FOR TESTING
  consentValidation,
  validate,
  participantController.submitConsent
);

/**
 * POST /api/participants/register
 * Register new participant
 */
router.post('/register',
  // registrationLimiter, // DISABLED FOR TESTING
  // checkExistingSession, // DISABLED FOR TESTING
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
