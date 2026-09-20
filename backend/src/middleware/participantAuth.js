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
 * Helper to extract participant session identifier from cookie or headers
 * Supports cross-domain environments where third-party cookies may be blocked
 */
const extractParticipantId = (req) => {
  // 1. Check cookies (direct or same-origin)
  if (req.cookies && req.cookies.participantSession) {
    return req.cookies.participantSession;
  }

  // 2. Check Authorization header: Bearer <token>
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 3. Check custom headers
  if (req.headers['x-participant-session'] && typeof req.headers['x-participant-session'] === 'string') {
    return req.headers['x-participant-session'].trim();
  }
  if (req.headers['x-session-token'] && typeof req.headers['x-session-token'] === 'string') {
    return req.headers['x-session-token'].trim();
  }

  return null;
};

/**
 * Authenticate participant from session
 * Checks for participant session cookie or authorization header and loads participant
 */
const authenticateParticipant = async (req, res, next) => {
  try {
    // Get participant ID from session cookie or header
    const participantId = extractParticipantId(req);

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
    const participantId = extractParticipantId(req);

    if (participantId && mongoose.Types.ObjectId.isValid(participantId)) {
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
  const participantId = extractParticipantId(req);

  if (participantId && mongoose.Types.ObjectId.isValid(participantId)) {
    return res.status(400).json({
      success: false,
      message: 'Already registered. Please clear your browser cookies to register again.'
    });
  }

  next();
};

module.exports = {
  extractParticipantId,
  authenticateParticipant,
  optionalAuth,
  requireConsent,
  checkExistingSession
};
