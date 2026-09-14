/**
 * AI-Assisted Coding Service
 * Phase 10 Enhancement: Research-Grade Sentiment, Aggression & Cyberbullying Coding
 * 
 * CRITICAL RESEARCH PRINCIPLES:
 * - AI provides SUGGESTIONS, not final coding
 * - Human researcher review is REQUIRED
 * - Sentiment ≠ Aggression ≠ Cyberbullying
 * - No claims of 100% accuracy
 * - Context-aware, not keyword-based
 * - Evidence-based coding with rationale
 * - Original response NEVER modified
 */

/**
 * Coding Provider Interface
 * Allows pluggable AI providers (OpenAI, local models, etc.)
 */
class CodingProvider {
  constructor(config = {}) {
    this.name = config.name || 'manual';
    this.version = config.version || '1.0';
    this.config = config;
  }

  async analyzeSentiment(text, context) {
    throw new Error('analyzeSentiment must be implemented by provider');
  }

  async analyzeAggression(text, context) {
    throw new Error('analyzeAggression must be implemented by provider');
  }

  async analyzeCyberbullying(text, context) {
    throw new Error('analyzeCyberbullying must be implemented by provider');
  }

  async analyzeResponse(text, context) {
    // Default implementation: analyze all dimensions
    const [sentiment, aggression, cyberbullying] = await Promise.all([
      this.analyzeSentiment(text, context),
      this.analyzeAggression(text, context),
      this.analyzeCyberbullying(text, context)
    ]);

    return {
      sentiment,
      aggression,
      cyberbullying,
      metadata: {
        provider: this.name,
        version: this.version,
        analyzedAt: new Date().toISOString()
      }
    };
  }
}

/**
 * Rule-Based Coding Provider
 * Transparent, explainable, no external dependencies
 * This is a BASELINE provider, not claiming high accuracy
 */
class RuleBasedProvider extends CodingProvider {
  constructor(config = {}) {
    super({
      ...config,
      name: 'rule-based',
      version: '1.0'
    });
  }

  detectLanguage(text) {
    // Simple heuristic language detection
    const urduPattern = /[\u0600-\u06FF]/;
    const englishPattern = /[a-zA-Z]/;

    const hasUrdu = urduPattern.test(text);
    const hasEnglish = englishPattern.test(text);

    if (hasUrdu && hasEnglish) return { language: 'mixed', confidence: 0.7 };
    if (hasUrdu) return { language: 'urdu', confidence: 0.8 };
    if (hasEnglish) return { language: 'english', confidence: 0.9 };

    return { language: 'unknown', confidence: 0.3 };
  }

