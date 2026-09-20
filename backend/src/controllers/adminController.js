const bcrypt = require('bcryptjs');
const { Admin, Participant, VideoResponse, QuestionnaireResponse, Coding } = require('../models');

/**
 * Admin Controller
 * Handles admin authentication and dashboard
 * Phase 8: Admin Authentication and Dashboard
 */

/**
 * Admin Login
 * POST /api/admin/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    }).select('+passwordHash');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked due to failed login attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!admin.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact the system administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isPasswordValid) {
      // Record failed login attempt
      await admin.recordFailedLogin();

      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Record successful login
    const ipAddress = req.ip || req.connection.remoteAddress;
    await admin.recordLogin(ipAddress);

    // Create session cookie
    const isSecure = (req.secure || req.headers['x-forwarded-proto'] === 'https') && process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };

    res.cookie('adminSession', admin._id.toString(), cookieOptions);

    // Return admin data (without password hash)
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        sessionToken: admin._id.toString(),
        id: admin._id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Admin Logout
 * POST /api/admin/logout
 */
const logout = async (req, res) => {
  try {
    res.clearCookie('adminSession', { sameSite: 'lax' });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * Get Current Admin
 * GET /api/admin/me
 */
const getCurrentAdmin = async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.admin
    });
  } catch (error) {
    console.error('Get current admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin data'
    });
  }
};

/**
 * Get Dashboard Statistics
 * GET /api/admin/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    // Get participant statistics
    const totalParticipants = await Participant.countDocuments();
    const anonymousParticipants = await Participant.countDocuments({ condition: 'anonymous' });
    const identifiableParticipants = await Participant.countDocuments({ condition: 'identifiable' });
    const completedParticipants = await Participant.countDocuments({ status: 'completed' });
    const incompleteParticipants = await Participant.countDocuments({ status: 'incomplete' });
    const withdrawnParticipants = await Participant.countDocuments({ status: 'withdrawn' });

    // Get experiment statistics
    const totalResponses = await VideoResponse.countDocuments();
    const completedExperiments = await Participant.countDocuments({ status: 'completed' });

    // Get questionnaire statistics
    const completedQuestionnaires = await QuestionnaireResponse.countDocuments({ completed: true });
    const pendingQuestionnaires = await Participant.countDocuments({ 
      status: 'completed'
      // Add questionnaire completion check when implemented
    });

    // Get coding statistics
    const totalCodableResponses = await VideoResponse.countDocuments();
    const codedResponses = await Coding.countDocuments();
    const pendingCodingResponses = totalCodableResponses - codedResponses;

    // Construct dashboard data
    const dashboardData = {
      participants: {
        total: totalParticipants,
        anonymous: anonymousParticipants,
        identifiable: identifiableParticipants,
        completed: completedParticipants,
        incomplete: incompleteParticipants,
        withdrawn: withdrawnParticipants
      },
      experiment: {
        totalResponses: totalResponses,
        completedExperiments: completedExperiments
      },
      questionnaires: {
        completed: completedQuestionnaires,
        pending: pendingQuestionnaires
      },
      coding: {
        totalResponses: totalCodableResponses,
        codedResponses: codedResponses,
        pendingResponses: pendingCodingResponses
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data'
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentAdmin,
  getDashboard
};
