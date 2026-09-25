const { VideoResponse, Participant, Video, Coding } = require('../models');
const { buildResponseQueryAndResults } = require('../utils/responseQueryHelper');

/**
 * Response Management Controller
 * Admin view of all video responses
 */

/**
 * Get all responses with full details
 * GET /api/admin/responses and GET /api/responses
 * Supports pagination, real-time participant search across all videos,
 * sequential video ordering, and flexible sorting.
 */
const getAllResponses = async (req, res) => {
  try {
    const result = await buildResponseQueryAndResults(req.query);

    res.json({
      success: true,
      data: result
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
 * Get single response with full details
 * GET /api/admin/responses/:id
 */
const getResponseById = async (req, res) => {
  try {
    const response = await VideoResponse.findById(req.params.id)
      .populate('participant')
      .populate('video');

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    // Get coding if exists
    const coding = await Coding.findOne({ 
      response: response._id, 
      coderRole: 'primary' 
    }).populate('codedBy', 'name username');

    res.json({
      success: true,
      data: {
        response: response.toObject(),
        coding: coding ? coding.toObject() : null
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
 * Get response statistics
 * GET /api/admin/responses/stats
 */
const getStatistics = async (req, res) => {
  try {
    const total = await VideoResponse.countDocuments();
    const coded = await Coding.countDocuments({
      coderRole: 'primary',
      $or: [
        { reviewStatus: { $in: ['reviewed', 'approved'] } },
        { codedBy: { $exists: true, $ne: null } },
        {
          reviewStatus: { $in: ['reviewed', 'approved', null] },
          $or: [
            { sentiment: { $exists: true, $ne: null } },
            { 'aggression.category': { $exists: true, $ne: null } },
            { 'cyberbullying.present': { $exists: true, $ne: null } }
          ]
        }
      ]
    });
    const uncoded = Math.max(0, total - coded);

    // By condition
    const anonymousParticipants = await Participant.find({ condition: 'anonymous' }).distinct('_id');
    const identifiableParticipants = await Participant.find({ condition: 'identifiable' }).distinct('_id');
    
    const anonymousResponses = await VideoResponse.countDocuments({ 
      participant: { $in: anonymousParticipants } 
    });
    const identifiableResponses = await VideoResponse.countDocuments({ 
      participant: { $in: identifiableParticipants } 
    });

    res.json({
      success: true,
      data: {
        total,
        coded,
        uncoded,
        codingRate: total > 0 ? ((coded / total) * 100).toFixed(1) : 0,
        byCondition: {
          anonymous: anonymousResponses,
          identifiable: identifiableResponses
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

module.exports = {
  getAllResponses,
  getResponseById,
  getStatistics
};
