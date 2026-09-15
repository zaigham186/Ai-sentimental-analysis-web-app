const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const { VideoResponse, Coding } = require('../models');
const { CodingAIService, createCodingProvider, RuleBasedProvider } = require('../services/codingAI');

// Initialize AI coding service with configurable provider (NLP primary, RuleBased fallback)
const codingAI = new CodingAIService(createCodingProvider());

/**
 * Coding Controller
 * Phase 10: Response Coding System + Phase 10 Enhancement: AI-Assisted Coding
 * CRITICAL: Never modify original responseText
 * CRITICAL: Only authorized researchers can code
 * CRITICAL: AI provides SUGGESTIONS only, human makes final decision
 */

/**
 * Get all responses with coding status
 * GET /api/admin/coding/responses
 * Supports participant-based pagination for ranges like 1-30, 31-60, etc.
 */
const getAllResponses = async (req, res) => {
  try {
    const {
      coded,
      condition,
      video,
      search,
      page = 1,
      limit = 50,
      participantRangeStart,
      participantRangeEnd,
      participantPageSize = 30
    } = req.query;

    // Build query
    const query = {};
    let participantIds = [];

    // Participant-based pagination: Get participant IDs in the specified range
    if (participantRangeStart && participantRangeEnd) {
      const { Participant } = require('../models');
      const participantQuery = condition ? { condition } : {};
      const participants = await Participant.find(participantQuery)
        .sort({ createdAt: 1 }) // Consistent ordering
        .skip(parseInt(participantRangeStart) - 1)
        .limit(parseInt(participantRangeEnd) - parseInt(participantRangeStart) + 1)
        .select('_id');

      participantIds = participants.map(p => p._id);
      query.participant = { $in: participantIds };
    } else {
      // Legacy: Filter by condition
      if (condition) {
        const { Participant } = require('../models');
        const participants = await Participant.find({ condition }).distinct('_id');
        query.participant = { $in: participants };
      }
    }

    // Filter by video
    if (video) {
      query.video = video;
    }

    // Get all responses
    let responses = await VideoResponse.find(query)
      .populate('participant', 'username name condition')
      .populate('video', 'title order')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get coding status for each response
    // FIXED: Only mark as coded if it has final reviewed coding, not just AI suggestion
    const responsesWithCoding = await Promise.all(
      responses.map(async (response) => {
        const coding = await Coding.findPrimaryCoding(response._id);

        // Check if it's actually coded (has final coding data) or just AI suggestion pending
        const isActuallyCoded = coding && (
          coding.reviewStatus === 'reviewed' ||
          (coding.reviewStatus === null && (coding.sentiment || coding.aggression?.category || coding.cyberbullying?.present !== undefined))
        );

        const responseObj = response.toObject();
        return {
          ...responseObj,
          id: responseObj._id.toString(), // FIXED: Add id field for frontend
          coded: isActuallyCoded,
          codingId: coding?._id,
          codingStatus: isActuallyCoded ? 'CODED' : 'UNCODED',
          hasAISuggestion: !!(coding && coding.aiCoding),
          reviewStatus: coding?.reviewStatus || null
        };
      })
    );

    // Filter by coded status if specified
    let filteredResponses = responsesWithCoding;
    if (coded === 'true') {
      filteredResponses = responsesWithCoding.filter(r => r.coded);
    } else if (coded === 'false') {
      filteredResponses = responsesWithCoding.filter(r => !r.coded);
    }

    // Search in response text
    if (search) {
      filteredResponses = filteredResponses.filter(r =>
        r.responseText.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = filteredResponses.length;

    // Get total participant count for pagination
    const { Participant } = require('../models');
    const totalParticipantCount = await Participant.countDocuments(condition ? { condition } : {});

    res.json({
      success: true,
      data: {
        responses: filteredResponses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          totalParticipants: totalParticipantCount,
          participantRangeStart: participantRangeStart ? parseInt(participantRangeStart) : null,
          participantRangeEnd: participantRangeEnd ? parseInt(participantRangeEnd) : null
        }
      }
    });
  } catch (error) {
    console.error('Get all responses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve responses'
    });
  }
};

