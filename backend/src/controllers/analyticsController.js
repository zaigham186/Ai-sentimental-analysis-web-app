const { Participant, Video, VideoResponse, Coding } = require('../models');

/**
 * Analytics Controller
 * Phase 11: Analytics + Research Export
 * CRITICAL: Read-only operations - never modify research data
 * CRITICAL: Descriptive statistics only - no inferential testing
 */

/**
 * Get comprehensive analytics dashboard
 * GET /api/admin/analytics/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    // Participant metrics
    const [
      totalParticipants,
      anonymousParticipants,
      identifiableParticipants,
      completedParticipants,
      incompleteParticipants,
      withdrawnParticipants
    ] = await Promise.all([
      Participant.countDocuments(),
      Participant.countDocuments({ condition: 'anonymous' }),
      Participant.countDocuments({ condition: 'identifiable' }),
      Participant.countDocuments({ status: 'completed' }),
      Participant.countDocuments({ status: 'incomplete' }),
      Participant.countDocuments({ status: 'withdrawn' })
    ]);

    // Experiment metrics
    const totalVideos = await Video.countDocuments({ active: true, validationStatus: 'approved' });
    const expectedResponses = totalParticipants * totalVideos;
    const submittedResponses = await VideoResponse.countDocuments();
    
    const completedExperiments = await Participant.countDocuments({ 
      status: 'completed',
      experimentCompleted: true 
    });
    
    const incompleteExperiments = totalParticipants - completedExperiments;
    const avgResponsesPerParticipant = totalParticipants > 0 
      ? (submittedResponses / totalParticipants).toFixed(2) 
      : 0;
    const responseCompletionRate = expectedResponses > 0 
      ? ((submittedResponses / expectedResponses) * 100).toFixed(1) 
      : 0;

    // Coding metrics
    const totalResponses = submittedResponses;
    const codedResponses = await Coding.countDocuments({ coderRole: 'primary' });
    const uncodedResponses = totalResponses - codedResponses;
    const codingCompletionRate = totalResponses > 0 
      ? ((codedResponses / totalResponses) * 100).toFixed(1) 
      : 0;

    res.json({
      success: true,
      data: {
        participants: {
          total: totalParticipants,
          anonymous: anonymousParticipants,
          identifiable: identifiableParticipants,
          completed: completedParticipants,
          incomplete: incompleteParticipants,
          withdrawn: withdrawnParticipants
        },
        experiment: {
          totalVideos,
          expectedResponses,
          submittedResponses,
          completedExperiments,
          incompleteExperiments,
          avgResponsesPerParticipant: parseFloat(avgResponsesPerParticipant),
          responseCompletionRate: parseFloat(responseCompletionRate)
        },
        coding: {
          totalResponses,
          codedResponses,
          uncodedResponses,
          codingCompletionRate: parseFloat(codingCompletionRate)
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics'
    });
  }
};

/**
 * Get condition comparison (descriptive only)
 * GET /api/admin/analytics/condition-comparison
 */
