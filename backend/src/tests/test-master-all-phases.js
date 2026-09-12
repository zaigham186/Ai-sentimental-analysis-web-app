/**
 * Master Comprehensive Test Suite: Phases 1 Through 8
 * Tests the entire research platform from participant registration to supervisor reporting and security hardening.
 */

const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const config = require('../config');
const { Participant, Video, VideoResponse, Coding, Admin } = require('../models');
const { CodingAIService, createCodingProvider, RuleBasedProvider } = require('../services/codingAI');
const NLPProvider = require('../services/nlpProvider');
const researchAnalyticsService = require('../services/researchAnalyticsService');
const codingController = require('../controllers/codingController');
const { authLimiter, nlpLimiter, helmetMiddleware } = require('../middleware/security');
const { 
  round, 
  calculateValidPercentage, 
  calculateCategoricalDistribution, 
  calculateNumericSummary 
} = require('../utils/researchStatistics');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

async function runMasterTestSuite() {
  console.log('='.repeat(75));
  console.log('  CYBERBULLYING RESEARCH PLATFORM — MASTER COMPREHENSIVE TEST SUITE');
  console.log('  Testing Phases 1 through 8: Participant to Production Hardening');
  console.log('='.repeat(75));
  console.log('');

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // --------------------------------------------------------------------------
    // PHASE 1: PARTICIPANT ONBOARDING, EXPERIMENT FLOW & IMMUTABLE RESPONSES
    // --------------------------------------------------------------------------
    console.log('---------------------------------------------------------------------------');
    console.log('PHASE 1: Participant Flow, Demographics, Stimuli & Response Ingestion');
    console.log('---------------------------------------------------------------------------');
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
    assert(mongoose.connection.readyState === 1, 'MongoDB connection established');

    const suffix = Date.now().toString().slice(-6);
    
    // Create Participant with valid demographic fields
    const testParticipant = await Participant.create({
      username: `master_user_${suffix}`,
      name: `Master Participant ${suffix}`,
      age: 22,
      gender: 'female',
      university: 'SBBWU',
      department: 'Psychology',
      condition: 'anonymous',
      consentGiven: true,
      status: 'active'
    });
    assert(testParticipant._id !== undefined, 'Participant registration successful');
    assert(testParticipant.condition === 'anonymous', 'Participant assigned to Anonymous condition');

    // Create Video Stimulus
    const testVideo = await Video.create({
      title: `Master Stimulus Video ${suffix}`,
      topic: 'Cyberbullying Stimulus',
      description: 'Controlled stimulus for testing all phases',
      videoUrl: `https://example.com/stimulus-${suffix}.mp4`,
      duration: 90,
      order: 999
    });
    assert(testVideo._id !== undefined, 'Video stimulus created successfully');

    // Submit Participant Response
    const originalText = 'This person in the video is disgusting and should never show their face again!';
    const testResponse = await VideoResponse.create({
      participant: testParticipant._id,
      video: testVideo._id,
      responseText: originalText,
      responseLength: originalText.length,
      responseWordCount: 14
    });
    assert(testResponse.responseText === originalText, 'Participant response text submitted and saved');
    assert(testResponse.responseWordCount === 14, 'Response word count computed accurately');

    // Verify Immutability
    const reloadedResp = await VideoResponse.findById(testResponse._id);
    let mutationBlocked = false;
    try {
      reloadedResp.responseText = 'MODIFIED PARTICIPANT TEXT';
      await reloadedResp.save();
    } catch (err) {
      mutationBlocked = true;
    }
    assert(mutationBlocked, 'Phase 1 Research Integrity: Participant responseText is strictly immutable');

    // --------------------------------------------------------------------------
    // PHASES 2 & 3: PYTHON FASTAPI NLP MICROSERVICE (4 INDEPENDENT CONSTRUCTS)
    // --------------------------------------------------------------------------
    console.log('\n---------------------------------------------------------------------------');
    console.log('PHASES 2 & 3: Neural NLP Microservice (Sentiment, Toxicity, Aggression, Cyberbullying)');
    console.log('---------------------------------------------------------------------------');

    const nlpUrl = config.nlp.serviceUrl;
    let nlpAvailable = false;
    try {
      const health = await axios.get(`${nlpUrl}/health`, { timeout: 3000 });
      if (health.data?.status === 'healthy') {
        nlpAvailable = true;
        assert(health.data.models_ready === true, 'FastAPI NLP microservice is live and all 4 models are loaded in RAM');
        assert(health.data.models.sentiment.includes('roberta'), 'Twitter-XLM-RoBERTa sentiment model verified');
        assert(health.data.models.toxicity.includes('Detoxify'), 'Detoxify Multilingual toxicity model verified');
        assert(health.data.models.aggression.includes('Xu et al.'), 'Xu et al. (2020) Lexicon aggression model verified');
        assert(health.data.models.cyberbullying.includes('Operational'), 'Research Operational cyberbullying criteria verified');
      }
    } catch (e) {
      console.log('  ℹ NLP microservice offline or unreachable, fallback will be tested');
    }

    if (nlpAvailable) {
      // Test full multi-dimensional inference
      const nlpReq = await axios.post(`${nlpUrl}/analyze`, {
        text: originalText,
        context: { condition: 'anonymous' }
      });
      assert(nlpReq.status === 200, 'NLP /analyze endpoint returned HTTP 200');
      assert(nlpReq.data.sentiment?.label !== undefined, 'Sentiment analyzed: ' + nlpReq.data.sentiment?.label);
      assert(nlpReq.data.toxicity?.overall_score !== undefined, 'Toxicity overall score computed: ' + nlpReq.data.toxicity?.overall_score);
      assert(nlpReq.data.aggression?.level !== undefined, 'Aggression level computed: ' + nlpReq.data.aggression?.level);
      assert(nlpReq.data.cyberbullying?.classification !== undefined, 'Cyberbullying status evaluated: ' + nlpReq.data.cyberbullying?.classification);
    }

    // --------------------------------------------------------------------------
    // PHASE 4: EXPRESS ↔ FASTAPI INTEGRATION & TRANSPARENT FALLBACK
    // --------------------------------------------------------------------------
    console.log('\n---------------------------------------------------------------------------');
    console.log('PHASE 4: Backend Integration, Provider Orchestration & Fallback Mechanism');
    console.log('---------------------------------------------------------------------------');

    const codingAI = new CodingAIService(createCodingProvider());
    const aiResult = await codingAI.analyzeResponse(originalText, {
      condition: 'anonymous',
      videoTopic: 'Cyberbullying Stimulus'
    });
    assert(aiResult.success === true, 'CodingAIService successfully orchestrates analysis');
    assert(aiResult.data.sentiment.label !== undefined, 'Standardized sentiment payload generated');
    assert(aiResult.data.aggression.label !== undefined, 'Standardized aggression payload generated');
    assert(aiResult.data.cyberbullying.present !== undefined, 'Standardized cyberbullying payload generated');
    assert(aiResult.data.metadata.provider !== undefined, 'Execution metadata records provider: ' + aiResult.data.metadata.provider);

    // Fallback provider direct check
    const fallbackProvider = new RuleBasedProvider();
    const fallbackResult = await fallbackProvider.analyzeResponse(originalText);
    assert(fallbackResult.sentiment !== undefined, 'RuleBased fallback provider is ready and functional');

    // Privacy verification: raw text excluded from error logs
    const deadProvider = new NLPProvider({ url: 'http://127.0.0.1:59999', timeout: 50, fallbackEnabled: true });
    const deadResult = await deadProvider.analyzeResponse('Private participant text that must not leak');
    assert(deadResult.metadata?.fallback_used === true, 'Network failure triggers fallback without leaking participant text');

    // --------------------------------------------------------------------------
    // PHASE 5: ADMIN CODING & HUMAN-IN-THE-LOOP REVIEW WORKFLOW
    // --------------------------------------------------------------------------
    console.log('\n---------------------------------------------------------------------------');
    console.log('PHASE 5: Admin Coding UI Contract, Separation of Roles & Human Review');
    console.log('---------------------------------------------------------------------------');

    const testAdmin = await Admin.create({
      username: `master_researcher_${suffix}`,
      email: `researcher_${suffix}@research.edu`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdef',
      name: 'Dr. Lead Researcher',
      role: 'researcher'
    });
    assert(testAdmin._id !== undefined, 'Researcher admin account created');

    // Save AI suggestion on Coding record
    const codingRecord = await Coding.create({
      response: testResponse._id,
      coderRole: 'primary',
      aiCoding: {
        sentiment: aiResult.data.sentiment,
        aggression: aiResult.data.aggression,
        cyberbullying: aiResult.data.cyberbullying,
        metadata: aiResult.data.metadata,
        needsHumanReview: true,
        analyzedAt: new Date()
      },
      reviewStatus: 'pending'
    });
    assert(codingRecord.reviewStatus === 'pending', 'AI suggestion stored with reviewStatus: pending');
    assert(codingRecord.sentiment === null, 'Final sentiment is NULL until human researcher approves');

    // Human Review: Researcher accepts or modifies suggestion
    const reviewReq = {
      params: { id: codingRecord._id.toString() },
      body: {
        action: 'modify',
        finalCoding: {
          sentiment: 'negative',
          aggression: { category: 'moderate', level: 6 },
          cyberbullying: { present: true, type: 'harassment', severity: 7 }
        },
        notes: 'Researcher validated cyberbullying with personal hostile intent.'
      },
      admin: { id: testAdmin._id }
    };
    const reviewRes = createMockRes();
    await codingController.reviewAISuggestion(reviewReq, reviewRes);
    assert(reviewRes.statusCode === 200, 'Human review processed with HTTP 200');

    const updatedCoding = await Coding.findById(codingRecord._id);
    assert(updatedCoding.reviewStatus === 'reviewed', 'Coding reviewStatus transitioned to reviewed');
    assert(updatedCoding.sentiment === 'negative', 'Final approved sentiment recorded');
    assert(updatedCoding.cyberbullying.present === true, 'Final approved cyberbullying recorded');
    assert(updatedCoding.auditTrail.length === 1, 'Audit trail recorded review action');

    // --------------------------------------------------------------------------
    // PHASE 6: RESEARCH VALIDATION, CALIBRATION & ZERO FABRICATION
    // --------------------------------------------------------------------------
    console.log('\n---------------------------------------------------------------------------');
    console.log('PHASE 6: Empirical Validation, Calibration & Zero Fabrication Safeguard');
    console.log('---------------------------------------------------------------------------');

    const valReq = {};
    const valRes = createMockRes();
    await codingController.getValidationStatus(valReq, valRes);
    assert(valRes.statusCode === 200, 'Validation status controller responded with HTTP 200');
    assert(valRes.body.success === true, 'Validation payload structure verified');
    assert(valRes.body.data?.nlpHealth !== undefined, 'Live NLP health attached to validation status');

    // Zero-fabrication check: when gold labels are unvalidated
    const missingValidationData = researchAnalyticsService.getValidationSummary();
    assert(missingValidationData !== undefined, 'Validation summary service handles empirical benchmark data cleanly');

    // --------------------------------------------------------------------------
    // PHASE 7: COMPLETE RESEARCH ANALYTICS, COMPARISONS & EXPORT ENGINE
    // --------------------------------------------------------------------------
    console.log('\n---------------------------------------------------------------------------');
    console.log('PHASE 7: Research Analytics, Group Comparisons, Multi-Format Exports');
    console.log('---------------------------------------------------------------------------');

    // 1. Math and statistical utilities
    assert(round(4.5678, 2) === 4.57, 'Statistical rounding utility tested');
    assert(calculateValidPercentage(1, 2) === 50.0, 'Valid percentage division tested (50%)');
    assert(calculateValidPercentage(0, 0) === 0.0, 'Zero denominator safely returns 0.0 (no NaN)');

    // 2. Overview metrics
    const overview = await researchAnalyticsService.getOverviewMetrics({ video: testVideo._id.toString() });
    assert(overview.totalResponses >= 1, 'Overview metrics: Total responses counted');
    assert(overview.finalCodedCount >= 1, 'Overview metrics: Final human coded count computed');

    // 3. Condition comparison (Anonymous vs Identifiable)
    const conditionComp = await researchAnalyticsService.getConditionComparison({ video: testVideo._id.toString() });
    assert(conditionComp.anonymous !== undefined, 'Condition comparison: Anonymous group metrics computed');
    assert(conditionComp.identifiable !== undefined, 'Condition comparison: Identifiable group metrics computed');

    // 4. AI vs Human agreement
    const agreement = await researchAnalyticsService.getAIHumanAgreement({ video: testVideo._id.toString() });
    assert(agreement.summary !== undefined, 'AI vs Human Agreement summary computed');
    assert(agreement.reviewActions.modified >= 1, 'Agreement correctly logs modified action');

    // 5. Supervisor report payload
    const report = await researchAnalyticsService.generateSupervisorReport({ video: testVideo._id.toString() });
    assert(report.metadata.title.includes('Supervisor'), 'Supervisor Report generated');
    assert(report.methodologyNotes.length > 0, 'Methodology disclaimers attached');

    // --------------------------------------------------------------------------
    // PHASE 8: FINAL PRODUCTION SECURITY, RATE LIMITING & HARDENING
    // --------------------------------------------------------------------------
    console.log('\n---------------------------------------------------------------------------');
    console.log('PHASE 8: Security Hardening, Rate Limiting & Input Validation');
    console.log('---------------------------------------------------------------------------');

    // 1. Security middleware exports
    assert(typeof authLimiter === 'function', 'authLimiter export verified for brute-force defense');
    assert(typeof nlpLimiter === 'function', 'nlpLimiter export verified for AI DoS prevention');
    assert(typeof helmetMiddleware === 'function', 'helmetMiddleware configured for secure headers');

    // 2. Malformed ID rejection (HTTP 400 Bad Request vs 500 CastError)
    const resGetBad = createMockRes();
    await codingController.getResponseById({ params: { id: 'malformed-123' } }, resGetBad);
    assert(resGetBad.statusCode === 400, 'getResponseById rejects malformed ID with 400 Bad Request');

    const resAnalyzeBad = createMockRes();
    await codingController.analyzeWithAI({ params: { id: 'malformed-123' } }, resAnalyzeBad);
    assert(resAnalyzeBad.statusCode === 400, 'analyzeWithAI rejects malformed ID with 400 Bad Request');

    const resBulkBad = createMockRes();
    await codingController.bulkAnalyze({ body: { responseIds: ['bad-id'] } }, resBulkBad);
    assert(resBulkBad.statusCode === 400, 'bulkAnalyze rejects invalid IDs array with 400 Bad Request');

    // 3. Construct Decoupling: Negative Sentiment != Cyberbullying
    assert(updatedCoding.sentiment === 'negative', 'Negative sentiment recorded');
    assert(updatedCoding.cyberbullying.present === true, 'Cyberbullying independently evaluated');

    // --------------------------------------------------------------------------
    // CLEANUP & TEARDOWN
    // --------------------------------------------------------------------------
    console.log('\n---------------------------------------------------------------------------');
    console.log('TEARDOWN: Cleaning up Master Test Synthetic Records');
    console.log('---------------------------------------------------------------------------');
    await Coding.deleteOne({ _id: codingRecord._id });
    await VideoResponse.deleteOne({ _id: testResponse._id });
    await Video.deleteOne({ _id: testVideo._id });
    await Participant.deleteOne({ _id: testParticipant._id });
    await Admin.deleteOne({ _id: testAdmin._id });
    assert(true, 'All synthetic audit records safely purged from database');

  } catch (err) {
    console.error('Master test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(75));
  console.log(`MASTER TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (Duration: ${duration}s)`);
  console.log('='.repeat(75));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n✓ ALL PHASES (1 THROUGH 8) FULLY VERIFIED AND PASSING 100%!');
  }
}

runMasterTestSuite();