/**
 * Get single response with coding
 * GET /api/admin/coding/responses/:id
 */
const getResponseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response ID format'
      });
    }

    const response = await VideoResponse.findById(id)
      .populate('participant', 'username name condition displayName')
      .populate('video', 'title topic description order');

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    // Get coding if exists
    const coding = await Coding.findPrimaryCoding(response._id);

    // FIXED: Check if actually coded (reviewed) vs just AI suggestion
    const isActuallyCoded = coding && (
      coding.reviewStatus === 'reviewed' ||
      (coding.reviewStatus === null && (coding.sentiment || coding.aggression?.category || coding.cyberbullying?.present !== undefined))
    );

    const responseObj = response.toObject();
    responseObj.id = responseObj._id.toString(); // FIXED: Add id field for frontend

    let codingObj = null;
    if (coding) {
      codingObj = coding.toObject();
      codingObj.id = codingObj._id.toString();
    }

    res.json({
      success: true,
      data: {
        response: responseObj,
        coding: codingObj,
        coded: isActuallyCoded
      }
    });
  } catch (error) {
    console.error('Get response by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve response'
    });
  }
};

/**
 * Create coding for response
 * POST /api/admin/coding
 */
const createCoding = async (req, res) => {
  try {
    const {
      responseId,
      sentiment,
      aggression,
      cyberbullying,
      notes,
      confidence,
      codingVersion
    } = req.body;

    // Validate response ID format
    if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response ID format'
      });
    }

    // Validate response exists
    const response = await VideoResponse.findById(responseId);
    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    // Check if already coded
    const existingCoding = await Coding.findPrimaryCoding(responseId);
    if (existingCoding) {
      return res.status(400).json({
        success: false,
        message: 'Response already has primary coding. Use update endpoint to modify.'
      });
    }

    // Create coding
    const coding = await Coding.create({
      response: responseId,
      sentiment,
      aggression: aggression || {},
      cyberbullying: cyberbullying || {},
      notes,
      confidence: confidence || 'medium',
      codingVersion: codingVersion || '1.0',
      codedBy: req.admin.id,
      coderRole: 'primary',
      codedAt: new Date()
    });

    // Populate coder info
    await coding.populate('codedBy', 'name username');

    res.status(201).json({
      success: true,
      message: 'Coding created successfully',
      data: coding
    });
  } catch (error) {
    console.error('Create coding error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create coding'
    });
  }
};

/**
 * Update coding
 * PUT /api/admin/coding/:id
 */
const updateCoding = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coding ID format'
      });
    }

    const coding = await Coding.findById(id);

    if (!coding) {
      return res.status(404).json({
        success: false,
        message: 'Coding not found'
      });
    }

    const {
      sentiment,
      aggression,
      cyberbullying,
      notes,
      confidence
    } = req.body;

    // Update fields
    if (sentiment !== undefined) coding.sentiment = sentiment;
    if (aggression !== undefined) coding.aggression = { ...coding.aggression.toObject(), ...aggression };
    if (cyberbullying !== undefined) coding.cyberbullying = { ...coding.cyberbullying.toObject(), ...cyberbullying };
    if (notes !== undefined) coding.notes = notes;
    if (confidence !== undefined) coding.confidence = confidence;

    // Update timestamp
    coding.codedAt = new Date();

    await coding.save();
    await coding.populate('codedBy', 'name username');

    res.json({
      success: true,
      message: 'Coding updated successfully',
      data: coding
    });
  } catch (error) {
    console.error('Update coding error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update coding'
    });
  }
};

/**
 * Delete coding
 * DELETE /api/admin/coding/:id
 */
