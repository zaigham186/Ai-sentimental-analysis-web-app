const { Participant, Video, VideoResponse, AuditLog } = require('../models');
const { getDisplayName } = require('./conditionController');

/**
 * Experiment Controller
 * Handles video-based experiment flow
 * CRITICAL: Enforces sequential video completion, prevents skipping
 */

/**
 * Start experiment
 * POST /api/experiment/start
 * Initializes experiment session (idempotent)
 */
const startExperiment = async (req, res) => {
  try {
    const participant = req.participant;

    // Verify participant is ready to start
    if (!participant.consentGiven) {
      return res.status(400).json({
        success: false,
        message: 'Consent required before starting experiment'
      });
    }

    if (!participant.conditionAssigned || !participant.condition) {
      return res.status(400).json({
        success: false,
        message: 'Condition assignment required before starting experiment'
      });
    }

    // Check if already started (idempotent)
    if (participant.experimentStartedAt) {
      return res.json({
        success: true,
        message: 'Experiment already in progress',
        data: {
          startedAt: participant.experimentStartedAt,
          currentVideo: participant.currentVideo,
          completedVideos: participant.completedVideos.length
        }
      });
    }

    // Get first approved active video
    const videos = await Video.getApprovedActive();
    
    if (videos.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No approved videos available. Please contact the research team.'
      });
    }

    // Start experiment
    participant.experimentStartedAt = new Date();
    participant.currentVideo = videos[0]._id;
    await participant.save();

    // Log experiment start
    await AuditLog.logAction({
      action: 'experiment_started',
      category: 'experiment',
      actorType: 'participant',
      actorId: participant._id.toString(),
      actorUsername: participant.username,
      details: {
        condition: participant.condition,
        firstVideo: videos[0]._id.toString(),
        totalVideos: videos.length
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    res.json({
      success: true,
      message: 'Experiment started successfully',
      data: {
        startedAt: participant.experimentStartedAt,
        totalVideos: videos.length
      }
    });

  } catch (error) {
    console.error('Start experiment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start experiment'
    });
  }
};

/**
 * Get current video
 * GET /api/experiment/current
 * Returns the video participant should complete next
 */
const getCurrentVideo = async (req, res) => {
  try {
    const participant = req.participant;

    // Check if experiment started
    if (!participant.experimentStartedAt) {
      return res.status(400).json({
        success: false,
        message: 'Experiment not started',
        code: 'NOT_STARTED'
      });
    }

    // Check if experiment completed
    const videos = await Video.getApprovedActive();
    if (participant.completedVideos.length >= videos.length) {
      return res.json({
        success: true,
        message: 'All videos completed',
        code: 'COMPLETED',
        data: {
          completed: true,
          totalVideos: videos.length
        }
      });
    }

    // Get current video
    if (!participant.currentVideo) {
      return res.status(500).json({
        success: false,
        message: 'Invalid experiment state. Please contact the research team.'
      });
    }

    const currentVideo = await Video.findById(participant.currentVideo);
    
    if (!currentVideo || !currentVideo.active || currentVideo.validationStatus !== 'approved') {
      return res.status(500).json({
        success: false,
        message: 'Current video unavailable. Please contact the research team.'
      });
    }

    // Check if participant already submitted response for this video
    const existingResponse = await VideoResponse.findOne({
      participant: participant._id,
      video: currentVideo._id
    });

    // Get display name based on condition
    const displayName = getDisplayName(participant);

    // Calculate progress
    const progress = {
      current: participant.completedVideos.length + 1,
      total: videos.length,
      completed: participant.completedVideos.length,
      hasResponse: !!existingResponse
    };

    res.json({
      success: true,
      data: {
        video: {
          id: currentVideo._id,
          title: currentVideo.title,
          description: currentVideo.description,
          videoUrl: currentVideo.videoUrl,
          duration: currentVideo.duration,
          order: currentVideo.order
        },
        progress,
        displayName,
        condition: participant.condition,
        notice: participant.condition === 'anonymous' 
          ? 'You are participating anonymously. Your responses are shown and stored as "Unknown User".'
          : 'Your identity is visible in your responses.'
      }
    });

  } catch (error) {
    console.error('Get current video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load video'
    });
  }
};

/**
 * Submit video response
 * POST /api/experiment/respond
 * Stores participant response and advances to next video
 */
