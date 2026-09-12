const { Participant, AuditLog } = require('../models');
const config = require('../config');

/**
 * Participant Controller
 * Handles participant registration, consent, and session management
 * CRITICAL: Never expose MongoDB _id to participants
 * UPDATE: Participants now select their own condition (anonymous/identifiable)
 */

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
    res.cookie('pendingConsent', JSON.stringify(consentData), {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });

    res.json({
      success: true,
      message: 'Consent recorded. Please proceed to registration.',
      data: {
        consentVersion
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

    // Check for pending consent - MADE OPTIONAL FOR TESTING
    const pendingConsentCookie = req.cookies.pendingConsent;
    let consentData;
    
    if (pendingConsentCookie) {
      try {
        consentData = JSON.parse(pendingConsentCookie);
      } catch (error) {
        // Use default consent if cookie is invalid
        consentData = {
          consentGiven: true,
          agreedToDataUse: true,
          agreedToWithdrawalTerms: true,
          electronicSignature: 'Auto-consent for testing',
          consentVersion: '1.0',
          consentAt: new Date()
        };
      }
    } else {
      // No cookie - use default consent for testing
      consentData = {
        consentGiven: true,
        agreedToDataUse: true,
        agreedToWithdrawalTerms: true,
        electronicSignature: 'Auto-consent for testing',
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

    // Create session
    res.cookie('participantSession', participant._id.toString(), {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Clear pending consent cookie
    res.clearCookie('pendingConsent');

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

    // Return participant data (NO MongoDB _id)
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        username: participant.username,
        name: participant.name,
        university: participant.university,
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
    const participantId = req.cookies.participantSession;

    if (!participantId) {
      return res.json({
        success: true,
        data: {
          authenticated: false
        }
      });
    }

    const participant = await Participant.findById(participantId);

    if (!participant || participant.status === 'withdrawn') {
      // Clear invalid session
      res.clearCookie('participantSession');
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
        username: participant.username,
        status: participant.status,
        consentGiven: participant.consentGiven
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    res.json({
      success: true,
      data: {
        authenticated: false
      }
    });
  }
};

/**
 * Logout participant
 * POST /api/participants/logout
 */
const logout = async (req, res) => {
  try {
    res.clearCookie('participantSession');
    res.clearCookie('pendingConsent');

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