const deleteCoding = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coding ID format'
      });
    }

    const coding = await Coding.findById(id);

    if (!coding) {
      return res.status(404).json({
        success: false,
        message: 'Coding not found'
      });
    }

    await coding.deleteOne();

    res.json({
      success: true,
      message: 'Coding deleted successfully'
    });
  } catch (error) {
    console.error('Delete coding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete coding'
    });
  }
};

/**
 * Get coding statistics
 * GET /api/admin/coding/stats
 */
const getStatistics = async (req, res) => {
  try {
    const totalResponses = await VideoResponse.countDocuments();

    // FIXED: Only count codings that are REVIEWED (have final human-approved coding)
    // NOT just pending AI suggestions
    const codedResponses = await Coding.countDocuments({
      coderRole: 'primary',
      reviewStatus: { $in: ['reviewed', null] }, // null for old codings without reviewStatus
      $or: [
        { sentiment: { $exists: true, $ne: null } },
        { 'aggression.category': { $exists: true, $ne: null } },
        { 'cyberbullying.present': { $exists: true, $ne: null } }
      ]
    });

    const uncodedResponses = totalResponses - codedResponses;

    // FIXED: Get distribution only from REVIEWED codings
    const aggressionDistribution = await Coding.aggregate([
      {
        $match: {
          coderRole: 'primary',
          reviewStatus: { $in: ['reviewed', null] },
          'aggression.category': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$aggression.category',
          count: { $sum: 1 }
        }
      }
    ]);

    const cyberbullyingDistribution = await Coding.aggregate([
      {
        $match: {
          coderRole: 'primary',
          reviewStatus: { $in: ['reviewed', null] },
          'cyberbullying.present': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$cyberbullying.present',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: totalResponses,
        coded: codedResponses,
        uncoded: uncodedResponses,
        progress: totalResponses > 0 ? ((codedResponses / totalResponses) * 100).toFixed(1) : 0,
        distribution: {
          aggression: aggressionDistribution.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
          cyberbullying: cyberbullyingDistribution.reduce((acc, item) => {
            const key = item._id === true ? 'present' : item._id === false ? 'absent' : 'unknown';
            acc[key] = item.count;
            return acc;
          }, {})
        }
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
};

/**
 * Get coding configuration
 * GET /api/admin/coding/config
 */
const getConfig = async (req, res) => {
  try {
    // Return configuration for coding categories
    // REQUIRES RESEARCHER/SUPERVISOR APPROVAL
    const config = {
      sentiment: {
        values: ['positive', 'neutral', 'negative', 'mixed'],
        description: 'Overall sentiment of the response',
        note: 'Sentiment does not automatically indicate aggression'
      },
      aggression: {
        level: {
          min: 0,
          max: 10,
          description: 'Numerical aggression level (0-10)'
        },
        category: {
          values: ['none', 'mild', 'moderate', 'severe'],
          description: 'Categorical aggression classification',
          note: 'REQUIRES RESEARCHER/SUPERVISOR APPROVAL'
        }
      },
      cyberbullying: {
        present: {
          type: 'boolean',
          description: 'Whether cyberbullying is present'
        },
        type: {
          values: ['none', 'harassment', 'denigration', 'flaming', 'impersonation', 'outing', 'exclusion', 'cyberstalking', 'other'],
          description: 'Type of cyberbullying if present',
          note: 'REQUIRES RESEARCHER/SUPERVISOR APPROVAL'
        },
        severity: {
          min: 0,
          max: 10,
          description: 'Cyberbullying severity (0-10)'
        }
      },
      confidence: {
        values: ['low', 'medium', 'high'],
        description: 'Coder confidence in the coding'
      },
      codingVersion: {
        default: '1.0',
        description: 'Version of coding methodology used'
      },
      note: 'All coding categories require approval by research supervisor. Do not equate negative sentiment with aggression or cyberbullying automatically.'
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve configuration'
    });
  }
};

/**
 * Trigger AI analysis for a response
 * POST /api/admin/coding/:id/analyze
 * Phase 10 Enhancement: AI-Assisted Coding
 */
const analyzeWithAI = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response ID format'
      });
    }

    // Get the response
    const response = await VideoResponse.findById(id)
      .populate('participant', 'username name condition')
      .populate('video', 'title topic order');

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    // Check if coding already exists
    let coding = await Coding.findPrimaryCoding(id);
    const force = req.query.force === 'true' || req.body?.force === true;
    const isFallback = Boolean(coding?.aiCoding?.metadata?.fallback_used);
    const isPending = !coding?.reviewStatus || coding?.reviewStatus === 'pending';

    if (coding && coding.aiCoding && !force && !isFallback && !isPending) {
      return res.status(400).json({
        success: false,
        message: 'AI analysis already performed and finalized. Use force=true to re-analyze.'
      });
    }

    // Perform AI analysis
    const context = {
      condition: response.participant?.condition || 'anonymous',
      videoTopic: response.video?.topic || 'general',
      videoOrder: response.video?.order || 1
    };

    const aiResult = await codingAI.analyzeResponse(response.responseText, context);

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: aiResult.error
      });
    }

    const aiAnalysis = aiResult.data;

    // Create or update coding with AI suggestion
    if (coding) {
      // Update existing coding
      coding.aiCoding = {
        sentiment: {
          label: aiAnalysis.sentiment.label,
          confidence: aiAnalysis.sentiment.confidence,
          evidence: aiAnalysis.sentiment.evidence,
          needsReview: aiAnalysis.sentiment.needsReview
        },
        aggression: {
          label: aiAnalysis.aggression.label,
          level: aiAnalysis.aggression.level,
          confidence: aiAnalysis.aggression.confidence,
          evidence: aiAnalysis.aggression.evidence,
          needsReview: aiAnalysis.aggression.needsReview
        },
        cyberbullying: {
          present: aiAnalysis.cyberbullying.present,
          type: aiAnalysis.cyberbullying.type,
          severity: aiAnalysis.cyberbullying.severity,
          confidence: aiAnalysis.cyberbullying.confidence,
          evidence: aiAnalysis.cyberbullying.evidence,
          criteriaMatched: aiAnalysis.cyberbullying.criteriaMatched || [],
          needsReview: aiAnalysis.cyberbullying.needsReview
        },
        metadata: aiAnalysis.metadata,
        modelName: aiAnalysis.metadata?.provider || 'rule-based',
        modelVersion: aiAnalysis.metadata?.version || '1.0',
        detectedLanguage: aiAnalysis.metadata?.detectedLanguage,
        languageConfidence: aiAnalysis.metadata?.languageConfidence,
        needsHumanReview: aiAnalysis.needsHumanReview,
        analyzedAt: new Date()
      };
      coding.reviewStatus = 'pending';
      await coding.save();
    } else {
      // Create new coding with AI suggestion only
      coding = await Coding.create({
        response: id,
        coderRole: 'primary',
        aiCoding: {
          sentiment: {
            label: aiAnalysis.sentiment.label,
            confidence: aiAnalysis.sentiment.confidence,
            evidence: aiAnalysis.sentiment.evidence,
            needsReview: aiAnalysis.sentiment.needsReview
          },
          aggression: {
            label: aiAnalysis.aggression.label,
            level: aiAnalysis.aggression.level,
            confidence: aiAnalysis.aggression.confidence,
            evidence: aiAnalysis.aggression.evidence,
            needsReview: aiAnalysis.aggression.needsReview
          },
          cyberbullying: {
            present: aiAnalysis.cyberbullying.present,
            type: aiAnalysis.cyberbullying.type,
            severity: aiAnalysis.cyberbullying.severity,
            confidence: aiAnalysis.cyberbullying.confidence,
            evidence: aiAnalysis.cyberbullying.evidence,
            criteriaMatched: aiAnalysis.cyberbullying.criteriaMatched || [],
            needsReview: aiAnalysis.cyberbullying.needsReview
          },
          metadata: aiAnalysis.metadata,
          modelName: aiAnalysis.metadata?.provider || 'rule-based',
          modelVersion: aiAnalysis.metadata?.version || '1.0',
          detectedLanguage: aiAnalysis.metadata?.detectedLanguage,
          languageConfidence: aiAnalysis.metadata?.languageConfidence,
          needsHumanReview: aiAnalysis.needsHumanReview,
          analyzedAt: new Date()
        },
        reviewStatus: 'pending',
        codingVersion: '1.0'
      });
    }

    await coding.populate('codedBy', 'name username');

    res.json({
      success: true,
      message: 'AI analysis completed. Please review the suggestions.',
      data: {
        coding,
        needsReview: aiAnalysis.needsHumanReview,
        warning: 'AI suggestions are NOT final coding. Human review is required.'
      }
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to perform AI analysis',
      error: error.message
    });
  }
};

