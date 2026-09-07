const express = require('express');
const { authenticateParticipant } = require('../middleware/participantAuth');
const { getConditionInfo, verifyCondition } = require('../controllers/conditionController');

const router = express.Router();

/**
 * Condition Routes
 * Handles participant condition information
 * All routes require authentication
 */

/**
 * GET /api/condition
 * Get participant's condition and display identity
 */
router.get('/', authenticateParticipant, getConditionInfo);

/**
 * GET /api/condition/verify
 * Verify condition assignment status
 */
router.get('/verify', authenticateParticipant, verifyCondition);

module.exports = router;
