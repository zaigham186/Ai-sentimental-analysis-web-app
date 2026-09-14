const axios = require('axios');
const { CodingProvider, RuleBasedProvider } = require('./codingAI');

/**
 * NLP Provider (Phase 4)
 * Connects Express CodingAIService to the Python FastAPI NLP Service
 * 
 * Features:
 * - Real Deep Learning Sentiment Analysis (cardiffnlp/twitter-xlm-roberta-base-sentiment)
 * - Multilingual Toxicity Detection (detoxify-multilingual)
 * - Research Aggression Analyzer (Xu et al., 2020 operational framework)
 * - Research Cyberbullying Analyzer (Multi-dimensional operational criteria)
 * - Graceful and auditable fallback to RuleBasedProvider
 * - Privacy-preserving logging (NEVER logs participant responseText)
 */
class NLPProvider extends CodingProvider {
  constructor(options = {}) {
    super({
      ...options,
      name: 'nlp',
      version: '1.0'
    });

    this.url = options.url || process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001';
    this.timeout = options.timeout || parseInt(process.env.NLP_SERVICE_TIMEOUT_MS, 10) || 30000;
    this.fallbackEnabled = options.fallbackEnabled !== undefined
      ? options.fallbackEnabled
      : (process.env.NLP_FALLBACK_ENABLED !== 'false');
    this.fallbackProvider = options.fallbackProvider || new RuleBasedProvider();
  }

