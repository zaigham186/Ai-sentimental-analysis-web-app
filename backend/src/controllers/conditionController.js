/**
 * Condition Controller
 * Handles participant condition information and display identity
 * CRITICAL: Anonymous participants must see "Unknown User", not their real name
 */

/**
 * Get participant's condition information
 * GET /api/condition
 * Returns display identity based on assigned condition
 */
const getConditionInfo = async (req, res) => {
  try {
    const participant = req.participant;

    if (!participant) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if participant has been assigned a condition
    if (!participant.conditionAssigned || !participant.condition) {
      return res.status(400).json({
        success: false,
        message: 'Condition not yet assigned. Please contact the research team.'
      });
    }

    // Build response based on condition
    let displayIdentity;
    let notice;

    if (participant.condition === 'anonymous') {
      // ANONYMOUS CONDITION
      // Display "Unknown User" and hide real name
      displayIdentity = {
        displayName: 'Unknown User',
        condition: 'anonymous'
      };

      notice = 'You are participating anonymously. Your responses are shown and stored as "Unknown User".';

    } else if (participant.condition === 'identifiable') {
      // IDENTIFIABLE CONDITION
      // Display actual name
      displayIdentity = {
        displayName: participant.name,
        condition: 'identifiable'
      };

      notice = 'Your identity is visible in your responses throughout this study.';

    } else {
      // Should never happen with enum validation
      return res.status(500).json({
        success: false,
        message: 'Invalid condition state'
      });
    }

    // Return condition information
    // NEVER include real name for anonymous participants
    res.json({
      success: true,
      data: {
        ...displayIdentity,
        notice,
        assignedAt: participant.assignedAt,
        assignmentVersion: participant.assignmentVersion
      }
    });

  } catch (error) {
    console.error('Get condition info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load condition information'
    });
  }
};

/**
 * Get display name for participant
 * Helper function used by other controllers
 * @param {Object} participant - Participant object
 * @returns {string} Display name based on condition
 */
const getDisplayName = (participant) => {
  if (!participant || !participant.condition) {
    return 'Unknown User';
  }

  if (participant.condition === 'anonymous') {
    return 'Unknown User';
  }

  return participant.name;
};

/**
 * Verify condition assignment
 * GET /api/condition/verify
 * Admin/research endpoint to verify participant condition
 */
const verifyCondition = async (req, res) => {
  try {
    const participant = req.participant;

    if (!participant) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    res.json({
      success: true,
      data: {
        conditionAssigned: participant.conditionAssigned,
        condition: participant.condition,
        assignedAt: participant.assignedAt,
        assignmentVersion: participant.assignmentVersion
      }
    });

  } catch (error) {
    console.error('Verify condition error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify condition'
    });
  }
};

module.exports = {
  getConditionInfo,
  getDisplayName,
  verifyCondition
};