/**
 * Human review of AI suggestion
 * POST /api/admin/coding/:id/review
 * Phase 10 Enhancement: AI-Assisted Coding
 */
const reviewAISuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, finalCoding, notes } = req.body;

    // Validate action
    if (!['accept', 'modify', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be: accept, modify, or reject'
      });
    }

    // Get coding (lookup by coding ID or by response ID)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    let coding = await Coding.findById(id);
    if (!coding) {
      coding = await Coding.findPrimaryCoding(id);
    }
    if (!coding) {
      return res.status(404).json({
        success: false,
        message: 'Coding not found'
      });
    }

    if (!coding.aiCoding) {
      return res.status(400).json({
        success: false,
        message: 'No AI suggestion found. Run analysis first.'
      });
    }

    if (coding.reviewStatus === 'reviewed') {
      return res.status(400).json({
        success: false,
        message: 'This coding has already been reviewed. Use update endpoint to modify.'
      });
    }

    // Process based on action
    let finalSentiment, finalAggression, finalCyberbullying;

    if (action === 'accept') {
      // Accept AI suggestion as-is
      finalSentiment = coding.aiCoding.sentiment.label;
      finalAggression = {
        category: coding.aiCoding.aggression.label,
        level: coding.aiCoding.aggression.level
      };
      finalCyberbullying = {
        present: coding.aiCoding.cyberbullying.present,
        type: coding.aiCoding.cyberbullying.type,
        severity: coding.aiCoding.cyberbullying.severity
      };
    } else if (action === 'modify') {
      // Use human-provided modifications
      if (!finalCoding) {
        return res.status(400).json({
          success: false,
          message: 'finalCoding is required for modify action'
        });
      }
      finalSentiment = finalCoding.sentiment;
      finalAggression = finalCoding.aggression;
      finalCyberbullying = finalCoding.cyberbullying;
    } else if (action === 'reject') {
      // Reject AI, use human-provided coding
      if (!finalCoding) {
        return res.status(400).json({
          success: false,
          message: 'finalCoding is required for reject action'
        });
      }
      finalSentiment = finalCoding.sentiment;
      finalAggression = finalCoding.aggression;
      finalCyberbullying = finalCoding.cyberbullying;
    }

    // Store audit trail entry
    const auditEntry = {
      action,
      reviewedBy: req.admin.id,
      reviewedAt: new Date(),
      aiSuggestion: {
        sentiment: coding.aiCoding.sentiment.label,
        aggression: {
          category: coding.aiCoding.aggression.label,
          level: coding.aiCoding.aggression.level
        },
        cyberbullying: {
          present: coding.aiCoding.cyberbullying.present,
          type: coding.aiCoding.cyberbullying.type
        }
      },
      finalDecision: {
        sentiment: finalSentiment,
        aggression: finalAggression,
        cyberbullying: finalCyberbullying
      },
      notes: notes || ''
    };

    // Update coding with final decision
    coding.sentiment = finalSentiment;
    coding.aggression = finalAggression;
    coding.cyberbullying = finalCyberbullying;
    coding.notes = notes || coding.notes;
    coding.reviewStatus = 'reviewed';
    coding.reviewAction = action === 'accept' ? 'accepted_ai' : (action === 'modify' ? 'modified' : (action === 'reject' ? 'rejected' : action));
    coding.codedBy = req.admin.id;
    coding.codedAt = new Date();
    coding.auditTrail = coding.auditTrail || [];
    coding.auditTrail.push(auditEntry);

    await coding.save();
    await coding.populate('codedBy', 'name username');

    res.json({
      success: true,
      message: `Review completed. AI suggestion ${action}ed.`,
      data: coding
    });
  } catch (error) {
    console.error('Review error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process review',
      error: error.message
    });
  }
};

