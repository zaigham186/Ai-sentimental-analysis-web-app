const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { Coding, VideoResponse, Participant, Video } = require('../models');
const { 
  round, 
  calculateValidPercentage, 
  calculateCategoricalDistribution, 
  calculateNumericSummary 
} = require('../utils/researchStatistics');

/**
 * Research Analytics Service
 * Phase 7: Complete Research Analytics, Results, Export & Supervisor Reporting
 * 
 * CORE PRINCIPLES:
 * 1. Final researcher coding is the primary research data source.
 * 2. AI suggestions are analyzed separately for agreement and auditability.
 * 3. Construct separation: Sentiment != Toxicity != Aggression != Cyberbullying.
 * 4. Zero fabrication: strictly report empirical numbers; missing data is preserved.
 * 5. Read-only safety: never modifies participant responses or coding.
 */

class ResearchAnalyticsService {
  /**
   * Sanitizes filter parameters and builds MongoDB queries
   * @param {Object} filters 
   * @returns {Object} { codingQuery, responseQuery, activeFilters }
   */
  buildFilterQuery(filters = {}) {
    const codingQuery = { coderRole: 'primary' };
    const responseQuery = {};
    const activeFilters = {};

    // Condition filter (anonymous | identifiable)
    if (filters.condition && ['anonymous', 'identifiable'].includes(filters.condition)) {
      activeFilters.condition = filters.condition;
    }

    // Video stimulus filter
    if (filters.video && mongoose.Types.ObjectId.isValid(filters.video)) {
      responseQuery.video = new mongoose.Types.ObjectId(filters.video);
      activeFilters.video = filters.video;
    }

    // Final Sentiment filter
    if (filters.sentiment && ['positive', 'neutral', 'negative', 'mixed'].includes(filters.sentiment)) {
      codingQuery.sentiment = filters.sentiment;
      activeFilters.sentiment = filters.sentiment;
    }

    // Final Aggression category filter
    if (filters.aggression && ['none', 'mild', 'moderate', 'severe'].includes(filters.aggression)) {
      codingQuery['aggression.category'] = filters.aggression;
      activeFilters.aggression = filters.aggression;
    }

    // Final Cyberbullying filter
    if (filters.cyberbullying !== undefined && filters.cyberbullying !== '') {
      const isCB = filters.cyberbullying === 'true' || filters.cyberbullying === true;
      codingQuery['cyberbullying.present'] = isCB;
      activeFilters.cyberbullying = isCB;
    }

    // Review Status filter
    if (filters.reviewStatus && ['pending', 'pending_review', 'ai_generated', 'reviewed', 'approved', 'uncertain'].includes(filters.reviewStatus)) {
      codingQuery.reviewStatus = filters.reviewStatus;
      activeFilters.reviewStatus = filters.reviewStatus;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const dateFilter = {};
      if (filters.startDate && !isNaN(Date.parse(filters.startDate))) {
        dateFilter.$gte = new Date(filters.startDate);
        activeFilters.startDate = filters.startDate;
      }
      if (filters.endDate && !isNaN(Date.parse(filters.endDate))) {
        dateFilter.$lte = new Date(filters.endDate);
        activeFilters.endDate = filters.endDate;
      }
      if (Object.keys(dateFilter).length > 0) {
        responseQuery.submittedAt = dateFilter;
      }
    }

    return { codingQuery, responseQuery, activeFilters };
  }

  /**
   * Resolves response IDs matching condition & video response filters
   * @param {Object} responseQuery 
   * @param {string|null} condition 
   * @returns {Promise<Array<mongoose.Types.ObjectId>>}
   */
  async resolveEligibleResponseIds(responseQuery = {}, condition = null) {
    let participantIds = null;
    if (condition) {
      participantIds = await Participant.find({ condition }).distinct('_id');
    }

    const query = { ...responseQuery };
    if (participantIds) {
      query.participant = { $in: participantIds };
    }

    return VideoResponse.find(query).distinct('_id');
  }

