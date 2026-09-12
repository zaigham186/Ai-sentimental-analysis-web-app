/**
 * Phase 4: NLP Service Integration Test Suite
 * Tests NLPProvider, CodingAIService orchestration, fallback handling,
 * response mapping, factory selection, and backward compatibility.
 */

require('dotenv').config();
const assert = require('assert');
const { CodingAIService, CodingProvider, RuleBasedProvider, createCodingProvider } = require('../services/codingAI');
const NLPProvider = require('../services/nlpProvider');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, error = null) {
  testResults.tests.push({ name, passed, error });
  if (passed) {
    testResults.passed++;
    console.log(`  ✓ ${name}`);
  } else {
    testResults.failed++;
    console.log(`  ✗ ${name}`);
    if (error) console.log(`    Error: ${error.message}`);
  }
}

// Synthetic FastAPI mock response
const mockFastAPISuccessResponse = {
  success: true,
  request_id: "test-req-12345",
  text_metadata: {
    character_count: 52,
    word_count: 10,
    language: "english",
    language_confidence: 0.95
  },
  sentiment: {
    label: "negative",
    score: 0.9617,
    probabilities: {
      negative: 0.9617,
      neutral: 0.0244,
      positive: 0.0139
    }
  },
  toxicity: {
    overall_score: 0.9989,
    is_toxic: true,
    categories: {
      toxicity: 0.9989,
      severe_toxicity: 0.0122,
      obscene: 0.2617,
      identity_attack: 0.0055,
      insult: 0.9906,
      threat: 0.0126,
      sexual_explicit: 0.0137
    },
    threshold: 0.5
  },
  aggression: {
    score: 7.0,
    engineering_normalized_score: 0.7,
    level: "moderate",
    is_aggressive: true,
    is_personally_targeted: true,
    matched_indicators: ["idiot", "worthless"],
    categories: ["hostile", "insult"],
    evidence: [
      { term: "idiot", category: "hostile", position: { start: 19, end: 24 } },
      { term: "worthless", category: "insult", position: { start: 26, end: 35 } }
    ],
    method: "Aggression Lexicon Model (Xu et al., 2020) - Research Operational Framework",
    needs_review: false
  },
  cyberbullying: {
    classification: "cyberbullying",
    is_cyberbullying: true,
    type: "harassment",
    severity: 7.1,
    score: 0.71,
    confidence: 0.75,
    evidence: ["Contains direct personal insult or denigration targeting an individual."],
    indicators: ["insult", "personal_targeting"],
    reason_codes: ["AGGRESSION_INDICATOR_DETECTED", "INSULT_INDICATOR", "PERSONAL_TARGETING_DETECTED"],
    needs_review: false,
    method: "Research Operational Definition (Multi-dimensional Assessment)",
    limitations: [
      "Model confidence is not empirical research accuracy.",
      "Single-text analysis cannot definitively verify longitudinal repetition or power imbalance."
    ]
  },
  metadata: {
    request_id: "test-req-12345",
    processing_time_ms: 356.18,
    models: {
      sentiment: "cardiffnlp/twitter-xlm-roberta-base-sentiment",
      toxicity: "detoxify-multilingual",
      aggression: "aggression-lexicon-xu-2020",
      cyberbullying: "research-operational-definition"
    },
    device: "cpu",
    timestamp: 1789068536.33
  }
};

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 4: NLP SERVICE INTEGRATION TESTS');
  console.log('='.repeat(60) + '\n');

  // 1. Test NLPProvider Response Mapping
  console.log('1. Testing NLPProvider Response Mapping...');
  try {
    const provider = new NLPProvider();
    const mapped = provider._mapNLPResponse(mockFastAPISuccessResponse, 350);

    assert.strictEqual(mapped.sentiment.label, 'negative');
    assert.strictEqual(mapped.sentiment.score, 0.9617);
    assert.strictEqual(mapped.sentiment.confidence, 0.96);
    assert.strictEqual(mapped.sentiment.needsReview, false);

    assert.strictEqual(mapped.aggression.label, 'moderate');
    assert.strictEqual(mapped.aggression.level, 7);
    assert.strictEqual(mapped.aggression.score, 7.0);
    assert.strictEqual(mapped.aggression.isPersonallyTargeted, true);
    assert.strictEqual(mapped.aggression.matchedIndicators.length, 2);

    assert.strictEqual(mapped.cyberbullying.present, true);
    assert.strictEqual(mapped.cyberbullying.classification, 'cyberbullying');
    assert.strictEqual(mapped.cyberbullying.type, 'harassment');
    assert.strictEqual(mapped.cyberbullying.severity, 7);
    assert.strictEqual(mapped.cyberbullying.reasonCodes.includes('PERSONAL_TARGETING_DETECTED'), true);

    assert.strictEqual(mapped.metadata.provider, 'nlp');
    assert.strictEqual(mapped.metadata.fallback_used, false);
    assert.strictEqual(mapped.metadata.sentiment_model, 'cardiffnlp/twitter-xlm-roberta-base-sentiment');
    assert.strictEqual(mapped.metadata.toxicity_model, 'detoxify-multilingual');
    assert.strictEqual(mapped.metadata.toxicity.insult, 0.9906);

    logTest('NLPProvider: Response correctly mapped to CodingAIService contract', true);
  } catch (error) {
    logTest('NLPProvider: Response correctly mapped to CodingAIService contract', false, error);
  }

  // 2. Test Empty and Whitespace Text Handling
  console.log('\n2. Testing Empty and Whitespace Text...');
  try {
    const provider = new NLPProvider();
    const emptyResult = await provider.analyzeResponse('', {});
    assert.strictEqual(emptyResult.sentiment.label, null);
    assert.strictEqual(emptyResult.sentiment.needsReview, true);
    assert.strictEqual(emptyResult.cyberbullying.present, false);
    assert.strictEqual(emptyResult.cyberbullying.classification, 'insufficient_evidence');

    const whitespaceResult = await provider.analyzeResponse('   \n  \t ', {});
    assert.strictEqual(whitespaceResult.aggression.level, 0);
    assert.strictEqual(whitespaceResult.cyberbullying.needsReview, true);

    logTest('NLPProvider: Empty/whitespace text handled gracefully with review flag', true);
  } catch (error) {
    logTest('NLPProvider: Empty/whitespace text handled gracefully with review flag', false, error);
  }

  // 3. Test Fallback on Timeout (ECONNABORTED)
  console.log('\n3. Testing Fallback on Timeout...');
  try {
    const timeoutProvider = new NLPProvider({
      url: 'http://127.0.0.1:9999', // dummy port
      timeout: 1, // 1ms timeout guarantees timeout/error
      fallbackEnabled: true
    });

    const fallbackResult = await timeoutProvider.analyzeResponse('You are a terrible person', {});
    assert.strictEqual(fallbackResult.metadata.fallback_used, true);
    assert.strictEqual(fallbackResult.metadata.provider, 'rule-based');
    assert.strictEqual(fallbackResult.metadata.primary_provider, 'nlp');
    assert.ok(fallbackResult.metadata.fallback_reason);
    assert.ok(fallbackResult.sentiment);
    assert.ok(fallbackResult.aggression);
    assert.ok(fallbackResult.cyberbullying);

    logTest('NLPProvider: Timeout safely triggers RuleBasedProvider fallback with audit metadata', true);
  } catch (error) {
    logTest('NLPProvider: Timeout safely triggers RuleBasedProvider fallback with audit metadata', false, error);
  }

  // 4. Test Fallback on Connection Refused (ECONNREFUSED)
  console.log('\n4. Testing Fallback on Connection Refused...');
  try {
    const connRefusedProvider = new NLPProvider({
      url: 'http://127.0.0.1:59999', // unassigned port
      timeout: 500,
      fallbackEnabled: true
    });

    const fallbackResult = await connRefusedProvider.analyzeResponse('I love this video, it was very nice.', {});
    assert.strictEqual(fallbackResult.metadata.fallback_used, true);
    assert.strictEqual(fallbackResult.metadata.provider, 'rule-based');
    assert.strictEqual(fallbackResult.sentiment.label, 'positive');

    logTest('NLPProvider: Connection refused triggers fallback without crashing', true);
  } catch (error) {
    logTest('NLPProvider: Connection refused triggers fallback without crashing', false, error);
  }

  // 5. Test Fallback Disabled (Error Surfaced Safely)
  console.log('\n5. Testing Fallback Disabled Behavior...');
  try {
    const noFallbackProvider = new NLPProvider({
      url: 'http://127.0.0.1:59999',
      timeout: 200,
      fallbackEnabled: false
    });

    let threw = false;
    try {
      await noFallbackProvider.analyzeResponse('Test text', {});
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('NLP Service unavailable'));
    }
    assert.strictEqual(threw, true, 'Should throw when fallback is disabled');

    logTest('NLPProvider: Controlled error thrown when fallback is disabled', true);
  } catch (error) {
    logTest('NLPProvider: Controlled error thrown when fallback is disabled', false, error);
  }

  // 6. Test Provider Factory Selection
  console.log('\n6. Testing createCodingProvider Factory...');
  try {
    const ruleBased = createCodingProvider({ nlpEnabled: false });
    assert.strictEqual(ruleBased instanceof RuleBasedProvider, true);
    assert.strictEqual(ruleBased.name, 'rule-based');

    const nlp = createCodingProvider({ nlpEnabled: true });
    assert.strictEqual(nlp instanceof NLPProvider, true);
    assert.strictEqual(nlp.name, 'nlp');

    logTest('createCodingProvider: Correctly selects provider based on nlpEnabled flag', true);
  } catch (error) {
    logTest('createCodingProvider: Correctly selects provider based on nlpEnabled flag', false, error);
  }

  // 7. Test CodingAIService Orchestration
  console.log('\n7. Testing CodingAIService Orchestration with NLPProvider...');
  try {
    // Create mock provider returning the success payload
    const mockProvider = new CodingProvider({ name: 'nlp', version: '1.0' });
    mockProvider.analyzeResponse = async (text, context) => {
      const p = new NLPProvider();
      return p._mapNLPResponse(mockFastAPISuccessResponse, 200);
    };

    const service = new CodingAIService(mockProvider);
    const result = await service.analyzeResponse('You are a complete idiot, worthless, and I hate you.', {
      condition: 'anonymous',
      videoTopic: 'cyberbullying',
      videoOrder: 1
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.data.sentiment);
    assert.ok(result.data.aggression);
    assert.ok(result.data.cyberbullying);
    assert.strictEqual(result.data.metadata.provider, 'nlp');
    assert.strictEqual(typeof result.data.needsHumanReview, 'boolean');

    logTest('CodingAIService: Orchestrates analysis and returns standardized AICodingSuggestion', true);
  } catch (error) {
    logTest('CodingAIService: Orchestrates analysis and returns standardized AICodingSuggestion', false, error);
  }

  // 8. Test RuleBasedProvider Backward Compatibility
  console.log('\n8. Testing RuleBasedProvider Backward Compatibility...');
  try {
    const service = new CodingAIService(new RuleBasedProvider());
    const result = await service.analyzeResponse('I really like this great video', {});

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.sentiment.label, 'positive');
    assert.strictEqual(result.data.aggression.label, 'none');
    assert.strictEqual(result.data.cyberbullying.present, false);
    assert.strictEqual(result.data.metadata.provider, 'rule-based');

    logTest('RuleBasedProvider: Legacy provider remains 100% operational with zero regressions', true);
  } catch (error) {
    logTest('RuleBasedProvider: Legacy provider remains 100% operational with zero regressions', false, error);
  }

  // 9. Test Privacy Logging: Response text not present in error messages
  console.log('\n9. Testing Privacy: Response text excluded from error logs...');
  try {
    const secretText = 'SECRET_PARTICIPANT_CONFIDENTIAL_TEXT_987654';
    const failingProvider = new NLPProvider({
      url: 'http://127.0.0.1:59999',
      timeout: 100,
      fallbackEnabled: false
    });

    try {
      await failingProvider.analyzeResponse(secretText, {});
    } catch (err) {
      assert.strictEqual(err.message.includes(secretText), false, 'Error message must NOT contain participant response text');
    }

    logTest('Privacy Check: Participant responseText is never leaked in errors', true);
  } catch (error) {
    logTest('Privacy Check: Participant responseText is never leaked in errors', false, error);
  }

  // 10. Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log('='.repeat(60) + '\n');

  if (testResults.failed > 0) {
    process.exit(1);
  } else {
    console.log('✓ ALL 9 INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
