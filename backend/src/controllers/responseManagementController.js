const { VideoResponse, Participant, Video, Coding } = require('../models');

/**
 * Response Management Controller
 * Admin view of all video responses
 */

/**
 * Get all responses with full details
 * GET /api/admin/responses
 */
const getAllResponses = async (req, res) => {
  try {
    const { condition, video, coded, search, page = 1, limit = 50 } = req.query;

    // Build query
    let query = {};
    
    // Filter by condition
    if (condition) {
      const participants = await Participant.find({ condition }).distinct('_id');
      query.participant = { $in: participants };
    }
    
    // Filter by video
    if (video) {
      query.video = video;
    }

    const responses = await VideoResponse.find(query)
      .populate('participant', 'username name condition status')
      .populate('video', 'title order topic')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await VideoResponse.countDocuments(query);

    // Get coding status for each response
    const responsesWithCoding = await Promise.all(
      responses.map(async (response) => {
        const coding = await Coding.findOne({ 
          response: response._id, 
          coderRole: 'primary' 
        }).populate('codedBy', 'name username');

        return {
          ...response.toObject(),
          coding: coding ? coding.toObject() : null,
          coded: !!coding
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

    res.json({
      success: true,
      data: {
        responses: filteredResponses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredResponses.length,
          pages: Math.ceil(filteredResponses.length / limit)
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
    const coded = await Coding.countDocuments({ coderRole: 'primary' });
    const uncoded = total - coded;

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
