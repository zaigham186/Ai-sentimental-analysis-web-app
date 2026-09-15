const mongoose = require('mongoose');
const { Admin } = require('../models');

/**
 * Admin Authentication Middleware
 * Verifies admin session and attaches admin to request
 * CRITICAL: Admin authentication completely separate from participant authentication
 */

/**
 * Authenticate admin from session
 * Checks for admin session cookie and loads admin
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // Get admin ID from session cookie
    const adminId = req.cookies.adminSession;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      res.clearCookie('adminSession', { sameSite: 'lax' });
      return res.status(401).json({
        success: false,
        message: 'Invalid admin session'
      });
    }

    // Load admin from database
    const admin = await Admin.findById(adminId).select('+passwordHash');

    if (!admin) {
      // Invalid session - clear cookie
      res.clearCookie('adminSession', { sameSite: 'lax' });
      return res.status(401).json({
        success: false,
        message: 'Invalid admin session'
      });
    }

    // Check if admin is active
    if (!admin.active) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is temporarily locked due to failed login attempts'
      });
    }

    // Attach admin to request (without password hash)
    req.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin authentication error'
    });
  }
};

/**
 * Require admin role
 * Ensures user has at least admin privileges
 */
const requireAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  const allowedRoles = ['admin', 'superadmin'];
  if (!allowedRoles.includes(req.admin.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required'
    });
  }

  next();
};

/**
 * Require researcher role
 * Allows admin, researcher, and superadmin
 */
const requireResearcher = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  const allowedRoles = ['researcher', 'admin', 'superadmin'];
  if (!allowedRoles.includes(req.admin.role)) {
    return res.status(403).json({
      success: false,
      message: 'Researcher privileges required'
    });
  }

  next();
};

/**
 * Require superadmin role
 * Only superadmin can access
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }

  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin privileges required'
    });
  }

  next();
};

/**
 * Require specific permission
 * Checks if admin has specific permission
 * Superadmins always have all permissions
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    // Superadmins have all permissions
    if (req.admin.role === 'superadmin') {
      return next();
    }

    // Load full admin to check permissions
    const admin = await Admin.findById(req.admin.id);
    if (!admin || !admin.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Check if already logged in as admin
 * Prevents duplicate login
 */
const checkExistingAdminSession = (req, res, next) => {
  const adminId = req.cookies.adminSession;

  if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
    return res.status(400).json({
      success: false,
      message: 'Already logged in as admin'
    });
  }

  next();
};

module.exports = {
  authenticateAdmin,
  requireAdmin,
  requireResearcher,
  requireSuperAdmin,
  requirePermission,
  checkExistingAdminSession
};
