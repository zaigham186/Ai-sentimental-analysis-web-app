const express = require('express');
const adminController = require('../controllers/adminController');
const videoRoutes = require('./videos');
const codingRoutes = require('./coding');
const analyticsRoutes = require('./analytics');
const exportRoutes = require('./export');
const researchAnalyticsRoutes = require('./researchAnalyticsRoutes');
const participantManagementRoutes = require('./participants.management');
const responseManagementRoutes = require('./responses.management');
const {
  authenticateAdmin,
  requireResearcher,
  checkExistingAdminSession
} = require('../middleware/adminAuth');
const { authLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * Admin Routes
 * Phase 8: Admin Authentication and Dashboard
 * Phase 9: Video Management
 * Phase 10: Response Coding System
 * Phase 11: Analytics + Research Export
 * Phase 12: Participant & Response Management
 * All routes prefixed with /api/admin
 */

/**
 * POST /api/admin/login
 * Admin login
 * Public route (no authentication required)
 * Hardened with authLimiter for brute-force protection
 */
router.post('/login', authLimiter, checkExistingAdminSession, adminController.login);

/**
 * POST /api/admin/logout
 * Admin logout
 * Requires authentication
 */
router.post('/logout', authenticateAdmin, adminController.logout);

/**
 * GET /api/admin/me
 * Get current admin info
 * Requires authentication
 */
router.get('/me', authenticateAdmin, adminController.getCurrentAdmin);

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 * Requires researcher role or higher
 */
router.get('/dashboard', authenticateAdmin, requireResearcher, adminController.getDashboard);

/**
 * Video Management Routes (Phase 9)
 * /api/admin/videos/*
 */
router.use('/videos', videoRoutes);

/**
 * Response Coding Routes (Phase 10)
 * /api/admin/coding/*
 */
router.use('/coding', codingRoutes);

/**
 * Analytics Routes (Phase 11)
 * /api/admin/analytics/*
 */
router.use('/analytics', analyticsRoutes);

/**
 * Research Analytics & Reporting Routes (Phase 7)
 * /api/admin/research-analytics/*
 */
router.use('/research-analytics', researchAnalyticsRoutes);

/**
 * Export Routes (Phase 11)
 * /api/admin/export/*
 */
router.use('/export', exportRoutes);

/**
 * Participant Management Routes (Phase 12)
 * /api/admin/participants/*
 */
router.use('/participants', participantManagementRoutes);

/**
 * Response Management Routes (Phase 12)
 * /api/admin/responses/*
 */
router.use('/responses', responseManagementRoutes);

// Future routes will be added here in later phases:
// router.get('/audit-logs', authenticateAdmin, requireAdmin, auditLogController.list);
// router.get('/settings', authenticateAdmin, requireAdmin, settingsController.get);

module.exports = router;
