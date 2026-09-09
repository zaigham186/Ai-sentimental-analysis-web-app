const express = require('express');
const exportController = require('../controllers/exportController');
const { authenticateAdmin, requireResearcher } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * Export Routes
 * Phase 11: Research Data Export
 * All routes require researcher authentication
 * All routes prefixed with /api/admin/export
 * CRITICAL: Never export passwords, tokens, or secrets
 */

/**
 * GET /api/admin/export/participants
 * Export participants data
 * Query params: format (csv/xlsx), identityLinked (true/false), condition
 */
router.get('/participants', authenticateAdmin, requireResearcher, exportController.exportParticipants);

/**
 * GET /api/admin/export/responses
 * Export responses data
 * Query params: format (csv/xlsx), identityLinked (true/false), condition, video
 */
router.get('/responses', authenticateAdmin, requireResearcher, exportController.exportResponses);

/**
 * GET /api/admin/export/codings
 * Export codings data
 * Query params: format (csv/xlsx), condition
 */
router.get('/codings', authenticateAdmin, requireResearcher, exportController.exportCodings);

/**
 * GET /api/admin/export/research-dataset
 * Export combined research dataset
 * Query params: format (csv/xlsx), identityLinked (true/false), condition
 */
router.get('/research-dataset', authenticateAdmin, requireResearcher, exportController.exportResearchDataset);

/**
 * GET /api/admin/export/data-quality
 * Get data quality check
 */
router.get('/data-quality', authenticateAdmin, requireResearcher, exportController.getDataQuality);

module.exports = router;
