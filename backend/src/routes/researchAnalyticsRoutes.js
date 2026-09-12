const express = require('express');
const researchAnalyticsController = require('../controllers/researchAnalyticsController');
const { authenticateAdmin, requireResearcher } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * Research Analytics Routes
 * Phase 7: Complete Research Analytics, Results, Export & Supervisor Reporting
 * All routes require authenticated researcher/admin access
 * All endpoints are strictly read-only
 */

// Summary and Overview Metrics
router.get('/overview', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getOverview(req, res));

// Dimension-Specific Analytics
router.get('/sentiment', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getSentiment(req, res));
router.get('/toxicity', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getToxicity(req, res));
router.get('/aggression', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getAggression(req, res));
router.get('/cyberbullying', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getCyberbullying(req, res));

// Comparisons
router.get('/condition-comparison', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getConditionComparison(req, res));
router.get('/video-comparison', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getVideoComparison(req, res));

// AI vs Human Agreement & Disagreements
router.get('/ai-human', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getAIHumanAgreement(req, res));

// Paginated Research Data Table
router.get('/responses', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getResponsesTable(req, res));

// Phase 6 Validation Results
router.get('/validation', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getValidation(req, res));

// Full Supervisor Report Payload
router.get('/report/summary', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.getSupervisorReport(req, res));

// Data Exports
router.get('/export/csv', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.exportCSV(req, res));
router.get('/export/json', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.exportJSON(req, res));
router.get('/export/xlsx', authenticateAdmin, requireResearcher, (req, res) => researchAnalyticsController.exportXLSX(req, res));

module.exports = router;