  /**
   * Retrieves high-level research summary metrics
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getOverview(filters = {}) {
    const { codingQuery, responseQuery, activeFilters } = this.buildFilterQuery(filters);
    const eligibleResponseIds = await this.resolveEligibleResponseIds(responseQuery, activeFilters.condition);

    const totalResponses = eligibleResponseIds.length;

    // Filter codings to eligible responses
    const scopedCodingQuery = { 
      ...codingQuery, 
      response: { $in: eligibleResponseIds } 
    };

    const allCodings = await Coding.find(scopedCodingQuery);

    // Final Coded: reviewed or approved by researcher
    const finalCoded = allCodings.filter(c => ['reviewed', 'approved'].includes(c.reviewStatus));
    const pendingReview = allCodings.filter(c => ['ai_generated', 'pending_review', 'needs_revision'].includes(c.reviewStatus));
    
    // Uncoded: responses with no coding document or status pending without AI
    const codedResponseIdSet = new Set(allCodings.map(c => c.response.toString()));
    const uncodedCount = totalResponses - codedResponseIdSet.size;

    // Research variable counts (from final researcher coding)
    const cyberbullyingDetected = finalCoded.filter(c => c.cyberbullying?.present === true).length;
    const aggressiveCount = finalCoded.filter(c => 
      c.aggression?.category && ['mild', 'moderate', 'severe'].includes(c.aggression.category)
    ).length;
    const toxicCount = finalCoded.filter(c => c.aiCoding?.toxicity?.is_toxic === true || c.notes?.toLowerCase().includes('toxic')).length;

    const sentimentCounts = {
      positive: finalCoded.filter(c => c.sentiment === 'positive').length,
      neutral: finalCoded.filter(c => c.sentiment === 'neutral').length,
      negative: finalCoded.filter(c => c.sentiment === 'negative').length,
      mixed: finalCoded.filter(c => c.sentiment === 'mixed').length
    };

    const validCodedTotal = finalCoded.length;

    return {
      summary: {
        totalResponses,
        finalCodedCount: validCodedTotal,
        pendingReviewCount: pendingReview.length,
        uncodedCount: Math.max(0, uncodedCount),
        codingCompletionRate: calculateValidPercentage(validCodedTotal, totalResponses),
        cyberbullyingCount: cyberbullyingDetected,
        cyberbullyingRate: calculateValidPercentage(cyberbullyingDetected, validCodedTotal),
        aggressiveCount,
        aggressiveRate: calculateValidPercentage(aggressiveCount, validCodedTotal),
        toxicCount,
        toxicRate: calculateValidPercentage(toxicCount, validCodedTotal)
      },
      sentiment: {
        positive: sentimentCounts.positive,
        neutral: sentimentCounts.neutral,
        negative: sentimentCounts.negative,
        mixed: sentimentCounts.mixed,
        positivePct: calculateValidPercentage(sentimentCounts.positive, validCodedTotal),
        neutralPct: calculateValidPercentage(sentimentCounts.neutral, validCodedTotal),
        negativePct: calculateValidPercentage(sentimentCounts.negative, validCodedTotal)
      },
      activeFilters,
      dataLevel: 'Final Researcher Coding (Primary Gold Dataset)'
    };
  }

  /**
   * Sentiment distribution based on final researcher coding
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getSentimentAnalytics(filters = {}) {
    const { codingQuery, responseQuery, activeFilters } = this.buildFilterQuery(filters);
    const eligibleResponseIds = await this.resolveEligibleResponseIds(responseQuery, activeFilters.condition);

    const codings = await Coding.find({
      ...codingQuery,
      response: { $in: eligibleResponseIds },
      reviewStatus: { $in: ['reviewed', 'approved'] }
    });

    const sentiments = codings.map(c => c.sentiment);
    const distribution = calculateCategoricalDistribution(sentiments, ['positive', 'neutral', 'negative', 'mixed']);

    return {
      distribution,
      totalCoded: codings.length,
      activeFilters,
      constructNote: 'Sentiment reflects affective polarity and is separate from aggression and cyberbullying.'
    };
  }

  /**
   * Toxicity analytics from Detoxify categories and final coding notes
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getToxicityAnalytics(filters = {}) {
    const { codingQuery, responseQuery, activeFilters } = this.buildFilterQuery(filters);
    const eligibleResponseIds = await this.resolveEligibleResponseIds(responseQuery, activeFilters.condition);

    const codings = await Coding.find({
      ...codingQuery,
      response: { $in: eligibleResponseIds },
      reviewStatus: { $in: ['reviewed', 'approved'] }
    });

    let toxicCount = 0;
    let nonToxicCount = 0;
    let missingCount = 0;

    const subcategories = {
      insult: 0,
      threat: 0,
      obscene: 0,
      identity_attack: 0,
      severe_toxicity: 0
    };

    codings.forEach(c => {
      const tox = c.aiCoding?.toxicity;
      if (!tox) {
        missingCount++;
        return;
      }
      if (tox.is_toxic || (tox.overall_score !== undefined && tox.overall_score >= 0.5)) {
        toxicCount++;
      } else {
        nonToxicCount++;
      }

      if (tox.categories) {
        if (tox.categories.insult >= 0.5) subcategories.insult++;
        if (tox.categories.threat >= 0.5) subcategories.threat++;
        if (tox.categories.obscene >= 0.5) subcategories.obscene++;
        if (tox.categories.identity_attack >= 0.5) subcategories.identity_attack++;
        if (tox.categories.severe_toxicity >= 0.5) subcategories.severe_toxicity++;
      }
    });

    const validTotal = toxicCount + nonToxicCount;

    return {
      toxicCount,
      nonToxicCount,
      toxicPercentage: calculateValidPercentage(toxicCount, validTotal),
      nonToxicPercentage: calculateValidPercentage(nonToxicCount, validTotal),
      validTotal,
      missingCount,
      subcategories: {
        insult: { count: subcategories.insult, percentage: calculateValidPercentage(subcategories.insult, validTotal) },
        threat: { count: subcategories.threat, percentage: calculateValidPercentage(subcategories.threat, validTotal) },
        obscene: { count: subcategories.obscene, percentage: calculateValidPercentage(subcategories.obscene, validTotal) },
        identity_attack: { count: subcategories.identity_attack, percentage: calculateValidPercentage(subcategories.identity_attack, validTotal) },
        severe_toxicity: { count: subcategories.severe_toxicity, percentage: calculateValidPercentage(subcategories.severe_toxicity, validTotal) }
      },
      activeFilters,
      constructNote: 'Toxicity measures general hostile or abusive language. Toxicity != Cyberbullying.'
    };
  }

  /**
   * Aggression analytics based on Xu et al. (2020) framework and final coding
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getAggressionAnalytics(filters = {}) {
    const { codingQuery, responseQuery, activeFilters } = this.buildFilterQuery(filters);
    const eligibleResponseIds = await this.resolveEligibleResponseIds(responseQuery, activeFilters.condition);

    const codings = await Coding.find({
      ...codingQuery,
      response: { $in: eligibleResponseIds },
      reviewStatus: { $in: ['reviewed', 'approved'] }
    });

    const categories = codings.map(c => c.aggression?.category || null);
    const levels = codings.map(c => c.aggression?.level);

    const categoryDistribution = calculateCategoricalDistribution(categories, ['none', 'mild', 'moderate', 'severe']);
    const scoreSummary = calculateNumericSummary(levels);

    return {
      categoryDistribution,
      scoreSummary,
      totalCoded: codings.length,
      activeFilters,
      framework: 'Xu et al. (2020) Lexicon Framework & Human Researcher Coding'
    };
  }

  /**
   * Cyberbullying analytics based on research operational definition
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getCyberbullyingAnalytics(filters = {}) {
    const { codingQuery, responseQuery, activeFilters } = this.buildFilterQuery(filters);
    const eligibleResponseIds = await this.resolveEligibleResponseIds(responseQuery, activeFilters.condition);

    const codings = await Coding.find({
      ...codingQuery,
      response: { $in: eligibleResponseIds },
      reviewStatus: { $in: ['reviewed', 'approved'] }
    });

    const presentItems = codings.map(c => {
      if (c.cyberbullying?.present === true) return 'present';
      if (c.cyberbullying?.present === false) return 'absent';
      return null;
    });

    const presenceDistribution = calculateCategoricalDistribution(presentItems, ['present', 'absent']);

    // Typology breakdown for positive cases
    const types = codings
      .filter(c => c.cyberbullying?.present === true)
      .map(c => c.cyberbullying?.type || 'unspecified');

    const typeDistribution = calculateCategoricalDistribution(types, [
      'harassment', 'denigration', 'flaming', 'threat', 'impersonation', 'exclusion', 'other'
    ]);

    const severities = codings
      .filter(c => c.cyberbullying?.present === true)
      .map(c => c.cyberbullying?.severity);
    const severitySummary = calculateNumericSummary(severities);

    return {
      presenceDistribution,
      typeDistribution,
      severitySummary,
      totalCoded: codings.length,
      activeFilters,
      criticalRule: 'Cyberbullying requires hostile intent and personal targeting. Negative sentiment or isolated profanity alone does not constitute cyberbullying.'
    };
  }

  /**
   * Condition comparison (Anonymous vs Identifiable) across all 4 research dimensions
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getConditionComparison(filters = {}) {
    const { codingQuery, responseQuery } = this.buildFilterQuery(filters);

    const [anonymousIds, identifiableIds] = await Promise.all([
      Participant.find({ condition: 'anonymous' }).distinct('_id'),
      Participant.find({ condition: 'identifiable' }).distinct('_id')
    ]);

    const [anonResponses, identResponses] = await Promise.all([
      VideoResponse.find({ ...responseQuery, participant: { $in: anonymousIds } }).distinct('_id'),
      VideoResponse.find({ ...responseQuery, participant: { $in: identifiableIds } }).distinct('_id')
    ]);

    const [anonCodings, identCodings] = await Promise.all([
      Coding.find({ ...codingQuery, response: { $in: anonResponses }, reviewStatus: { $in: ['reviewed', 'approved'] } }),
      Coding.find({ ...codingQuery, response: { $in: identResponses }, reviewStatus: { $in: ['reviewed', 'approved'] } })
    ]);

    const computeConditionMetrics = (responses, codings) => {
      const validTotal = codings.length;
      const cbCount = codings.filter(c => c.cyberbullying?.present === true).length;
      const aggCount = codings.filter(c => c.aggression?.category && ['mild', 'moderate', 'severe'].includes(c.aggression.category)).length;
      const negSentimentCount = codings.filter(c => c.sentiment === 'negative').length;
      const posSentimentCount = codings.filter(c => c.sentiment === 'positive').length;
      const neuSentimentCount = codings.filter(c => c.sentiment === 'neutral').length;

      const aggLevels = codings.map(c => c.aggression?.level);
      const aggStats = calculateNumericSummary(aggLevels);

      return {
        totalResponses: responses.length,
        codedResponses: validTotal,
        cyberbullying: {
          count: cbCount,
          percentage: calculateValidPercentage(cbCount, validTotal)
        },
        aggression: {
          count: aggCount,
          percentage: calculateValidPercentage(aggCount, validTotal),
          meanScore: aggStats.mean
        },
        sentiment: {
          negative: { count: negSentimentCount, percentage: calculateValidPercentage(negSentimentCount, validTotal) },
          positive: { count: posSentimentCount, percentage: calculateValidPercentage(posSentimentCount, validTotal) },
          neutral: { count: neuSentimentCount, percentage: calculateValidPercentage(neuSentimentCount, validTotal) }
        }
      };
    };

    return {
      anonymous: computeConditionMetrics(anonResponses, anonCodings),
      identifiable: computeConditionMetrics(identResponses, identCodings),
      note: 'Descriptive comparison only. No claim of causal relationship or automated statistical significance.'
    };
  }

  /**
   * Video/stimulus comparison across all 4 research dimensions
   * @param {Object} filters 
   * @returns {Promise<Array<Object>>}
   */
  async getVideoComparison(filters = {}) {
    const { codingQuery, responseQuery, activeFilters } = this.buildFilterQuery(filters);

    const videos = await Video.find({ active: true }).sort({ order: 1 });

    const results = await Promise.all(videos.map(async (v) => {
      const videoResponseQuery = { ...responseQuery, video: v._id };
      if (activeFilters.condition) {
        const pIds = await Participant.find({ condition: activeFilters.condition }).distinct('_id');
        videoResponseQuery.participant = { $in: pIds };
      }

      const responseIds = await VideoResponse.find(videoResponseQuery).distinct('_id');
      const codings = await Coding.find({
        ...codingQuery,
        response: { $in: responseIds },
        reviewStatus: { $in: ['reviewed', 'approved'] }
      });

      const validTotal = codings.length;
      const cbCount = codings.filter(c => c.cyberbullying?.present === true).length;
      const aggCount = codings.filter(c => c.aggression?.category && ['mild', 'moderate', 'severe'].includes(c.aggression.category)).length;
      const negCount = codings.filter(c => c.sentiment === 'negative').length;

      return {
        videoId: v._id,
        title: v.title,
        order: v.order,
        responseCount: responseIds.length,
        codedCount: validTotal,
        cyberbullyingRate: calculateValidPercentage(cbCount, validTotal),
        aggressionRate: calculateValidPercentage(aggCount, validTotal),
        negativeSentimentRate: calculateValidPercentage(negCount, validTotal)
      };
    }));

    return results;
  }

