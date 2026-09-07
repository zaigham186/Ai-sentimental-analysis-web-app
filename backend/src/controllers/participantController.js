const { Participant, AuditLog, StudySettings } = require('../models');
const config = require('../config');
const assignmentService = require('../services/assignmentService');

/**
 * Participant Controller
 * Handles participant registration, consent, and session management
 * CRITICAL: Never expose MongoDB _id to participants
 */

/**
 * Submit consent
 * POST /api/consent
 */
const submitConsent = async (req, res) => {
  try {
    const { consentGiven, agreedToDataUse, agreedToWithdrawalTerms, electronicSignature } = req.body;

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
    const { name, username, age, gender, university, department } = req.body;

    // Check for pending consent
    const pendingConsentCookie = req.cookies.pendingConsent;
    if (!pendingConsentCookie) {
      return res.status(400).json({
        success: false,
        message: 'Please complete consent form first'
      });
    }

    let consentData;
    try {
      consentData = JSON.parse(pendingConsentCookie);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consent data. Please complete consent form again.'
      });
    }

    // Check if username already exists
    const existingParticipant = await Participant.findOne({ username: username.toLowerCase() });
    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken. Please choose a different username.'
      });
    }

    // Load study settings to check capacity
    const studySettings = await StudySettings.getSettings();

    // Check if study can accept participants
    if (!studySettings.canAcceptParticipant()) {
      return res.status(400).json({
        success: false,
        message: 'Study has reached maximum participants. Registration is closed.'
      });
    }

    // Create participant WITHOUT condition (will be assigned next)
    const participant = await Participant.create({
      name,
      username: username.toLowerCase(),
      age,
      gender,
      university,
      department,
      consentGiven: consentData.consentGiven,
      consentAt: consentData.consentAt,
      consentVersion: consentData.consentVersion,
      status: 'active'
      // NO condition field - assignment service handles this
    });

    // Assign condition using computerized random allocation
    try {
      const assignmentResult = await assignmentService.assignCondition(participant, studySettings);
      
      // Reload participant to get updated data
      await participant.populate('condition');
      
    } catch (assignmentError) {
      // If assignment fails, delete the participant and return error
      await Participant.findByIdAndDelete(participant._id);
      
      console.error('Assignment error:', assignmentError);
      return res.status(500).json({
        success: false,
        message: assignmentError.message || 'Failed to assign experimental condition'
      });
    }

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
        gender: participant.gender
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