/**
 * Get responses pending AI review
 * GET /api/admin/coding/pending-review
 * Phase 10 Enhancement: AI-Assisted Coding
 */
const getPendingReview = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Find codings with pending review status
    const codings = await Coding.find({ reviewStatus: 'pending' })
      .populate({
        path: 'response',
        populate: [
          { path: 'participant', select: 'username name condition' },
          { path: 'video', select: 'title order topic' }
        ]
      })
      .sort({ 'aiCoding.analyzedAt': -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Coding.countDocuments({ reviewStatus: 'pending' });

    // Format response safely guarding against orphaned records
    const formattedCodings = codings
      .filter(coding => coding && coding.response)
      .map(coding => ({
        codingId: coding._id,
        responseId: coding.response._id,
        participant: coding.response.participant || { name: 'N/A', username: 'unknown', condition: 'anonymous' },
        video: coding.response.video || { order: 'N/A', title: 'Unknown', topic: 'general' },
        responseText: coding.response.responseText,
        submittedAt: coding.response.submittedAt,
        aiSuggestion: {
          sentiment: coding.aiCoding.sentiment,
          aggression: coding.aiCoding.aggression,
          cyberbullying: coding.aiCoding.cyberbullying,
          metadata: coding.aiCoding.metadata,
          analyzedAt: coding.aiCoding.analyzedAt
        },
        needsReview:
          coding.aiCoding.sentiment.needsReview ||
          coding.aiCoding.aggression.needsReview ||
          coding.aiCoding.cyberbullying.needsReview
      }));

    res.json({
      success: true,
      data: {
        codings: formattedCodings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get pending review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending reviews'
    });
  }
};

/**
 * Bulk analyze multiple responses with AI
 * POST /api/admin/coding/bulk-analyze
 * Phase 10 Enhancement: AI-Assisted Coding
 */
const bulkAnalyze = async (req, res) => {
  try {
    const { responseIds, condition, video } = req.body;

    let responsesToAnalyze = [];

    if (responseIds && Array.isArray(responseIds)) {
      // Validate all IDs
      const invalidIds = responseIds.filter(rid => !mongoose.Types.ObjectId.isValid(rid));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'One or more response IDs are invalid'
        });
      }

      // Analyze specific responses
      responsesToAnalyze = await VideoResponse.find({ _id: { $in: responseIds } })
        .populate('participant', 'condition')
        .populate('video', 'topic order');
    } else {
      // Analyze by filters
      const query = {};

      if (condition) {
        const { Participant } = require('../models');
        const participants = await Participant.find({ condition }).distinct('_id');
        query.participant = { $in: participants };
      }

      if (video) {
        query.video = video;
      }

      // Get uncoded responses only
      const coded = await Coding.find({}).distinct('response');
      query._id = { $nin: coded };

      responsesToAnalyze = await VideoResponse.find(query)
        .populate('participant', 'condition')
        .populate('video', 'topic order')
        .limit(100); // Limit to 100 per bulk request
    }

    if (responsesToAnalyze.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No responses found to analyze'
      });
    }

    // Analyze each response
    const results = {
      total: responsesToAnalyze.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const response of responsesToAnalyze) {
      try {
        // Check if already analyzed
        const existing = await Coding.findPrimaryCoding(response._id);
        if (existing && existing.aiCoding) {
          results.failed++;
          continue;
        }

        // Perform AI analysis safely
        const context = {
          condition: response.participant?.condition || 'anonymous',
          videoTopic: response.video?.topic || 'general',
          videoOrder: response.video?.order || 1
        };

        const aiResult = await codingAI.analyzeResponse(response.responseText, context);

        if (!aiResult.success) {
          results.failed++;
          results.errors.push({
            responseId: response._id,
            error: aiResult.error
          });
          continue;
        }

        const aiAnalysis = aiResult.data;

        // Create coding with AI suggestion
        await Coding.create({
          response: response._id,
          coderRole: 'primary',
          aiCoding: {
            sentiment: aiAnalysis.sentiment,
            aggression: aiAnalysis.aggression,
            cyberbullying: aiAnalysis.cyberbullying,
            metadata: aiAnalysis.metadata,
            modelName: aiAnalysis.metadata?.provider || 'rule-based',
            modelVersion: aiAnalysis.metadata?.version || '1.0',
            detectedLanguage: aiAnalysis.metadata?.detectedLanguage,
            languageConfidence: aiAnalysis.metadata?.languageConfidence,
            needsHumanReview: aiAnalysis.needsHumanReview,
            analyzedAt: new Date()
          },
          reviewStatus: 'pending',
          codingVersion: '1.0'
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          responseId: response._id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk analysis completed. ${results.success} responses analyzed.`,
      data: results
    });
  } catch (error) {
    console.error('Bulk analyze error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk analysis',
      error: error.message
    });
  }
};

/**
 * Get Research NLP Validation & Calibration Status
 * GET /api/admin/coding/validation-status
 * Phase 6: Research Validation & Calibration
 */
const getValidationStatus = async (req, res) => {
  try {
    // 1. Check live FastAPI NLP service health
    let nlpHealth = {
      available: false,
      modelsReady: false,
      models: {
        sentiment: 'Unavailable',
        toxicity: 'Unavailable',
        aggression: 'Unavailable',
        cyberbullying: 'Unavailable'
      }
    };

    const nlpUrl = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001';
    try {
      const healthRes = await axios.get(`${nlpUrl}/health`, { timeout: 2000 });
      if (healthRes.data?.status === 'healthy') {
        nlpHealth = {
          available: true,
          modelsReady: !!healthRes.data.models_ready,
          models: {
            sentiment: 'cardiffnlp/twitter-xlm-roberta-base-sentiment',
            toxicity: 'Detoxify (multilingual)',
            aggression: 'Xu et al. (2020) Lexicon Model',
            cyberbullying: 'Research Operational Criteria'
          }
        };
      }
    } catch (e) {
      // NLP microservice offline or unreachable
    }

    // 2. Check for validation report JSON artifact
    const reportPath = path.resolve(__dirname, '../../../validation/results/validation_report.json');
    let validationData = null;

    if (fs.existsSync(reportPath)) {
      try {
        const rawContent = fs.readFileSync(reportPath, 'utf8');
        validationData = JSON.parse(rawContent);
      } catch (err) {
        console.error('Error reading validation_report.json:', err.message);
      }
    }

    if (!validationData || !validationData.is_validated) {
      return res.json({
        success: true,
        data: {
          validation_status: 'Not validated',
          is_validated: false,
          sample_count: 0,
          message: 'VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED',
          nlpHealth
        }
      });
    }

    return res.json({
      success: true,
      data: {
        ...validationData,
        nlpHealth
      }
    });
  } catch (error) {
    console.error('Validation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve validation status',
      error: error.message
    });
  }
};

module.exports = {
  getAllResponses,
  getResponseById,
  createCoding,
  updateCoding,
  deleteCoding,
  getStatistics,
  getConfig,
  // Phase 10 Enhancement: AI-Assisted Coding
  analyzeWithAI,
  reviewAISuggestion,
  getPendingReview,
  bulkAnalyze,
  // Phase 6: Research Validation & Calibration
  getValidationStatus
};