const getConditionComparison = async (req, res) => {
  try {
    // Anonymous condition
    const anonymousParticipants = await Participant.find({ condition: 'anonymous' });
    const anonymousIds = anonymousParticipants.map(p => p._id);
    const anonymousCompleted = anonymousParticipants.filter(p => p.status === 'completed').length;
    const anonymousIncomplete = anonymousParticipants.filter(p => p.status === 'incomplete').length;
    const anonymousWithdrawn = anonymousParticipants.filter(p => p.status === 'withdrawn').length;
    const anonymousResponses = await VideoResponse.find({ participant: { $in: anonymousIds } });
    const anonymousCoded = await Coding.countDocuments({ 
      response: { $in: anonymousResponses.map(r => r._id) },
      coderRole: 'primary'
    });

    // Calculate mean aggression for anonymous
    const anonymousCodings = await Coding.find({ 
      response: { $in: anonymousResponses.map(r => r._id) },
      coderRole: 'primary',
      'aggression.level': { $exists: true, $ne: null }
    });
    const anonymousMeanAggression = anonymousCodings.length > 0
      ? (anonymousCodings.reduce((sum, c) => sum + (c.aggression?.level || 0), 0) / anonymousCodings.length).toFixed(2)
      : null;

    // Identifiable condition
    const identifiableParticipants = await Participant.find({ condition: 'identifiable' });
    const identifiableIds = identifiableParticipants.map(p => p._id);
    const identifiableCompleted = identifiableParticipants.filter(p => p.status === 'completed').length;
    const identifiableIncomplete = identifiableParticipants.filter(p => p.status === 'incomplete').length;
    const identifiableWithdrawn = identifiableParticipants.filter(p => p.status === 'withdrawn').length;
    const identifiableResponses = await VideoResponse.find({ participant: { $in: identifiableIds } });
    const identifiableCoded = await Coding.countDocuments({ 
      response: { $in: identifiableResponses.map(r => r._id) },
      coderRole: 'primary'
    });

    // Calculate mean aggression for identifiable
    const identifiableCodings = await Coding.find({ 
      response: { $in: identifiableResponses.map(r => r._id) },
      coderRole: 'primary',
      'aggression.level': { $exists: true, $ne: null }
    });
    const identifiableMeanAggression = identifiableCodings.length > 0
      ? (identifiableCodings.reduce((sum, c) => sum + (c.aggression?.level || 0), 0) / identifiableCodings.length).toFixed(2)
      : null;

    // Sentiment distributions
    const anonymousSentiment = await Coding.aggregate([
      { $match: { 
        response: { $in: anonymousResponses.map(r => r._id) },
        coderRole: 'primary',
        sentiment: { $exists: true, $ne: null }
      }},
      { $group: { _id: '$sentiment', count: { $sum: 1 } }}
    ]);

    const identifiableSentiment = await Coding.aggregate([
      { $match: { 
        response: { $in: identifiableResponses.map(r => r._id) },
        coderRole: 'primary',
        sentiment: { $exists: true, $ne: null }
      }},
      { $group: { _id: '$sentiment', count: { $sum: 1 } }}
    ]);

    // Cyberbullying distributions
    const anonymousCyberbullying = await Coding.aggregate([
      { $match: { 
        response: { $in: anonymousResponses.map(r => r._id) },
        coderRole: 'primary',
        'cyberbullying.present': { $exists: true, $ne: null }
      }},
      { $group: { _id: '$cyberbullying.present', count: { $sum: 1 } }}
    ]);

    const identifiableCyberbullying = await Coding.aggregate([
      { $match: { 
        response: { $in: identifiableResponses.map(r => r._id) },
        coderRole: 'primary',
        'cyberbullying.present': { $exists: true, $ne: null }
      }},
      { $group: { _id: '$cyberbullying.present', count: { $sum: 1 } }}
    ]);

    res.json({
      success: true,
      data: {
        anonymous: {
          participantCount: anonymousParticipants.length,
          completedCount: anonymousCompleted,
          incompleteCount: anonymousIncomplete,
          withdrawnCount: anonymousWithdrawn,
          completionRate: anonymousParticipants.length > 0 
            ? ((anonymousCompleted / anonymousParticipants.length) * 100).toFixed(1)
            : 0,
          totalResponses: anonymousResponses.length,
          avgResponsesPerParticipant: anonymousParticipants.length > 0
            ? (anonymousResponses.length / anonymousParticipants.length).toFixed(2)
            : 0,
          codedResponses: anonymousCoded,
          uncodedResponses: anonymousResponses.length - anonymousCoded,
          meanAggressionScore: anonymousMeanAggression ? parseFloat(anonymousMeanAggression) : null,
          sentimentDistribution: anonymousSentiment.reduce((acc, s) => {
            acc[s._id] = s.count;
            return acc;
          }, {}),
          cyberbullyingDistribution: anonymousCyberbullying.reduce((acc, c) => {
            acc[c._id ? 'present' : 'absent'] = c.count;
            return acc;
          }, {})
        },
        identifiable: {
          participantCount: identifiableParticipants.length,
          completedCount: identifiableCompleted,
          incompleteCount: identifiableIncomplete,
          withdrawnCount: identifiableWithdrawn,
          completionRate: identifiableParticipants.length > 0 
            ? ((identifiableCompleted / identifiableParticipants.length) * 100).toFixed(1)
            : 0,
          totalResponses: identifiableResponses.length,
          avgResponsesPerParticipant: identifiableParticipants.length > 0
            ? (identifiableResponses.length / identifiableParticipants.length).toFixed(2)
            : 0,
          codedResponses: identifiableCoded,
          uncodedResponses: identifiableResponses.length - identifiableCoded,
          meanAggressionScore: identifiableMeanAggression ? parseFloat(identifiableMeanAggression) : null,
          sentimentDistribution: identifiableSentiment.reduce((acc, s) => {
            acc[s._id] = s.count;
            return acc;
          }, {}),
          cyberbullyingDistribution: identifiableCyberbullying.reduce((acc, c) => {
            acc[c._id ? 'present' : 'absent'] = c.count;
            return acc;
          }, {})
        },
        note: 'Descriptive comparison only. No inferential statistical testing performed.'
      }
    });
  } catch (error) {
    console.error('Get condition comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve condition comparison'
    });
  }
};

/**
 * Get video/response analytics
 * GET /api/admin/analytics/video-responses
 */
const getVideoResponseAnalytics = async (req, res) => {
  try {
    const videos = await Video.find({ 
      active: true, 
      validationStatus: 'approved' 
    }).sort({ order: 1 });

    const totalParticipants = await Participant.countDocuments();

    const videoAnalytics = await Promise.all(videos.map(async (video) => {
      const responses = await VideoResponse.find({ video: video._id });
      const expected = totalParticipants;
      const submitted = responses.length;
      const missing = expected - submitted;
      const completionPercentage = expected > 0 ? ((submitted / expected) * 100).toFixed(1) : 0;

      // By condition
      const anonymousResponses = await VideoResponse.countDocuments({
        video: video._id,
        participant: { $in: await Participant.find({ condition: 'anonymous' }).distinct('_id') }
      });

      const identifiableResponses = await VideoResponse.countDocuments({
        video: video._id,
        participant: { $in: await Participant.find({ condition: 'identifiable' }).distinct('_id') }
      });

      return {
        videoId: video._id,
        videoTitle: video.title,
        videoOrder: video.order,
        expected,
        submitted,
        missing,
        completionPercentage: parseFloat(completionPercentage),
        byCondition: {
          anonymous: anonymousResponses,
          identifiable: identifiableResponses
        }
      };
    }));

    res.json({
      success: true,
      data: videoAnalytics
    });
  } catch (error) {
    console.error('Get video response analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve video response analytics'
    });
  }
};