  async analyzeSentiment(text, context = {}) {
    try {
      if (!text || text.trim().length === 0) {
        return {
          label: null,
          confidence: 0,
          evidence: 'Empty or invalid response text',
          needsReview: true
        };
      }

      const lowerText = text.toLowerCase();
      const words = lowerText.split(/\s+/);

      // Context-aware sentiment indicators
      const positiveIndicators = [
        'good', 'great', 'excellent', 'nice', 'like', 'love', 'enjoyed',
        'interesting', 'helpful', 'appreciate', 'agree', 'support'
      ];

      const negativeIndicators = [
        'bad', 'terrible', 'horrible', 'hate', 'dislike', 'disagree',
        'wrong', 'awful', 'disgusting', 'poor', 'worst'
      ];

      const positiveCount = positiveIndicators.filter(w => lowerText.includes(w)).length;
      const negativeCount = negativeIndicators.filter(w => lowerText.includes(w)).length;

      // Check for negation
      const hasNegation = /\b(not|no|never|don't|doesn't|didn't)\b/.test(lowerText);

      let label, confidence, evidence;

      if (positiveCount > negativeCount && positiveCount > 0) {
        label = hasNegation ? 'mixed' : 'positive';
        confidence = hasNegation ? 0.6 : 0.7;
        evidence = `Contains positive evaluative language (${positiveCount} indicators)${hasNegation ? ' with negation' : ''}`;
      } else if (negativeCount > positiveCount && negativeCount > 0) {
        label = hasNegation ? 'mixed' : 'negative';
        confidence = hasNegation ? 0.6 : 0.7;
        evidence = `Contains negative evaluative language (${negativeCount} indicators)${hasNegation ? ' with negation' : ''}`;
      } else if (positiveCount === negativeCount && positiveCount > 0) {
        label = 'mixed';
        confidence = 0.5;
        evidence = 'Contains both positive and negative language';
      } else {
        label = 'neutral';
        confidence = 0.5;
        evidence = 'No strong sentiment indicators detected';
      }

      // Low confidence for very short responses
      if (words.length < 5) {
        confidence *= 0.7;
        evidence += '. Short response reduces confidence.';
      }

      return {
        label,
        confidence: Math.round(confidence * 100) / 100,
        evidence,
        needsReview: confidence < 0.6 || label === 'mixed'
      };

    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return {
        label: null,
        confidence: 0,
        evidence: 'Analysis failed',
        needsReview: true,
        error: error.message
      };
    }
  }

  async analyzeAggression(text, context = {}) {
    try {
      if (!text || text.trim().length === 0) {
        return {
          label: 'none',
          level: 0,
          confidence: 0,
          evidence: 'Empty or invalid response text',
          needsReview: true
        };
      }

      const lowerText = text.toLowerCase();

      // IMPORTANT: Aggression ≠ Negative Sentiment
      // Look for hostile, threatening, or attacking language
      const hostileWords = ['stupid', 'idiot', 'fool', 'moron', 'dumb'];
      const insultingWords = ['ugly', 'disgusting', 'worthless', 'useless'];
      const threateningWords = ['kill', 'destroy', 'hurt', 'attack', 'die'];

      // Check for personal targeting (key distinction)
      const personalTargeting = /\b(you are|you're|he is|she is|they are)\s+(stupid|idiot|fool|dumb|worthless)/i.test(text);

      const hostileCount = hostileWords.filter(w => lowerText.includes(w)).length;
      const insultingCount = insultingWords.filter(w => lowerText.includes(w)).length;
      const threateningCount = threateningWords.filter(w => lowerText.includes(w)).length;

      const totalIndicators = hostileCount + insultingCount + threateningCount;

      let label, level, confidence, evidence;

      if (threateningCount > 0 || personalTargeting) {
        label = 'severe';
        level = 7 + Math.min(threateningCount, 3);
        confidence = 0.75;
        evidence = `Contains ${personalTargeting ? 'personal targeting with ' : ''}${threateningCount > 0 ? 'threatening' : 'hostile'} language`;
      } else if (insultingCount > 1 || hostileCount > 1) {
        label = 'moderate';
        level = 4 + Math.min(totalIndicators, 3);
        confidence = 0.7;
        evidence = `Contains multiple hostile or insulting expressions (${totalIndicators} indicators)`;
      } else if (hostileCount === 1 || insultingCount === 1) {
        label = 'mild';
        level = 2;
        confidence = 0.6;
        evidence = `Contains mild hostile language (${totalIndicators} indicator)`;
      } else {
        label = 'none';
        level = 0;
        confidence = 0.8;
        evidence = 'No clear hostile or aggressive language detected';
      }

      // CRITICAL: Distinguish critique from aggression
      const isCritique = /\b(I think|I believe|in my opinion|I disagree|the idea|the video|the content)\b/i.test(text);
      if (isCritique && label !== 'none') {
        confidence *= 0.7;
        evidence += '. Response appears to critique ideas rather than attack persons - requires review.';
      }

      return {
        label,
        level: Math.min(level, 10),
        confidence: Math.round(confidence * 100) / 100,
        evidence,
        needsReview: confidence < 0.7 || isCritique
      };

    } catch (error) {
      console.error('Aggression analysis error:', error);
      return {
        label: 'none',
        level: 0,
        confidence: 0,
        evidence: 'Analysis failed',
        needsReview: true,
        error: error.message
      };
    }
  }

  async analyzeCyberbullying(text, context = {}) {
    try {
      if (!text || text.trim().length === 0) {
        return {
          present: false,
          type: 'none',
          severity: 0,
          confidence: 0,
          evidence: 'Empty or invalid response text',
          criteriaMatched: [],
          needsReview: true
        };
      }

      // CRITICAL: Cyberbullying requires specific criteria
      // NOT just negative sentiment or harsh words

      const lowerText = text.toLowerCase();
      const criteriaMatched = [];

      // Criterion 1: Personal targeting (attacking a person, not an idea)
      const personalTargeting = /\b(you are|you're|he is|she is|they are)\s+\w+/i.test(text) &&
        /\b(stupid|idiot|fool|ugly|worthless|loser|pathetic)\b/i.test(text);
      if (personalTargeting) {
        criteriaMatched.push('personal_targeting');
      }

      // Criterion 2: Insulting/abusive behavior
      const directInsult = /\b(you\s+(stupid|idiot|fool|moron|dumb|ugly|disgusting))\b/i.test(text);
      if (directInsult) {
        criteriaMatched.push('direct_insult');
      }

      // Criterion 3: Humiliation/degradation
      const humiliating = /\b(loser|pathetic|worthless|embarrass|shame|humiliat)\b/i.test(text);
      if (humiliating && personalTargeting) {
        criteriaMatched.push('humiliation');
      }

      // Criterion 4: Threatening behavior
      const threatening = /\b(kill|hurt|attack|destroy|die|threat)\b/i.test(text);
      if (threatening && personalTargeting) {
        criteriaMatched.push('threatening');
      }

      // Determine type and severity
      let type = 'none';
      let severity = 0;
      let present = false;
      let confidence = 0.5;
      let evidence = '';

      if (criteriaMatched.length >= 2) {
        present = true;
        confidence = 0.7;

        if (criteriaMatched.includes('threatening')) {
          type = 'harassment';
          severity = 8;
        } else if (criteriaMatched.includes('humiliation')) {
          type = 'denigration';
          severity = 6;
        } else if (criteriaMatched.includes('direct_insult')) {
          type = 'flaming';
          severity = 5;
        }

        evidence = `Matches ${criteriaMatched.length} cyberbullying criteria: ${criteriaMatched.join(', ')}`;
      } else if (criteriaMatched.length === 1) {
        present = false; // Needs more evidence
        type = 'none';
        severity = 0;
        confidence = 0.4;
        evidence = `Partial match (${criteriaMatched[0]}) but insufficient evidence for cyberbullying classification. Requires researcher review.`;
      } else {
        present = false;
        type = 'none';
        severity = 0;
        confidence = 0.8;
        evidence = 'No cyberbullying criteria matched. Response may be negative but does not constitute cyberbullying.';
      }

      // CRITICAL: Distinguish video/idea criticism from personal attack
      const isIdeaCritique = /\b(the video|the idea|the content|the message|this concept)\b/i.test(text);
      if (isIdeaCritique && present) {
        present = false;
        type = 'none';
        severity = 0;
        confidence = 0.5;
        evidence = 'Response critiques ideas/content rather than targeting individuals. Not cyberbullying.';
      }

      return {
        present,
        type,
        severity,
        confidence: Math.round(confidence * 100) / 100,
        evidence,
        criteriaMatched,
        needsReview: confidence < 0.7 || criteriaMatched.length === 1
      };

    } catch (error) {
      console.error('Cyberbullying analysis error:', error);
      return {
        present: false,
        type: 'none',
        severity: 0,
        confidence: 0,
        evidence: 'Analysis failed',
        criteriaMatched: [],
        needsReview: true,
        error: error.message
      };
    }
  }
}

/**
 * Coding AI Service
 * Main service for AI-assisted coding
 */
class CodingAIService {
  constructor(provider = null) {
    this.provider = provider || createCodingProvider();
  }

  async analyzeResponse(responseText, context = {}) {
    try {
      // Validate input
      if (!responseText || typeof responseText !== 'string') {
        throw new Error('Invalid response text');
      }

      // Detect language
      const languageInfo = this.provider.detectLanguage ?
        this.provider.detectLanguage(responseText) :
        { language: 'unknown', confidence: 0.5 };

      // Perform analysis
      const analysis = await this.provider.analyzeResponse(responseText, {
        ...context,
        detectedLanguage: languageInfo.language
      });

      // Add metadata
      analysis.metadata = {
        ...analysis.metadata,
        detectedLanguage: languageInfo.language,
        languageConfidence: languageInfo.confidence,
        responseLength: responseText.length,
        wordCount: responseText.split(/\s+/).length
      };

      // Determine overall review need
      analysis.needsHumanReview =
        Boolean(analysis.sentiment?.needsReview) ||
        Boolean(analysis.aggression?.needsReview) ||
        Boolean(analysis.cyberbullying?.needsReview);

      return {
        success: true,
        data: analysis
      };

    } catch (error) {
      console.error('AI coding analysis error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  validateOutput(analysis) {
    // Validate AI output structure
    const required = ['sentiment', 'aggression', 'cyberbullying', 'metadata'];
    for (const field of required) {
      if (!analysis[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    return { valid: true };
  }
}

/**
 * Provider Factory (Phase 4)
 * Creates the appropriate CodingProvider based on configuration or options
 * @param {object} options
 * @returns {CodingProvider}
 */
function createCodingProvider(options = {}) {
  let config = {};
  try {
    config = require('../config');
  } catch (err) {
    // If config module fails to load (e.g., in isolated unit tests)
    config = {};
  }

  const NLPProvider = require('./nlpProvider');

  const nlpEnabled = options.nlpEnabled !== undefined
    ? options.nlpEnabled
    : (config.nlp?.enabled ?? (process.env.NLP_PROVIDER_ENABLED === 'true'));

  if (nlpEnabled) {
    return new NLPProvider({
      url: options.url || config.nlp?.serviceUrl || process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001',
      timeout: options.timeout || config.nlp?.timeoutMs || parseInt(process.env.NLP_SERVICE_TIMEOUT_MS, 10) || 30000,
      fallbackEnabled: options.fallbackEnabled !== undefined
        ? options.fallbackEnabled
        : (config.nlp?.fallbackEnabled ?? (process.env.NLP_FALLBACK_ENABLED !== 'false')),
      fallbackProvider: options.fallbackProvider || new RuleBasedProvider(options)
    });
  }

  return new RuleBasedProvider(options);
}

// Export service, providers, and factory
module.exports = {
  CodingAIService,
  CodingProvider,
  RuleBasedProvider,
  createCodingProvider,
  get NLPProvider() { return require('./nlpProvider'); }
};
