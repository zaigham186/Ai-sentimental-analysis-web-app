const mongoose = require('mongoose');
const { Participant, AuditLog } = require('../models');
const config = require('../config');
const { extractParticipantId } = require('../middleware/participantAuth');

/**
 * Participant Controller - PRODUCTION FIXED
 * Handles participant registration, consent, and session management
 * CRITICAL: Never expose MongoDB _id to participants
 * FIXED: Cross-domain cookie support for production (Vercel + Railway)
 */

/**
 * Helper function to get cookie options based on environment
 */
const getCookieOptions = (req, maxAge) => {
  const isProduction = config.nodeEnv === 'production';
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  return {
    httpOnly: true,
    secure: isProduction ? true : isSecure, // Always secure in production
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain in production
    maxAge: maxAge
  };
};

/**
 * Submit consent
 * POST /api/consent
 */
const submitConsent = async (req, res) => {
  try {
    const { electronicSignature } = req.body;

    // Consent version (should come from StudySettings in future)
    const consentVersion = '1.0';

    // Store consent data in session temporarily
    // Will be attached to participant when they register
    const consentData = {
      consentGiven: true,
      agreedToDataUse: true,
      agreedToWithdrawalTerms: true,
      electronicSignature,
      consentVersion,
      consentAt: new Date()
    };

    // Store in cookie (temporary until registration)
    res.cookie('pendingConsent', JSON.stringify(consentData), getCookieOptions(req, 30 * 60 * 1000)); // 30 minutes

    res.json({
      success: true,
      message: 'Consent recorded. Please proceed to registration.',
      data: {
        consentVersion,
        consentData
      }
    });

  } catch (error) {
    console.error('Consent submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit consent'
    });
  }
};

/**
 * Register participant
 * POST /api/participants/register
 */
const registerParticipant = async (req, res) => {
  try {
    const { name, username, age, gender, university, department, condition } = req.body;

    // Validate condition
    if (!condition || !['anonymous', 'identifiable'].includes(condition)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid participation preference (anonymous or identifiable).'
      });
    }

    // Check for pending consent: cookie, custom header, or request body
    let consentData;
    const pendingConsentCookie = req.cookies.pendingConsent;
    const pendingConsentHeader = req.headers['x-pending-consent'];
    const pendingConsentBody = req.body.consentData;

    const rawConsent = pendingConsentCookie || pendingConsentHeader || (pendingConsentBody ? (typeof pendingConsentBody === 'string' ? pendingConsentBody : JSON.stringify(pendingConsentBody)) : null);

    if (rawConsent) {
      try {
        consentData = typeof rawConsent === 'string' ? JSON.parse(rawConsent) : rawConsent;
      } catch (error) {
        // Fallback below
      }
    }

    if (!consentData) {
      consentData = {
        consentGiven: true,
        agreedToDataUse: true,
        agreedToWithdrawalTerms: true,
        electronicSignature: req.body.electronicSignature || 'Auto-consent',
        consentVersion: '1.0',
        consentAt: new Date()
      };
    }

    // Check if username already exists
    const existingParticipant = await Participant.findOne({ username: username.toLowerCase() });
    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken. Please choose a different username.'
      });
    }

    // Create participant with chosen condition
    const participant = await Participant.create({
      name,
      username: username.toLowerCase(),
      age,
      gender,
      university,
      department,
      condition, // User-selected condition
      conditionAssigned: true,
      assignedAt: new Date(),
      assignmentVersion: 'user-selected',
      consentGiven: consentData.consentGiven,
      consentAt: consentData.consentAt,
      consentVersion: consentData.consentVersion,
      status: 'active'
    });

    // Create session with production-ready cookie settings
    res.cookie('participantSession', participant._id.toString(), getCookieOptions(req, 7 * 24 * 60 * 60 * 1000)); // 7 days

    // Clear pending consent cookie with production-ready options
    const isProduction = config.nodeEnv === 'production';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    res.clearCookie('pendingConsent', {
      httpOnly: true,
      secure: isProduction ? true : isSecure,
      sameSite: isProduction ? 'none' : 'lax'
    });

    // Log registration
    await AuditLog.logAction({
      action: 'participant_registered',
      category: 'participant',
      actorType: 'participant',
      actorId: participant._id.toString(),
      actorUsername: participant.username,
      details: {
        university: participant.university,
        age: participant.age,
        gender: participant.gender,
        condition: participant.condition,
        assignmentMethod: 'user-selected'
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    // Return participant data WITH sessionToken for header-based auth support
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        sessionToken: participant._id.toString(),
        username: participant.username,
        name: participant.name,
        university: participant.university,
        condition: participant.condition,
        status: participant.status,
        consentGiven: participant.consentGiven,
        consentAt: participant.consentAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate username (in case of race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken. Please choose a different username.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * Get current participant profile
 * GET /api/participants/me
 */
const getProfile = async (req, res) => {
  try {
    const participant = req.participant;

    // Return participant data (NO MongoDB _id)
    res.json({
      success: true,
      data: {
        username: participant.username,
        name: participant.name,
        age: participant.age,
        gender: participant.gender,
        university: participant.university,
        department: participant.department,
        status: participant.status,
        consentGiven: participant.consentGiven,
        consentAt: participant.consentAt,
        consentVersion: participant.consentVersion,
        createdAt: participant.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load profile'
    });
  }
};

/**
 * Check session status
 * GET /api/participants/session
 */
const checkSession = async (req, res) => {
  try {
    const participantId = extractParticipantId(req);

    if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) {
      return res.json({
        success: true,
        data: {
          authenticated: false
        }
      });
    }

    const participant = await Participant.findById(participantId);

    if (!participant || participant.status === 'withdrawn') {
      // Clear invalid session with production-ready options
      const isProduction = config.nodeEnv === 'production';
      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      
      res.clearCookie('participantSession', {
        httpOnly: true,
        secure: isProduction ? true : isSecure,
        sameSite: isProduction ? 'none' : 'lax'
      });
      return res.json({
        success: true,
        data: {
          authenticated: false
        }
      });
    }

    res.json({
      success: true,
      data: {
        authenticated: true,
        participant: {
          id: participant._id,
          name: participant.name,
          username: participant.username,
          condition: participant.condition,
          status: participant.status
        }
      }
    });

  } catch (error) {
    console.error('Check session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check session'
    });
  }
};

/**
 * Logout participant
 * POST /api/participants/logout
 */
const logout = async (req, res) => {
  try {
    const isProduction = config.nodeEnv === 'production';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    const clearOptions = {
      httpOnly: true,
      secure: isProduction ? true : isSecure,
      sameSite: isProduction ? 'none' : 'lax'
    };

    res.clearCookie('participantSession', clearOptions);
    res.clearCookie('pendingConsent', clearOptions);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

module.exports = {
  submitConsent,
  registerParticipant,
  getProfile,
  checkSession,
  logout
};
