const { StudySettings, Participant, AuditLog } = require('../models');

/**
 * Assignment Service
 * Handles computerized random allocation of participants to conditions
 * 
 * METHODOLOGY: Balanced Randomization
 * - Server-side only, immutable after assignment
 * - Uses balanced allocation algorithm to maintain target ratios (30/30)
 * - Respects StudySettings targets
 * - Records assignment version for audit trail
 * 
 * [REQUIRES RESEARCHER APPROVAL]
 * This implementation uses balanced randomization suitable for the 30/30 design.
 * If the approved research protocol specifies a different methodology, this
 * service must be updated to match the approved method.
 */

/**
 * Assign condition to participant
 * @param {Object} participant - The participant to assign
 * @param {Object} studySettings - Current study settings (optional, will load if not provided)
 * @returns {Object} Assignment result with condition and details
 */
async function assignCondition(participant, studySettings = null) {
  try {
    // Validate participant
    if (!participant || !participant._id) {
      throw new Error('Invalid participant object');
    }

    // Prevent reassignment
    if (participant.condition && participant.conditionAssigned) {
      throw new Error('Participant already assigned to a condition');
    }

    // Load study settings if not provided
    if (!studySettings) {
      studySettings = await StudySettings.getSettings();
    }

    // Check if study can accept participants
    if (!studySettings.acceptingParticipants) {
      throw new Error('Study is not currently accepting participants');
    }

    if (studySettings.studyLocked) {
      throw new Error('Study is locked and cannot accept new participants');
    }

    // Get next condition using balanced allocation
    const condition = studySettings.getNextCondition();

    if (!condition) {
      throw new Error('No available conditions - study targets reached');
    }

    // Verify condition is still available
    if (!studySettings.canAcceptParticipant(condition)) {
      throw new Error(`Cannot assign ${condition} condition - target reached`);
    }

    // Assign condition to participant
    participant.condition = condition;
    participant.conditionAssigned = true;
    participant.assignedAt = new Date();
    participant.assignmentVersion = studySettings.allocationVersion;

    await participant.save();

    // Update study settings counts
    await studySettings.incrementParticipantCount(condition);

    // Log assignment in audit trail
    await AuditLog.logAction({
      action: 'condition_assigned',
      category: 'assignment',
      actorType: 'system',
      actorId: 'assignment_service',
      targetType: 'participant',
      targetId: participant._id.toString(),
      details: {
        condition,
        assignmentVersion: studySettings.allocationVersion,
        allocationMethod: studySettings.allocationMethod,
        anonymousCount: studySettings.anonymousCount,
        identifiableCount: studySettings.identifiableCount,
        totalParticipants: studySettings.currentParticipants
      },
      success: true
    });

    return {
      success: true,
      condition,
      assignmentVersion: studySettings.allocationVersion,
      assignedAt: participant.assignedAt
    };

  } catch (error) {
    // Log assignment failure
    await AuditLog.logAction({
      action: 'condition_assignment_failed',
      category: 'assignment',
      actorType: 'system',
      actorId: 'assignment_service',
      targetType: 'participant',
      targetId: participant?._id?.toString() || 'unknown',
      details: {
        error: error.message
      },
      success: false
    });

    throw error;
  }
}

/**
 * Get assignment statistics
 * @returns {Object} Current assignment statistics
 */
async function getAssignmentStats() {
  try {
    const studySettings = await StudySettings.getSettings();

    const stats = {
      targetParticipants: studySettings.targetParticipants,
      currentParticipants: studySettings.currentParticipants,
      anonymous: {
        target: studySettings.anonymousTarget,
        current: studySettings.anonymousCount,
        remaining: studySettings.anonymousTarget - studySettings.anonymousCount,
        percentage: (studySettings.anonymousCount / studySettings.anonymousTarget * 100).toFixed(1)
      },
      identifiable: {
        target: studySettings.identifiableTarget,
        current: studySettings.identifiableCount,
        remaining: studySettings.identifiableTarget - studySettings.identifiableCount,
        percentage: (studySettings.identifiableCount / studySettings.identifiableTarget * 100).toFixed(1)
      },
      allocationMethod: studySettings.allocationMethod,
      allocationVersion: studySettings.allocationVersion,
      acceptingParticipants: studySettings.acceptingParticipants,
      studyLocked: studySettings.studyLocked
    };

    return stats;
  } catch (error) {
    throw new Error(`Failed to get assignment statistics: ${error.message}`);
  }
}

/**
 * Validate assignment integrity
 * Checks that all participants have valid assignments and counts match
 * @returns {Object} Validation result
 */
async function validateAssignmentIntegrity() {
  try {
    const studySettings = await StudySettings.getSettings();

    // Count actual participants by condition
    const anonymousCount = await Participant.countDocuments({
      condition: 'anonymous',
      status: { $ne: 'withdrawn' }
    });

    const identifiableCount = await Participant.countDocuments({
      condition: 'identifiable',
      status: { $ne: 'withdrawn' }
    });

    const totalCount = anonymousCount + identifiableCount;

    // Check for mismatches
    const discrepancies = [];

    if (studySettings.anonymousCount !== anonymousCount) {
      discrepancies.push({
        field: 'anonymousCount',
        expected: studySettings.anonymousCount,
        actual: anonymousCount
      });
    }

    if (studySettings.identifiableCount !== identifiableCount) {
      discrepancies.push({
        field: 'identifiableCount',
        expected: studySettings.identifiableCount,
        actual: identifiableCount
      });
    }

    if (studySettings.currentParticipants !== totalCount) {
      discrepancies.push({
        field: 'currentParticipants',
        expected: studySettings.currentParticipants,
        actual: totalCount
      });
    }

    // Check for unassigned participants
    const unassignedCount = await Participant.countDocuments({
      conditionAssigned: { $ne: true },
      status: { $ne: 'withdrawn' }
    });

    return {
      valid: discrepancies.length === 0 && unassignedCount === 0,
      discrepancies,
      unassignedParticipants: unassignedCount,
      counts: {
        anonymous: anonymousCount,
        identifiable: identifiableCount,
        total: totalCount
      },
      settings: {
        anonymous: studySettings.anonymousCount,
        identifiable: studySettings.identifiableCount,
        total: studySettings.currentParticipants
      }
    };
  } catch (error) {
    throw new Error(`Failed to validate assignment integrity: ${error.message}`);
  }
}

module.exports = {
  assignCondition,
  getAssignmentStats,
  validateAssignmentIntegrity
};
