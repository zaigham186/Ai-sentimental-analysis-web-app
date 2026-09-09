const { Participant, VideoResponse, Coding } = require('../models');

/**
 * Participant Management Controller
 * Admin view of all participants with statistics
 */

/**
 * Get all participants with statistics
 * GET /api/admin/participants
 */
const getAllParticipants = async (req, res) => {
  try {
    const { condition, status, search, page = 1, limit = 50 } = req.query;

    // Build query
    const query = {};
    
    if (condition) {
      query.condition = condition;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const participants = await Participant.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Participant.countDocuments(query);

    // Get response counts for each participant
    const participantsWithStats = await Promise.all(
      participants.map(async (p) => {
        const responseCount = await VideoResponse.countDocuments({ participant: p._id });
        const codedCount = await Coding.countDocuments({ 
          response: { $in: await VideoResponse.find({ participant: p._id }).distinct('_id') },
          coderRole: 'primary'
        });

        return {
          ...p.toObject(),
          responseCount,
          codedCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        participants: participantsWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve participants'
    });
  }
};

/**
 * Get single participant with full details
 * GET /api/admin/participants/:id
 */
const getParticipantById = async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Get responses
    const responses = await VideoResponse.find({ participant: participant._id })
      .populate('video', 'title order')
      .sort({ submittedAt: 1 });

    // Get coding stats
    const responseIds = responses.map(r => r._id);
    const codings = await Coding.find({ 
      response: { $in: responseIds },
      coderRole: 'primary'
    }).populate('codedBy', 'name username');

    res.json({
      success: true,
      data: {
        participant: participant.toObject(),
        responses: responses.map(r => r.toObject()),
        codings: codings.map(c => c.toObject()),
        stats: {
          totalResponses: responses.length,
          codedResponses: codings.length,
          uncodedResponses: responses.length - codings.length
        }
      }
    });
  } catch (error) {
    console.error('Get participant by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve participant'
    });
  }
};

/**
 * Get participant statistics
 * GET /api/admin/participants/stats
 */
const getStatistics = async (req, res) => {
  try {
    const [
      total,
      anonymous,
      identifiable,
      active,
      completed,
      incomplete,
      withdrawn
    ] = await Promise.all([
      Participant.countDocuments(),
      Participant.countDocuments({ condition: 'anonymous' }),
      Participant.countDocuments({ condition: 'identifiable' }),
      Participant.countDocuments({ status: 'active' }),
      Participant.countDocuments({ status: 'completed' }),
      Participant.countDocuments({ status: 'incomplete' }),
      Participant.countDocuments({ status: 'withdrawn' })
    ]);

    res.json({
      success: true,
      data: {
        total,
        byCondition: {
          anonymous,
          identifiable
        },
        byStatus: {
          active,
          completed,
          incomplete,
          withdrawn
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
  getAllParticipants,
  getParticipantById,
  getStatistics
};
