const mongoose = require('mongoose');
const { Participant } = require('../models');
const config = require('../config');

/**
 * Participant Authentication Middleware
 * Verifies participant session and attaches participant to request
 * CRITICAL: All participant identity derived from session, never from request body
 */

/**
 * Helper function to get cookie clear options based on environment
 */
const getClearCookieOptions = (req) => {
  const isProduction = config.nodeEnv === 'production';
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  return {
    httpOnly: true,
    secure: isProduction ? true : isSecure,
    sameSite: isProduction ? 'none' : 'lax'
  };
};

/**
 * Authenticate participant from session
 * Checks for participant session cookie and loads participant
 */
const authenticateParticipant = async (req, res, next) => {
  try {
    // Get participant ID from session cookie
    const participantId = req.cookies.participantSession;

    if (!participantId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      res.clearCookie('participantSession', getClearCookieOptions(req));
      return res.status(401).json({
        success: false,
        message: 'Invalid session'
      });
    }

    // Load participant from database
    const participant = await Participant.findById(participantId);

    if (!participant) {
      // Invalid session - clear cookie
      res.clearCookie('participantSession', getClearCookieOptions(req));
      return res.status(401).json({
        success: false,
        message: 'Invalid session'
      });
    }

    // Check if participant is withdrawn
    if (participant.status === 'withdrawn') {
      return res.status(403).json({
        success: false,
        message: 'Participation has been withdrawn'
      });
    }

    // Attach participant to request
    // DO NOT expose internal MongoDB _id in responses
    req.participant = participant;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Optional authentication
 * Loads participant if session exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const participantId = req.cookies.participantSession;

    if (participantId) {
      const participant = await Participant.findById(participantId);
      if (participant && participant.status !== 'withdrawn') {
        req.participant = participant;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Require consent
 * Ensures participant has provided consent
 */
const requireConsent = (req, res, next) => {
  if (!req.participant) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.participant.consentGiven) {
    return res.status(403).json({
      success: false,
      message: 'Consent required'
    });
  }

  next();
};

/**
 * Check if already registered
 * Prevents duplicate registration
 */
const checkExistingSession = (req, res, next) => {
  const participantId = req.cookies.participantSession;

  if (participantId) {
    return res.status(400).json({
      success: false,
      message: 'Already registered. Please clear your browser cookies to register again.'
    });
  }

  next();
};

module.exports = {
  authenticateParticipant,
  optionalAuth,
  requireConsent,
  checkExistingSession
};