  /**
   * Health check for Python FastAPI service
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.url}/health`, {
        timeout: Math.min(this.timeout, 5000)
      });
      return {
        healthy: response.status === 200 && response.data?.status === 'healthy',
        modelsLoaded: response.data?.models_loaded || {},
        device: response.data?.device || 'cpu',
        version: response.data?.version || 'unknown'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.code || error.message
      };
    }
  }

  /**
   * Primary analysis method fulfilling the CodingProvider contract
   * @param {string} text - Response text to analyze (never modified)
   * @param {object} context - Research context (condition, videoTopic, etc.)
   */
  async analyzeResponse(text, context = {}) {
    const startTime = Date.now();

    // Check for empty text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        sentiment: {
          label: null,
          confidence: 0,
          score: 0,
          evidence: 'Empty or invalid response text',
          needsReview: true
        },
        aggression: {
          label: 'none',
          level: 0,
          score: 0,
          normalizedScore: 0,
          confidence: 0,
          evidence: 'Empty or invalid response text',
          matchedIndicators: [],
          categories: [],
          isPersonallyTargeted: false,
          method: 'Aggression Lexicon Model (Xu et al., 2020)',
          needsReview: true
        },
        cyberbullying: {
          present: false,
          classification: 'insufficient_evidence',
          type: 'none',
          severity: 0,
          rawSeverity: 0,
          score: 0,
          confidence: 0,
          evidence: 'Empty or invalid response text',
          criteriaMatched: [],
          reasonCodes: ['INSUFFICIENT_EVIDENCE'],
          method: 'Research Operational Definition (Multi-dimensional Assessment)',
          limitations: [],
          needsReview: true
        },
        metadata: {
          provider: this.name,
          version: this.version,
          fallback_used: false,
          analyzedAt: new Date().toISOString()
        }
      };
    }

    try {
      // Call Python FastAPI NLP service
      const response = await axios.post(
        `${this.url}/analyze`,
        {
          text,
          context: {
            condition: context.condition,
            videoTopic: context.videoTopic,
            videoOrder: context.videoOrder
          }
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const durationMs = Date.now() - startTime;

      // Validate response structure
      const payload = response.data;
      if (!payload || !payload.success || !payload.sentiment || !payload.toxicity || !payload.aggression || !payload.cyberbullying) {
        throw new Error('Invalid or incomplete response from NLP service');
      }

      // Safe logging (no participant text)
      console.log(`[NLPProvider] Success: requestId=${payload.request_id || 'unknown'} duration=${durationMs}ms`);

      return this._mapNLPResponse(payload, durationMs);

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorCode = error.code || (error.response ? `HTTP_${error.response.status}` : 'UNKNOWN_ERROR');

      // Safe logging without participant text
      console.warn(`[NLPProvider] Analysis failed (${errorCode}: ${error.message}) after ${durationMs}ms. [No participant text logged]`);

      if (this.fallbackEnabled && this.fallbackProvider) {
        console.log('[NLPProvider] Initiating fallback to RuleBasedProvider...');
        const fallbackResult = await this.fallbackProvider.analyzeResponse(text, context);

        // Explicitly annotate fallback provenance
        fallbackResult.metadata = {
          ...(fallbackResult.metadata || {}),
          provider: 'rule-based',
          primary_provider: 'nlp',
          fallback_used: true,
          fallback_reason: error.code === 'ECONNABORTED'
            ? 'NLP service timeout'
            : (error.code === 'ECONNREFUSED' ? 'NLP service connection refused' : (error.message || 'NLP service unavailable')),
          fallback_at: new Date().toISOString()
        };

        return fallbackResult;
      }

      // Controlled sanitized error if fallback disabled
      throw new Error(`NLP Service unavailable: ${errorCode}`);
    }
  }

  /**
   * Maps FastAPI JSON response to the standard CodingAIService format
   */
  _mapNLPResponse(payload, clientDurationMs) {
    const { sentiment, toxicity, aggression, cyberbullying, metadata, text_metadata, request_id } = payload;

    // 1. Sentiment Mapping
    const sentimentScore = typeof sentiment.score === 'number' ? sentiment.score : 0;
    const sentimentLabel = sentiment.label || 'neutral';
    const sentimentResult = {
      label: sentimentLabel,
      confidence: Math.round(sentimentScore * 100) / 100,
      score: sentimentScore,
      probabilities: sentiment.probabilities || {},
      evidence: `Sentiment classified as ${sentimentLabel} (confidence: ${(sentimentScore * 100).toFixed(1)}%)`,
      needsReview: sentimentScore < 0.6 || sentimentLabel === 'mixed'
    };

    // 2. Aggression Mapping
    const aggressionLevel = aggression.level || 'none';
    const aggressionScore = typeof aggression.score === 'number' ? aggression.score : 0;
    const aggressionEvidenceList = aggression.evidence || [];
    const aggressionEvidenceStr = aggressionEvidenceList.length > 0
      ? `Indicators detected: ${aggressionEvidenceList.map(e => `${e.term} (${e.category})`).join(', ')}`
      : (aggression.is_aggressive ? 'Hostile language detected' : 'No clear hostile or aggressive language detected');

    const aggressionResult = {
      label: aggressionLevel,
      level: Math.round(aggressionScore),
      score: aggressionScore,
      normalizedScore: aggression.engineering_normalized_score !== undefined
        ? aggression.engineering_normalized_score
        : Math.round((aggressionScore / 10) * 100) / 100,
      confidence: aggression.is_aggressive ? 0.8 : 0.75,
      evidence: aggressionEvidenceStr,
      matchedIndicators: aggression.matched_indicators || [],
      categories: aggression.categories || [],
      evidenceItems: aggressionEvidenceList,
      isPersonallyTargeted: Boolean(aggression.is_personally_targeted),
      method: aggression.method || 'Aggression Lexicon Model (Xu et al., 2020)',
      needsReview: Boolean(aggression.needs_review)
    };

    // 3. Cyberbullying Mapping
    const isCyberbullying = Boolean(cyberbullying.is_cyberbullying);
    const cbSeverity = typeof cyberbullying.severity === 'number' ? cyberbullying.severity : 0;
    const cbEvidenceList = Array.isArray(cyberbullying.evidence) ? cyberbullying.evidence : [];
    const cbEvidenceStr = cbEvidenceList.join(' ');

    const cyberbullyingResult = {
      present: isCyberbullying,
      classification: cyberbullying.classification || (isCyberbullying ? 'cyberbullying' : 'not_cyberbullying'),
      type: cyberbullying.type || 'none',
      severity: Math.round(cbSeverity),
      rawSeverity: cbSeverity,
      score: cyberbullying.score || 0,
      confidence: Math.round((cyberbullying.confidence || 0.7) * 100) / 100,
      evidence: cbEvidenceStr,
      criteriaMatched: cyberbullying.indicators || [],
      reasonCodes: cyberbullying.reason_codes || [],
      method: cyberbullying.method || 'Research Operational Definition (Multi-dimensional Assessment)',
      limitations: cyberbullying.limitations || [],
      needsReview: Boolean(cyberbullying.needs_review || cyberbullying.classification === 'needs_review')
    };

    // 4. Combined Metadata
    const combinedMetadata = {
      provider: 'nlp',
      provider_version: '1.0',
      fallback_used: false,
      fallback_reason: null,
      sentiment_model: metadata?.models?.sentiment || 'cardiffnlp/twitter-xlm-roberta-base-sentiment',
      toxicity_model: metadata?.models?.toxicity || 'detoxify-multilingual',
      aggression_method: metadata?.models?.aggression || 'Aggression Lexicon Model (Xu et al., 2020)',
      cyberbullying_method: metadata?.models?.cyberbullying || 'Research Operational Definition',
      toxicity: toxicity?.categories || {},
      toxicity_score: toxicity?.overall_score || 0,
      is_toxic: Boolean(toxicity?.is_toxic),
      processing_time_ms: metadata?.processing_time_ms || clientDurationMs,
      device: metadata?.device || 'cpu',
      requestId: request_id || null,
      detectedLanguage: text_metadata?.language || 'unknown',
      languageConfidence: text_metadata?.language_confidence || 0.5,
      roman_urdu: payload.roman_urdu || null,
      analyzedAt: new Date().toISOString()
    };

    return {
      sentiment: sentimentResult,
      aggression: aggressionResult,
      cyberbullying: cyberbullyingResult,
      metadata: combinedMetadata
    };
  }
}

module.exports = NLPProvider;
