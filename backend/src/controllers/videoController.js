const { Video } = require('../models');

/**
 * Video Management Controller
 * Phase 9: Video Stimulus Management
 * CRITICAL: Only approved + active videos shown to participants
 */

/**
 * Get all videos (admin view)
 * GET /api/admin/videos
 */
const getAllVideos = async (req, res) => {
  try {
    const { status, active, search } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.validationStatus = status;
    }
    
    if (active !== undefined) {
      query.active = active === 'true';
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const videos = await Video.find(query)
      .sort({ order: 1 })
      .populate('validatedBy', 'name username');

    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    console.error('Get all videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve videos'
    });
  }
};

/**
 * Get video by ID (admin view)
 * GET /api/admin/videos/:id
 */
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('validatedBy', 'name username');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Get video by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve video'
    });
  }
};

/**
 * Create new video
 * POST /api/admin/videos
 */
const createVideo = async (req, res) => {
  try {
    const {
      title,
      topic,
      description,
      videoUrl,
      duration,
      order,
      active,
      version,
      metadata
    } = req.body;

    // Check for duplicate order
    const existingOrder = await Video.findOne({ order });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: `Order ${order} is already used by another video`
      });
    }

    // Create video
    const video = await Video.create({
      title,
      topic,
      description,
      videoUrl,
      duration,
      order,
      active: active !== undefined ? active : true,
      validationStatus: 'candidate',
      version: version || '1.0',
      metadata: metadata || {}
    });

    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: video
    });
  } catch (error) {
    console.error('Create video error:', error);
    
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
      message: 'Failed to create video'
    });
  }
};

/**
 * Update video
 * PUT /api/admin/videos/:id
 */
const updateVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const {
      title,
      topic,
      description,
      videoUrl,
      duration,
      order,
      active,
      version,
      metadata
    } = req.body;

    // Check for duplicate order (excluding current video)
    if (order && order !== video.order) {
      const existingOrder = await Video.findOne({ 
        order, 
        _id: { $ne: video._id } 
      });
      
      if (existingOrder) {
        return res.status(400).json({
          success: false,
          message: `Order ${order} is already used by another video`
        });
      }
    }

    // Update fields
    if (title !== undefined) video.title = title;
    if (topic !== undefined) video.topic = topic;
    if (description !== undefined) video.description = description;
    if (videoUrl !== undefined) video.videoUrl = videoUrl;
    if (duration !== undefined) video.duration = duration;
    if (order !== undefined) video.order = order;
    if (active !== undefined) video.active = active;
    if (version !== undefined) video.version = version;
    if (metadata !== undefined) video.metadata = metadata;

    await video.save();

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: video
    });
  } catch (error) {
    console.error('Update video error:', error);
    
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
      message: 'Failed to update video'
    });
  }
};

/**
 * Delete video
 * DELETE /api/admin/videos/:id
 */
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if video has been used in responses
    const { VideoResponse } = require('../models');
    const responseCount = await VideoResponse.countDocuments({ videoId: video._id });

    if (responseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete video. It has ${responseCount} participant responses. Deactivate instead.`
      });
    }

    await video.deleteOne();

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
};

/**
 * Approve video
 * POST /api/admin/videos/:id/approve
 */
const approveVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const { notes } = req.body;
    await video.approve(req.admin.id, notes);

    res.json({
      success: true,
      message: 'Video approved successfully',
      data: video
    });
  } catch (error) {
    console.error('Approve video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve video'
    });
  }
};

/**
 * Reject video
 * POST /api/admin/videos/:id/reject
 */
const rejectVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const { notes } = req.body;

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection notes are required'
      });
    }

    await video.reject(req.admin.id, notes);

    res.json({
      success: true,
      message: 'Video rejected successfully',
      data: video
    });
  } catch (error) {
    console.error('Reject video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject video'
    });
  }
};

/**
 * Validate stimulus set (exactly 10 approved active videos)
 * GET /api/admin/videos/validate-set
 */
const validateStimulusSet = async (req, res) => {
  try {
    const approvedActiveVideos = await Video.getApprovedActive();
    const count = approvedActiveVideos.length;

    const result = {
      valid: count === 10,
      count: count,
      expected: 10,
      status: count === 10 ? 'ready' : count < 10 ? 'insufficient' : 'excess',
      message: count === 10 
        ? 'Stimulus set is valid (exactly 10 approved active videos)'
        : count < 10 
          ? `Insufficient videos: ${count}/10 approved active videos`
          : `Excess videos: ${count}/10 approved active videos`,
      videos: approvedActiveVideos.map(v => ({
        id: v._id,
        order: v.order,
        title: v.title,
        version: v.version
      }))
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Validate stimulus set error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate stimulus set'
    });
  }
};

/**
 * Get statistics
 * GET /api/admin/videos/stats
 */
const getStatistics = async (req, res) => {
  try {
    const [
      total,
      candidate,
      underReview,
      approved,
      rejected,
      active,
      inactive,
      approvedActive
    ] = await Promise.all([
      Video.countDocuments(),
      Video.countByStatus('candidate'),
      Video.countByStatus('under_review'),
      Video.countByStatus('approved'),
      Video.countByStatus('rejected'),
      Video.countDocuments({ active: true }),
      Video.countDocuments({ active: false }),
      Video.countDocuments({ active: true, validationStatus: 'approved' })
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: {
          candidate,
          underReview,
          approved,
          rejected
        },
        byActive: {
          active,
          inactive
        },
        approvedActive,
        stimulusSetValid: approvedActive === 10
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
  getAllVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  approveVideo,
  rejectVideo,
  validateStimulusSet,
  getStatistics
};