const submitResponse = async (req, res) => {
  try {
    const participant = req.participant;
    const { responseText, responseTime } = req.body;

    // Verify experiment started
    if (!participant.experimentStartedAt) {
      return res.status(400).json({
        success: false,
        message: 'Experiment not started'
      });
    }

    // Verify current video
    if (!participant.currentVideo) {
      return res.status(400).json({
        success: false,
        message: 'No current video assigned'
      });
    }

    // Validate response text
    if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      });
    }

    // Get current video
    const currentVideo = await Video.findById(participant.currentVideo);
    if (!currentVideo) {
      return res.status(500).json({
        success: false,
        message: 'Current video not found'
      });
    }

    // Check for existing response (idempotency)
    const existingResponse = await VideoResponse.findOne({
      participant: participant._id,
      video: currentVideo._id
    });

    let videoResponse;

    if (existingResponse) {
      // Response already exists - return success (idempotent)
      videoResponse = existingResponse;
      
      console.log('Duplicate response attempt prevented:', {
        participant: participant.username,
        video: currentVideo.order
      });

    } else {
      // Create new response
      const trimmedText = responseText.trim();
      const wordCount = trimmedText.split(/\s+/).filter(w => w.length > 0).length;
      
      videoResponse = await VideoResponse.create({
        participant: participant._id,
        video: currentVideo._id,
        responseText: trimmedText,
        responseLength: trimmedText.length,  // ADDED - calculate length
        responseWordCount: wordCount,         // ADDED - calculate word count
        responseTime: responseTime || null,
        submittedAt: new Date()
      });

      // Update participant progress
      participant.completedVideos.push(currentVideo._id);

      // Get next video
      const videos = await Video.getApprovedActive();
      const currentIndex = videos.findIndex(v => v._id.equals(currentVideo._id));
      const nextIndex = currentIndex + 1;

      if (nextIndex < videos.length) {
        // Move to next video
        participant.currentVideo = videos[nextIndex]._id;
      } else {
        // All videos completed
        participant.currentVideo = null;
      }

      await participant.save();

      // Log response submission
      await AuditLog.logAction({
        action: 'video_response_submitted',
        category: 'experiment',
        actorType: 'participant',
        actorId: participant._id.toString(),
        actorUsername: participant.username,
        details: {
          video: currentVideo._id.toString(),
          videoOrder: currentVideo.order,
          responseLength: responseText.trim().length,
          completedCount: participant.completedVideos.length,
          totalVideos: videos.length
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: true
      });
    }

    // Check if experiment completed
    const videos = await Video.getApprovedActive();
    const allCompleted = participant.completedVideos.length >= videos.length;

    res.json({
      success: true,
      message: 'Response submitted successfully',
      data: {
        responseId: videoResponse._id,
        completed: participant.completedVideos.length,
        total: videos.length,
        allCompleted,
        nextVideo: allCompleted ? null : participant.currentVideo
      }
    });

  } catch (error) {
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      console.error('Duplicate response race condition:', error);
      return res.status(409).json({
        success: false,
        message: 'Response already submitted for this video',
        code: 'DUPLICATE_RESPONSE'
      });
    }

    console.error('Submit response error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit response'
    });
  }
};

/**
 * Get experiment progress
 * GET /api/experiment/progress
 * Returns current participant progress
 */
const getProgress = async (req, res) => {
  try {
    const participant = req.participant;

    // Get total videos
    const videos = await Video.getApprovedActive();
    const totalVideos = videos.length;

    // Calculate progress
    const completedCount = participant.completedVideos.length;
    const allCompleted = completedCount >= totalVideos;

    let currentVideoInfo = null;
    if (participant.currentVideo && !allCompleted) {
      const currentVideo = await Video.findById(participant.currentVideo);
      if (currentVideo) {
        currentVideoInfo = {
          id: currentVideo._id,
          title: currentVideo.title,
          order: currentVideo.order
        };
      }
    }

    res.json({
      success: true,
      data: {
        experimentStarted: !!participant.experimentStartedAt,
        startedAt: participant.experimentStartedAt,
        completed: completedCount,
        total: totalVideos,
        percentage: totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0,
        allCompleted,
        currentVideo: currentVideoInfo,
        condition: participant.condition,
        displayName: getDisplayName(participant)
      }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load progress'
    });
  }
};

/**
 * Complete experiment
 * POST /api/experiment/complete
 * Marks experiment as complete and transitions to questionnaires
 */
const completeExperiment = async (req, res) => {
  try {
    const participant = req.participant;

    // Verify experiment started
    if (!participant.experimentStartedAt) {
      return res.status(400).json({
        success: false,
        message: 'Experiment not started'
      });
    }

    // Verify all videos completed
    const videos = await Video.getApprovedActive();
    if (participant.completedVideos.length < videos.length) {
      return res.status(400).json({
        success: false,
        message: 'All videos must be completed before finishing',
        data: {
          completed: participant.completedVideos.length,
          total: videos.length,
          remaining: videos.length - participant.completedVideos.length
        }
      });
    }

    // Verify all responses exist
    const responseCount = await VideoResponse.countDocuments({
      participant: participant._id
    });

    if (responseCount < videos.length) {
      return res.status(400).json({
        success: false,
        message: 'All video responses must be submitted',
        data: {
          submitted: responseCount,
          required: videos.length
        }
      });
    }

    // Mark as completed (idempotent)
    if (!participant.completedAt) {
      participant.completedAt = new Date();
      participant.status = 'completed';
      await participant.save();

      // Log completion
      await AuditLog.logAction({
        action: 'experiment_completed',
        category: 'experiment',
        actorType: 'participant',
        actorId: participant._id.toString(),
        actorUsername: participant.username,
        details: {
          videosCompleted: participant.completedVideos.length,
          responsesSubmitted: responseCount,
          experimentDuration: participant.completedAt - participant.experimentStartedAt
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: true
      });
    }

    res.json({
      success: true,
      message: 'Experiment completed successfully',
      data: {
        completedAt: participant.completedAt,
        videosCompleted: participant.completedVideos.length,
        nextStep: 'questionnaires'
      }
    });

  } catch (error) {
    console.error('Complete experiment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete experiment'
    });
  }
};

module.exports = {
  startExperiment,
  getCurrentVideo,
  submitResponse,
  getProgress,
  completeExperiment
};