/**
 * Get coding analytics
 * GET /api/admin/analytics/coding
 */
const getCodingAnalytics = async (req, res) => {
  try {
    const totalResponses = await VideoResponse.countDocuments();
    const codedResponses = await Coding.countDocuments({ coderRole: 'primary' });
    const uncodedResponses = totalResponses - codedResponses;
    const codingCompletionPercentage = totalResponses > 0 
      ? ((codedResponses / totalResponses) * 100).toFixed(1) 
      : 0;

    // Aggression distribution
    const aggressionDistribution = await Coding.aggregate([
      { $match: { coderRole: 'primary', 'aggression.category': { $exists: true, $ne: null } }},
      { $group: { _id: '$aggression.category', count: { $sum: 1 } }}
    ]);

    // Sentiment distribution
    const sentimentDistribution = await Coding.aggregate([
      { $match: { coderRole: 'primary', sentiment: { $exists: true, $ne: null } }},
      { $group: { _id: '$sentiment', count: { $sum: 1 } }}
    ]);

    // Cyberbullying distribution
    const cyberbullyingDistribution = await Coding.aggregate([
      { $match: { coderRole: 'primary', 'cyberbullying.present': { $exists: true, $ne: null } }},
      { $group: { _id: '$cyberbullying.present', count: { $sum: 1 } }}
    ]);

    res.json({
      success: true,
      data: {
        totalResponses,
        codedResponses,
        uncodedResponses,
        codingCompletionPercentage: parseFloat(codingCompletionPercentage),
        distributions: {
          aggression: aggressionDistribution.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
          sentiment: sentimentDistribution.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {}),
          cyberbullying: cyberbullyingDistribution.reduce((acc, item) => {
            acc[item._id ? 'present' : 'absent'] = item.count;
            return acc;
          }, {})
        },
        note: 'Descriptive distributions only. Values stored by researcher/coder.'
      }
    });
  } catch (error) {
    console.error('Get coding analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve coding analytics'
    });
  }
};

/**
 * Get aggression analytics
 * GET /api/admin/analytics/aggression
 */
const getAggressionAnalytics = async (req, res) => {
  try {
    const codings = await Coding.find({ 
      coderRole: 'primary',
      'aggression.level': { $exists: true, $ne: null }
    }).populate({
      path: 'response',
      populate: { path: 'participant', select: 'condition' }
    });

    const codedResponsesCount = codings.length;

    if (codedResponsesCount === 0) {
      return res.json({
        success: true,
        data: {
          codedResponsesCount: 0,
          note: 'No aggression coding data available'
        }
      });
    }

    const levels = codings.map(c => c.aggression.level);
    const meanScore = (levels.reduce((sum, l) => sum + l, 0) / levels.length).toFixed(2);
    const minScore = Math.min(...levels);
    const maxScore = Math.max(...levels);

    // By condition
    const anonymousCodings = codings.filter(c => c.response?.participant?.condition === 'anonymous');
    const identifiableCodings = codings.filter(c => c.response?.participant?.condition === 'identifiable');

    const anonymousMean = anonymousCodings.length > 0
      ? (anonymousCodings.reduce((sum, c) => sum + c.aggression.level, 0) / anonymousCodings.length).toFixed(2)
      : null;

    const identifiableMean = identifiableCodings.length > 0
      ? (identifiableCodings.reduce((sum, c) => sum + c.aggression.level, 0) / identifiableCodings.length).toFixed(2)
      : null;

    // Category distribution
    const categoryDistribution = await Coding.aggregate([
      { $match: { coderRole: 'primary', 'aggression.category': { $exists: true, $ne: null } }},
      { $group: { _id: '$aggression.category', count: { $sum: 1 } }}
    ]);

    res.json({
      success: true,
      data: {
        codedResponsesCount,
        meanScore: parseFloat(meanScore),
        minScore,
        maxScore,
        byCondition: {
          anonymous: {
            count: anonymousCodings.length,
            meanScore: anonymousMean ? parseFloat(anonymousMean) : null
          },
          identifiable: {
            count: identifiableCodings.length,
            meanScore: identifiableMean ? parseFloat(identifiableMean) : null
          }
        },
        categoryDistribution: categoryDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        note: 'Descriptive summary only. No claim of statistical significance or causation.'
      }
    });
  } catch (error) {
    console.error('Get aggression analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve aggression analytics'
    });
  }
};

module.exports = {
  getDashboard,
  getConditionComparison,
  getVideoResponseAnalytics,
  getCodingAnalytics,
  getAggressionAnalytics
};
