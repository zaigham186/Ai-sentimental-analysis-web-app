const express = require('express');
const healthRoutes = require('./health');
const participantRoutes = require('./participants');
const conditionRoutes = require('./condition');
const experimentRoutes = require('./experiment');

const router = express.Router();

/**
 * API Routes
 * All routes are prefixed with /api
 */

router.use('/health', healthRoutes);
router.use('/participants', participantRoutes);
router.use('/condition', conditionRoutes);
router.use('/experiment', experimentRoutes);

// Future routes will be added here:
// router.use('/questionnaires', questionnaireRoutes);
// router.use('/admin', adminRoutes);

module.exports = router;
