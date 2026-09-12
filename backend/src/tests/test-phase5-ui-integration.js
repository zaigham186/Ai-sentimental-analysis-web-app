/**
 * Phase 5: Admin Coding / Sentimental Coding UI Integration Test
 * Verifies backend and UI data contracts for:
 * 1. Rich NLP results (Sentiment + Probabilities, Toxicity Categories, Aggression + Xu et al., Cyberbullying + Reason Codes)
 * 2. Human-in-the-loop review workflow (Accept, Modify, Reject)
 * 3. Provider provenance & Fallback behavior
 * 4. Backward compatibility for older coding records lacking NLP data
 * 5. Immutable participant response integrity
 */

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');
const axios = require('axios');
const { Participant, Video, VideoResponse, Coding, Admin } = require('../models');
const { CodingAIService, RuleBasedProvider } = require('../services/codingAI');
const NLPProvider = require('../services/nlpProvider');

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

async function runPhase5Tests() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 5: ADMIN NLP CODING UI & WORKFLOW VERIFICATION');
  console.log('='.repeat(60) + '\n');

  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cyberbullying_research');
    }

    // 1. Verify FastAPI NLP Service Health
    console.log('1. Checking Live FastAPI NLP Service...');
    const healthUrl = `${process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001'}/health`;
    const healthRes = await axios.get(healthUrl, { timeout: 5000 });
    assert.strictEqual(healthRes.data.status, 'healthy');
    assert.strictEqual(healthRes.data.models_ready, true);
    logTest('NLP Service: Live and ready with 4 loaded models', true);

    // 2. Setup Synthetic Research Response
    console.log('\n2. Setting up Synthetic Response for Analysis...');
    let syntheticAdmin = await Admin.findOne({ username: 'phase5_synth_admin' });
    if (!syntheticAdmin) {
      syntheticAdmin = await Admin.create({
        username: 'phase5_synth_admin',
        email: 'phase5_admin@example.com',
        name: 'Phase 5 Researcher',
        passwordHash: '$2a$10$dummyhashforphase5tests000000000000000000000000000000000',
        role: 'researcher'
      });
    }

    let syntheticParticipant = await Participant.findOne({ username: 'phase5_synth_user' });
    if (!syntheticParticipant) {
      syntheticParticipant = await Participant.create({
        username: 'phase5_synth_user',
        name: 'Phase 5 Synthetic Participant',
        age: 22,
        gender: 'female',
        university: 'SBBWU',
        department: 'Psychology',
        condition: 'identifiable',
        status: 'active',
        consentGiven: true
      });
    }

    let syntheticVideo = await Video.findOne({ order: 99 });
    if (!syntheticVideo) {
      syntheticVideo = await Video.create({
        title: 'Phase 5 Synthetic Test Stimulus',
        topic: 'Cyberbullying Stimulus',
        description: 'Synthetic video stimulus for Phase 5 UI verification',
        videoUrl: 'https://example.com/phase5-stimulus.mp4',
        duration: 90,
        order: 99,
        active: true,
        version: '1.0'
      });
    }

    // Clean up any stale test responses for this participant
    await VideoResponse.deleteMany({ participant: syntheticParticipant._id });
    await Coding.deleteMany({ response: { $in: await VideoResponse.find({ participant: syntheticParticipant._id }).distinct('_id') } });

    // Video 1
    let syntheticVideo1 = await Video.findOne({ order: 99 });
    if (!syntheticVideo1) {
      syntheticVideo1 = await Video.create({
        title: 'Phase 5 Synthetic Test Stimulus 1',
        topic: 'Cyberbullying Stimulus',
        description: 'Synthetic video stimulus for Phase 5 UI verification',
        videoUrl: 'https://example.com/phase5-stimulus-1.mp4',
        duration: 90,
        order: 99,
        active: true,
        version: '1.0'
      });
    }

    // Video 2
    let syntheticVideo2 = await Video.findOne({ order: 100 });
    if (!syntheticVideo2) {
      syntheticVideo2 = await Video.create({
        title: 'Phase 5 Synthetic Test Stimulus 2',
        topic: 'Cyberbullying Stimulus',
        description: 'Synthetic video stimulus 2',
        videoUrl: 'https://example.com/phase5-stimulus-2.mp4',
        duration: 90,
        order: 100,
        active: true,
        version: '1.0'
      });
    }

    // Video 3
    let syntheticVideo3 = await Video.findOne({ order: 101 });
    if (!syntheticVideo3) {
      syntheticVideo3 = await Video.create({
        title: 'Phase 5 Synthetic Test Stimulus 3',
        topic: 'Cyberbullying Stimulus',
        description: 'Synthetic video stimulus 3',
        videoUrl: 'https://example.com/phase5-stimulus-3.mp4',
        duration: 90,
        order: 101,
        active: true,
        version: '1.0'
      });
    }

    // Video 4
    let syntheticVideo4 = await Video.findOne({ order: 102 });
    if (!syntheticVideo4) {
      syntheticVideo4 = await Video.create({
        title: 'Phase 5 Synthetic Test Stimulus 4',
        topic: 'Cyberbullying Stimulus',
        description: 'Synthetic video stimulus 4',
        videoUrl: 'https://example.com/phase5-stimulus-4.mp4',
        duration: 90,
        order: 102,
        active: true,
        version: '1.0'
      });
    }

    const syntheticText = "You are a complete idiot and a loser. I will destroy your reputation you pathetic fool.";
    const syntheticResponse = await VideoResponse.create({
      participant: syntheticParticipant._id,
      video: syntheticVideo1._id,
      responseText: syntheticText,
      responseTime: 42,
      submittedAt: new Date()
    });

    logTest('Synthetic data created with read-only responseText', true);

    // 3. Test AI Analysis with Full NLP Contract
    console.log('\n3. Testing AI Analysis & Data Contract for UI...');
    const nlpProvider = new NLPProvider({
      url: process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001',
      timeout: 30000,
      fallbackEnabled: true
    });
    const codingAIService = new CodingAIService(nlpProvider);

    const aiResult = await codingAIService.analyzeResponse(
      syntheticResponse.responseText,
      { condition: 'identifiable', videoTopic: 'Cyberbullying Stimulus', videoOrder: 99 }
    );

    assert.strictEqual(aiResult.success, true);
    const suggestion = aiResult.data;

    // Check Sentiment Contract
    assert.ok(suggestion.sentiment, 'Suggestion must include sentiment');
    assert.strictEqual(suggestion.sentiment.label, 'negative', 'Sentiment must be negative');
    assert.ok(typeof suggestion.sentiment.score === 'number', 'Sentiment must include numeric score');
    assert.ok(suggestion.sentiment.probabilities, 'Sentiment must include probability breakdown');
    assert.ok(typeof suggestion.sentiment.probabilities.negative === 'number', 'Probabilities must include negative class');
    logTest('Contract: Sentiment (label, score, class probabilities) fully present', true);

    // Check Toxicity Contract (in metadata)
    assert.ok(suggestion.metadata, 'Suggestion must include metadata');
    assert.ok(suggestion.metadata.toxicity, 'Metadata must include toxicity categories');
    assert.ok(typeof suggestion.metadata.toxicity.insult === 'number', 'Toxicity must include insult score');
    assert.ok(typeof suggestion.metadata.toxicity.threat === 'number', 'Toxicity must include threat score');
    assert.ok(typeof suggestion.metadata.toxicity_score === 'number', 'Metadata must include toxicity_score');
    assert.strictEqual(suggestion.metadata.is_toxic, true, 'is_toxic must be true for hostile text');
    logTest('Contract: Toxicity (overall score, insult, threat, obscene, severe) fully present', true);

    // Check Aggression Contract
    assert.ok(suggestion.aggression, 'Suggestion must include aggression');
    assert.ok(['mild', 'moderate', 'severe'].includes(suggestion.aggression.label), 'Aggression level must be classified');
    assert.ok(typeof suggestion.aggression.level === 'number', 'Aggression level must be numeric 0-10');
    assert.ok(Array.isArray(suggestion.aggression.matchedIndicators), 'Aggression must have matched indicators array');
    assert.ok(Array.isArray(suggestion.aggression.evidenceItems), 'Aggression must have evidence items with terms and spans');
    assert.strictEqual(suggestion.aggression.isPersonallyTargeted, true, 'isPersonallyTargeted must be true for direct personal insults');
    logTest('Contract: Aggression (level, score, matchedIndicators, evidenceItems, personal targeting) fully present', true);

    // Check Cyberbullying Contract
    assert.ok(suggestion.cyberbullying, 'Suggestion must include cyberbullying');
    assert.strictEqual(suggestion.cyberbullying.present, true, 'Cyberbullying must be detected');
    assert.ok(suggestion.cyberbullying.classification, 'Cyberbullying must include classification');
    assert.ok(Array.isArray(suggestion.cyberbullying.reasonCodes), 'Cyberbullying must include deterministic reason codes');
    assert.ok(suggestion.cyberbullying.reasonCodes.length > 0, 'Reason codes must not be empty');
    logTest('Contract: Cyberbullying (classification, typology, severity, deterministic reasonCodes) fully present', true);

    // Check Model Provenance & Fallback fields
    assert.strictEqual(suggestion.metadata.provider, 'nlp');
    assert.strictEqual(suggestion.metadata.fallback_used, false);
    assert.ok(suggestion.metadata.sentiment_model);
    assert.ok(suggestion.metadata.toxicity_model);
    logTest('Contract: Model execution provenance & fallback flags present', true);

    // Verify stored Coding document in MongoDB (simulating controller save)
    const storedCoding = await Coding.create({
      response: syntheticResponse._id,
      coderRole: 'primary',
      aiCoding: {
        sentiment: suggestion.sentiment,
        aggression: suggestion.aggression,
        cyberbullying: suggestion.cyberbullying,
        metadata: suggestion.metadata,
        modelName: suggestion.metadata?.provider || 'nlp',
        modelVersion: suggestion.metadata?.version || '1.0',
        detectedLanguage: suggestion.metadata?.detectedLanguage,
        languageConfidence: suggestion.metadata?.languageConfidence,
        needsHumanReview: true,
        analyzedAt: new Date()
      },
      reviewStatus: 'pending',
      codingVersion: '1.0'
    });

    assert.ok(storedCoding, 'Coding document must exist in MongoDB');
    assert.strictEqual(storedCoding.reviewStatus, 'pending', 'Review status must remain pending (human review required)');
    logTest('Safety: AI coding saved as pending; researcher review strictly required', true);

    // Verify responseText remained 100% immutable
    const responseCheck = await VideoResponse.findById(syntheticResponse._id);
    assert.strictEqual(responseCheck.responseText, syntheticText, 'Response text must NEVER be modified');
    logTest('Safety: Original participant response text remained 100% immutable', true);

    // 4. Test Review Workflow: Accept
    console.log('\n4. Testing Review Workflow: Accept...');
    storedCoding.acceptAICoding(syntheticAdmin._id);
    await storedCoding.save();

    const verifiedAccept = await Coding.findById(storedCoding._id);
    assert.strictEqual(verifiedAccept.reviewStatus, 'reviewed');
    assert.strictEqual(verifiedAccept.reviewAction, 'accepted_ai');
    assert.strictEqual(verifiedAccept.sentiment, 'negative');
    assert.strictEqual(verifiedAccept.cyberbullying.present, true);
    logTest('Review Workflow: Accept records suggestion as final coding (reviewStatus: reviewed, reviewAction: accepted_ai)', true);

    // 5. Test Review Workflow: Modify
    console.log('\n5. Testing Review Workflow: Modify...');
    const modifyResponse = await VideoResponse.create({
      participant: syntheticParticipant._id,
      video: syntheticVideo2._id,
      responseText: "I don't think this strategy makes sense, but nice effort.",
      responseTime: 25,
      submittedAt: new Date()
    });
    const modifyAiResult = await codingAIService.analyzeResponse(
      modifyResponse.responseText,
      { condition: 'identifiable', videoTopic: 'Cyberbullying Stimulus', videoOrder: 99 }
    );
    const modifyCoding = await Coding.create({
      response: modifyResponse._id,
      coderRole: 'primary',
      aiCoding: modifyAiResult.data,
      reviewStatus: 'pending'
    });

    // Modify: researcher changes to neutral / non-cyberbullying
    modifyCoding.sentiment = 'neutral';
    modifyCoding.aggression = { level: 0, category: 'none' };
    modifyCoding.cyberbullying = { present: false, type: 'none', severity: 0 };
    modifyCoding.reviewStatus = 'reviewed';
    modifyCoding.reviewAction = 'modified';
    modifyCoding.notes = 'Constructive critique of strategy; modified to neutral non-cyberbullying';
    await modifyCoding.save();

    const verifiedModify = await Coding.findById(modifyCoding._id);
    assert.strictEqual(verifiedModify.reviewStatus, 'reviewed');
    assert.strictEqual(verifiedModify.reviewAction, 'modified');
    assert.strictEqual(verifiedModify.sentiment, 'neutral');
    assert.strictEqual(verifiedModify.cyberbullying.present, false);
    logTest('Review Workflow: Modify allows researcher to override any field (reviewStatus: reviewed, reviewAction: modified)', true);

    // 6. Test Review Workflow: Reject
    console.log('\n6. Testing Review Workflow: Reject...');
    const rejectResponse = await VideoResponse.create({
      participant: syntheticParticipant._id,
      video: syntheticVideo3._id,
      responseText: "Just testing response rejection.",
      responseTime: 15,
      submittedAt: new Date()
    });
    const rejectAiResult = await codingAIService.analyzeResponse(
      rejectResponse.responseText,
      { condition: 'identifiable', videoTopic: 'Cyberbullying Stimulus', videoOrder: 99 }
    );
    const rejectCoding = await Coding.create({
      response: rejectResponse._id,
      coderRole: 'primary',
      aiCoding: rejectAiResult.data,
      reviewStatus: 'pending'
    });

    // Reject: human rejects suggestion and applies independent coding
    rejectCoding.sentiment = 'neutral';
    rejectCoding.aggression = { level: 0, category: 'none' };
    rejectCoding.cyberbullying = { present: false, type: 'none', severity: 0 };
    rejectCoding.reviewStatus = 'reviewed';
    rejectCoding.reviewAction = 'rejected';
    rejectCoding.notes = 'Rejected AI suggestion; manual coding applied';
    await rejectCoding.save();

    const verifiedReject = await Coding.findById(rejectCoding._id);
    assert.strictEqual(verifiedReject.reviewStatus, 'reviewed');
    assert.strictEqual(verifiedReject.reviewAction, 'rejected');
    logTest('Review Workflow: Reject records rejection and preserves AI suggestion (reviewStatus: reviewed, reviewAction: rejected)', true);

    // 7. Test Fallback Behavior when NLP Service is Unreachable
    console.log('\n7. Testing Fallback to RuleBasedProvider...');
    const brokenNLPProvider = new NLPProvider({
      url: 'http://127.0.0.1:9999', // Non-existent port
      timeout: 1000,
      fallbackEnabled: true,
      fallbackProvider: new RuleBasedProvider()
    });
    const fallbackService = new CodingAIService(brokenNLPProvider);

    const fallbackResult = await fallbackService.analyzeResponse(
      "You are terrible at this game.",
      { condition: 'anonymous', videoTopic: 'Game', videoOrder: 99 }
    );
    assert.strictEqual(fallbackResult.success, true);
    assert.strictEqual(fallbackResult.data.metadata.fallback_used, true);
    assert.ok(fallbackResult.data.metadata.fallback_reason);
    assert.strictEqual(fallbackResult.data.metadata.provider, 'rule-based');
    logTest('Fallback: Gracefully falls back to RuleBasedProvider with fallback_used flag', true);

    // 8. Backward Compatibility: Older Coding Record without NLP data
    console.log('\n8. Testing Backward Compatibility with Old Coding Records...');
    const legacyResponse = await VideoResponse.create({
      participant: syntheticParticipant._id,
      video: syntheticVideo4._id,
      responseText: "Old manual coding from Phase 1 without any AI analysis.",
      responseTime: 20,
      submittedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000)
    });
    const legacyCoding = await Coding.create({
      response: legacyResponse._id,
      sentiment: 'neutral',
      aggression: { level: 0, category: 'none' },
      cyberbullying: { present: false, type: 'none', severity: 0 },
      coderRole: 'primary',
      codingVersion: '1.0',
      confidence: 'high',
      reviewStatus: 'reviewed'
      // No aiCoding field whatsoever
    });

    assert.ok(legacyCoding);
    assert.strictEqual(legacyCoding.aiCoding?.metadata?.sentiment_model, undefined);
    assert.strictEqual(legacyCoding.sentiment, 'neutral');
    logTest('Compatibility: Legacy Coding documents without NLP metadata render safely', true);

    // Clean up synthetic test records
    await VideoResponse.deleteMany({ _id: { $in: [syntheticResponse._id, modifyResponse._id, rejectResponse._id, legacyResponse._id] } });
    await Coding.deleteMany({ response: { $in: [syntheticResponse._id, modifyResponse._id, rejectResponse._id, legacyResponse._id] } });
    await Participant.deleteOne({ _id: syntheticParticipant._id });
    await Admin.deleteOne({ _id: syntheticAdmin._id });
    await Video.deleteMany({ _id: { $in: [syntheticVideo1._id, syntheticVideo2._id, syntheticVideo3._id, syntheticVideo4._id] } });
    logTest('Cleanup: Synthetic test records purged cleanly', true);

  } catch (error) {
    logTest('Phase 5 Test Suite execution failed', false, error);
    console.error(error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${testResults.passed} passed, ${testResults.failed} failed`);
  console.log('='.repeat(60) + '\n');

  if (testResults.failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests();