  /**
   * AI vs Human agreement analysis and audit tracking
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getAIHumanAgreement(filters = {}) {
    const { codingQuery, responseQuery } = this.buildFilterQuery(filters);
    const eligibleResponseIds = await this.resolveEligibleResponseIds(responseQuery);

    const codings = await Coding.find({
      ...codingQuery,
      response: { $in: eligibleResponseIds },
      aiCoding: { $exists: true, $ne: null }
    }).populate({
      path: 'response',
      select: 'responseText participant video',
      populate: [
        { path: 'participant', select: 'username condition' },
        { path: 'video', select: 'title' }
      ]
    });

    const reviewed = codings.filter(c => ['reviewed', 'approved'].includes(c.reviewStatus));
    const totalReviewed = reviewed.length;

    let acceptedCount = 0;
    let modifiedCount = 0;
    let rejectedCount = 0;
    let pendingCount = codings.filter(c => ['ai_generated', 'pending_review'].includes(c.reviewStatus)).length;

    const discrepancies = [];

    reviewed.forEach(c => {
      const action = c.reviewAction;
      if (action === 'accepted_ai' || action === 'accept') acceptedCount++;
      else if (action === 'modified' || action === 'modify') modifiedCount++;
      else if (action === 'rejected' || action === 'reject') rejectedCount++;

      // Check dimensional agreement
      const aiSent = c.aiCoding?.sentiment?.label;
      const finalSent = c.sentiment;

      const aiAgg = c.aiCoding?.aggression?.label;
      const finalAgg = c.aggression?.category;

      const aiCB = c.aiCoding?.cyberbullying?.present;
      const finalCB = c.cyberbullying?.present;

      const hasDiscrepancy = (aiSent && finalSent && aiSent !== finalSent) ||
                             (aiAgg && finalAgg && aiAgg !== finalAgg) ||
                             (aiCB !== undefined && finalCB !== undefined && aiCB !== finalCB);

      if (hasDiscrepancy) {
        discrepancies.push({
          codingId: c._id,
          responseId: c.response?._id,
          responseTextSnippet: c.response?.responseText ? c.response.responseText.slice(0, 100) + '...' : 'N/A',
          participantCondition: c.response?.participant?.condition || 'unknown',
          videoTitle: c.response?.video?.title || 'Stimulus',
          ai: {
            sentiment: aiSent || 'N/A',
            aggression: aiAgg || 'N/A',
            cyberbullying: aiCB !== undefined ? (aiCB ? 'Yes' : 'No') : 'N/A'
          },
          final: {
            sentiment: finalSent || 'N/A',
            aggression: finalAgg || 'N/A',
            cyberbullying: finalCB !== undefined ? (finalCB ? 'Yes' : 'No') : 'N/A'
          },
          reviewAction: action || 'manual_override',
          reviewedAt: c.reviewedAt
        });
      }
    });

    return {
      summary: {
        totalWithAI: codings.length,
        totalReviewed,
        pendingReview: pendingCount,
        acceptedCount,
        modifiedCount,
        rejectedCount,
        acceptedPercentage: calculateValidPercentage(acceptedCount, totalReviewed),
        modifiedPercentage: calculateValidPercentage(modifiedCount, totalReviewed),
        rejectedPercentage: calculateValidPercentage(rejectedCount, totalReviewed),
        discrepancyCount: discrepancies.length,
        discrepancyRate: calculateValidPercentage(discrepancies.length, totalReviewed)
      },
      reviewActions: {
        accepted: acceptedCount,
        modified: modifiedCount,
        rejected: rejectedCount,
        pending: pendingCount
      },
      discrepancies: discrepancies.slice(0, 50), // Return top 50 for inspection
      note: 'Audit trail tracking researcher decisions vs AI recommendations.'
    };
  }

  /**
   * Paginated research responses table
   * @param {Object} filters 
   * @param {Object} pagination { page, limit, sortBy, sortOrder }
   * @returns {Promise<Object>}
   */
  async getResponsesTable(filters = {}, pagination = {}) {
    const { codingQuery, responseQuery, activeFilters } = this.buildFilterQuery(filters);
    const eligibleResponseIds = await this.resolveEligibleResponseIds(responseQuery, activeFilters.condition);

    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(pagination.limit) || 25));
    const skip = (page - 1) * limit;

    const query = {
      ...codingQuery,
      response: { $in: eligibleResponseIds }
    };

    const totalRecords = await Coding.countDocuments(query);
    const codings = await Coding.find(query)
      .populate({
        path: 'response',
        select: 'responseText submittedAt participant video',
        populate: [
          { path: 'participant', select: 'username condition' },
          { path: 'video', select: 'title order' }
        ]
      })
      .sort({ codedAt: -1 })
      .skip(skip)
      .limit(limit);

    const rows = codings.map(c => ({
      codingId: c._id,
      responseId: c.response?._id,
      participantId: c.response?.participant?.username || 'ANON',
      condition: c.response?.participant?.condition || 'unknown',
      videoTitle: c.response?.video?.title || 'Stimulus',
      videoOrder: c.response?.video?.order || 1,
      responseText: c.response?.responseText || '',
      finalCoding: {
        sentiment: c.sentiment || 'uncoded',
        aggressionCategory: c.aggression?.category || 'uncoded',
        aggressionLevel: c.aggression?.level ?? null,
        cyberbullyingPresent: c.cyberbullying?.present ?? null,
        cyberbullyingType: c.cyberbullying?.type || 'none'
      },
      aiSuggestion: {
        sentiment: c.aiCoding?.sentiment?.label || 'N/A',
        aggression: c.aiCoding?.aggression?.label || 'N/A',
        cyberbullying: c.aiCoding?.cyberbullying?.present ?? null
      },
      reviewStatus: c.reviewStatus,
      reviewAction: c.reviewAction,
      reviewedAt: c.reviewedAt
    }));

    return {
      rows,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    };
  }

  /**
   * Retrieves Phase 6 empirical validation results
   * @returns {Object}
   */
  getValidationSummary() {
    const reportPath = path.join(__dirname, '../../../validation/results/validation_report.json');
    const metricsPath = path.join(__dirname, '../../../validation/results/metrics.json');
    const confPath = path.join(__dirname, '../../../validation/results/confusion_matrices.json');

    if (!fs.existsSync(reportPath)) {
      return {
        is_validated: false,
        validation_status: 'Not validated',
        message: 'VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED'
      };
    }

    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      let metrics = null;
      let confusionMatrices = null;

      if (fs.existsSync(metricsPath)) {
        metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
      }
      if (fs.existsSync(confPath)) {
        confusionMatrices = JSON.parse(fs.readFileSync(confPath, 'utf-8'));
      }

      return {
        is_validated: report.is_validated,
        validation_status: report.validation_status,
        is_synthetic_benchmark: report.is_synthetic_benchmark,
        sample_count: report.sample_count,
        timestamp: report.timestamp,
        models: report.models,
        summary: report.summary,
        threshold_calibration: report.threshold_calibration,
        inter_rater: report.inter_rater,
        confusion_matrices: confusionMatrices,
        metrics: metrics
      };
    } catch (err) {
      console.error('Error reading Phase 6 validation summary:', err);
      return {
        is_validated: false,
        validation_status: 'Error',
        message: 'VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED'
      };
    }
  }

  /**
   * Generates CSV format for research exports
   * @param {Object} filters 
   * @returns {Promise<string>}
   */
  async generateCSV(filters = {}) {
    const { codingQuery, responseQuery, activeFilters } = this.buildFilterQuery(filters);
    const eligibleResponseIds = await this.resolveEligibleResponseIds(responseQuery, activeFilters.condition);

    const codings = await Coding.find({
      ...codingQuery,
      response: { $in: eligibleResponseIds }
    }).populate({
      path: 'response',
      select: 'responseText participant video submittedAt',
      populate: [
        { path: 'participant', select: 'username condition' },
        { path: 'video', select: 'title order' }
      ]
    });

    const headers = [
      'response_id',
      'condition',
      'video_order',
      'video_title',
      'final_sentiment',
      'final_aggression_category',
      'final_aggression_level',
      'final_cyberbullying_present',
      'final_cyberbullying_type',
      'ai_sentiment',
      'ai_aggression_category',
      'ai_cyberbullying_present',
      'review_status',
      'review_action',
      'submitted_at'
    ];

    const lines = [headers.join(',')];

    codings.forEach(c => {
      const escape = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const row = [
        escape(c.response?._id),
        escape(c.response?.participant?.condition),
        escape(c.response?.video?.order),
        escape(c.response?.video?.title),
        escape(c.sentiment),
        escape(c.aggression?.category),
        escape(c.aggression?.level),
        escape(c.cyberbullying?.present),
        escape(c.cyberbullying?.type),
        escape(c.aiCoding?.sentiment?.label),
        escape(c.aiCoding?.aggression?.label),
        escape(c.aiCoding?.cyberbullying?.present),
        escape(c.reviewStatus),
        escape(c.reviewAction),
        escape(c.response?.submittedAt?.toISOString())
      ];
      lines.push(row.join(','));
    });

    return lines.join('\n');
  }

  /**
   * Generates comprehensive supervisor summary report payload
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getSupervisorReport(filters = {}) {
    const [
      overview,
      sentiment,
      toxicity,
      aggression,
      cyberbullying,
      conditionComparison,
      videoComparison,
      aiHuman
    ] = await Promise.all([
      this.getOverview(filters),
      this.getSentimentAnalytics(filters),
      this.getToxicityAnalytics(filters),
      this.getAggressionAnalytics(filters),
      this.getCyberbullyingAnalytics(filters),
      this.getConditionComparison(filters),
      this.getVideoComparison(filters),
      this.getAIHumanAgreement(filters)
    ]);

    const validation = this.getValidationSummary();

    return {
      metadata: {
        project: 'M.Phil Cyberbullying & Aggression Experimental Study',
        generatedAt: new Date().toISOString(),
        filtersApplied: overview.activeFilters,
        primaryCoderFramework: 'Research Operational Multi-Dimensional Framework',
        provenance: 'CardiffNLP Twitter-XLM-RoBERTa + Detoxify Multilingual + Xu et al. (2020) Lexicon'
      },
      overview,
      sentiment,
      toxicity,
      aggression,
      cyberbullying,
      conditionComparison,
      videoComparison,
      aiHuman,
      validation,
      methodologyNote: `
Sentiment, toxicity, aggression, and cyberbullying are treated as distinct analytical constructs.
AI-assisted predictions serve strictly as decision support. Final research coding is determined through the researcher review workflow.
Descriptive statistics divide only by valid coded responses. No causality or automated statistical significance is asserted.
      `.trim()
    };
  }

  /**
   * Helper alias returning flat overview metrics (backward compatibility & test harness support)
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getOverviewMetrics(filters = {}) {
    const overview = await this.getOverview(filters);
    return {
      ...overview,
      totalResponses: overview.summary.totalResponses,
      finalCodedCount: overview.summary.finalCodedCount,
      cyberbullyingRate: overview.summary.cyberbullyingRate,
      codingCompletionRate: overview.summary.codingCompletionRate
    };
  }

  /**
   * Helper alias generating supervisor report with title metadata & array disclaimers
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async generateSupervisorReport(filters = {}) {
    const report = await this.getSupervisorReport(filters);
    return {
      ...report,
      metadata: {
        ...report.metadata,
        title: report.metadata?.title || 'Supervisor Research & Analytics Report'
      },
      methodologyNotes: report.methodologyNotes || [report.methodologyNote]
    };
  }
}

module.exports = new ResearchAnalyticsService();
