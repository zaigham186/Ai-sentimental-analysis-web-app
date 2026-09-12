/**
 * Phase 4: Live End-to-End Verification Script
 * Tests live communication between Express backend components and FastAPI NLP service.
 * Verifies:
 * - Real model inference stored in MongoDB Coding collection
 * - aiCoding.sentiment, aiCoding.aggression, aiCoding.cyberbullying, aiCoding.metadata
 * - reviewStatus remains 'pending'
 * - responseText remains 100% immutable
 * - Bulk analysis on 5 synthetic responses
 * - Graceful fallback to RuleBasedProvider when service is unreachable
 */

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');
const axios = require('axios');
const config = require('../config');
const { Participant, Video, VideoResponse, Coding, Admin } = require('../models');
const { CodingAIService, createCodingProvider, RuleBasedProvider } = require('../services/codingAI');
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

async function runLiveE2ETests() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 4: LIVE END-TO-END VERIFICATION');
  console.log('='.repeat(60) + '\n');

  // 1. Verify FastAPI NLP Service is Healthy
  console.log('1. Checking Live FastAPI NLP Service Health...');
  try {
    const healthUrl = `${process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001'}/health`;
    const healthRes = await axios.get(healthUrl, { timeout: 5000 });
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.data.status, 'healthy');
    assert.strictEqual(healthRes.data.models_ready, true);
    assert.strictEqual(healthRes.data.models?.sentiment?.loaded, true);
    assert.strictEqual(healthRes.data.models?.toxicity?.loaded, true);
    assert.strictEqual(healthRes.data.models?.aggression?.loaded, true);
    assert.strictEqual(healthRes.data.models?.cyberbullying?.loaded, true);

    console.log(`     Connected to FastAPI on ${healthUrl} (All 4 models loaded in RAM)`);
    logTest('FastAPI: Live service is running and reports healthy', true);
  } catch (error) {
    logTest('FastAPI: Live service is running and reports healthy', false, error);
    console.error('FastAPI health check failed. Ensure FastAPI is running on port 8001.');
    process.exit(1);
  }

  // 2. Connect to MongoDB
  console.log('\n2. Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('     Connected to MongoDB successfully.');

  let testAdmin, testParticipant, testVideo, testResponse1;
  const bulkResponses = [];

  try {
    // Clean up previous test artifacts
    await Participant.deleteMany({ username: /^test_e2e_/i });
    await Video.deleteMany({ title: /^test_e2e_/i });
    await Admin.deleteMany({ username: /^test_e2e_/i });

    // Seed test fixtures
    testAdmin = await Admin.create({
      username: 'TEST_E2E_admin',
      email: 'test_e2e_admin@example.com',
      passwordHash: 'dummyhash',
      name: 'E2E Test Researcher',
      role: 'coder'
    });

    testParticipant = await Participant.create({
      name: 'E2E Test Participant',
      username: 'TEST_E2E_user1',
      age: 21,
      gender: 'female',
      university: 'SBBWU',
      department: 'Psychology',
      condition: 'anonymous'
    });

    testVideo = await Video.create({
      title: 'TEST_E2E_Video Stimulus',
      topic: 'cyberbullying',
      description: 'Stimulus video for cyberbullying research',
      videoUrl: 'https://example.com/test-stimulus.mp4',
      duration: 90,
      order: 1,
      version: '1.0'
    });

    const originalText = 'You are a complete idiot and I hate you.';
    testResponse1 = await VideoResponse.create({
      participant: testParticipant._id,
      video: testVideo._id,
      responseText: originalText,
      responseTime: 45
    });

    // 3. Test Live Primary NLP Analysis
    console.log('\n3. Testing Live Individual Analysis with NLPProvider...');
    const nlpProvider = new NLPProvider({
      url: process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001',
      timeout: 30000,
      fallbackEnabled: true
    });

    const codingAI = new CodingAIService(nlpProvider);
    const aiResult = await codingAI.analyzeResponse(testResponse1.responseText, {
      condition: testParticipant.condition,
      videoTopic: testVideo.topic,
      videoOrder: testVideo.order
    });

    assert.strictEqual(aiResult.success, true);
    const analysis = aiResult.data;

    // Verify NLP output structure
    assert.strictEqual(analysis.sentiment.label, 'negative');
    assert.ok(analysis.sentiment.score > 0.8);
    assert.strictEqual(analysis.aggression.label, 'moderate');
    assert.ok(analysis.aggression.level >= 4 && analysis.aggression.level <= 10);
    assert.strictEqual(analysis.cyberbullying.present, true);
    assert.strictEqual(analysis.cyberbullying.classification, 'cyberbullying');
    assert.strictEqual(analysis.metadata.provider, 'nlp');
    assert.strictEqual(analysis.metadata.fallback_used, false);
    assert.strictEqual(analysis.metadata.sentiment_model, 'cardiffnlp/twitter-xlm-roberta-base-sentiment');
    assert.strictEqual(analysis.metadata.toxicity_model, 'detoxify-multilingual');

    logTest('Live NLP Analysis: Successfully analyzed text using Twitter-XLM-RoBERTa + Detoxify + Research Aggression/Cyberbullying', true);

    // 4. Save to MongoDB Coding document
    console.log('\n4. Testing Persistence to MongoDB Coding Document...');
    const codingDoc = await Coding.create({
      response: testResponse1._id,
      coderRole: 'primary',
      aiCoding: {
        sentiment: {
          label: analysis.sentiment.label,
          confidence: analysis.sentiment.confidence,
          evidence: analysis.sentiment.evidence,
          needsReview: analysis.sentiment.needsReview
        },
        aggression: {
          label: analysis.aggression.label,
          level: analysis.aggression.level,
          confidence: analysis.aggression.confidence,
          evidence: analysis.aggression.evidence,
          needsReview: analysis.aggression.needsReview
        },
        cyberbullying: {
          present: analysis.cyberbullying.present,
          type: analysis.cyberbullying.type,
          severity: analysis.cyberbullying.severity,
          confidence: analysis.cyberbullying.confidence,
          evidence: analysis.cyberbullying.evidence,
          criteriaMatched: analysis.cyberbullying.criteriaMatched || [],
          needsReview: analysis.cyberbullying.needsReview
        },
        metadata: analysis.metadata,
        modelName: analysis.metadata?.provider || 'rule-based',
        modelVersion: analysis.metadata?.version || '1.0',
        detectedLanguage: analysis.metadata?.detectedLanguage,
        languageConfidence: analysis.metadata?.languageConfidence,
        needsHumanReview: analysis.needsHumanReview,
        analyzedAt: new Date()
      },
      reviewStatus: 'pending',
      codingVersion: '1.0'
    });

    // Retrieve from database and verify
    const retrievedCoding = await Coding.findById(codingDoc._id);
    assert.strictEqual(retrievedCoding.reviewStatus, 'pending');
    assert.strictEqual(retrievedCoding.aiCoding.sentiment.label, 'negative');
    assert.ok(retrievedCoding.aiCoding.aggression.level >= 4);
    assert.strictEqual(retrievedCoding.aiCoding.cyberbullying.present, true);
    assert.strictEqual(retrievedCoding.aiCoding.metadata.provider, 'nlp');
    assert.strictEqual(retrievedCoding.aiCoding.metadata.fallback_used, false);
    assert.ok(retrievedCoding.aiCoding.metadata.toxicity.insult > 0.5);

    logTest('MongoDB Persistence: Coding document correctly stores full AI suggestions and provenance', true);

    // 5. Verify Original Response Text is 100% Intact
    console.log('\n5. Verifying Original Response Text Immutability...');
    const freshResponse = await VideoResponse.findById(testResponse1._id);
    assert.strictEqual(freshResponse.responseText, originalText);
    logTest('Integrity Check: Original responseText remains 100% unaltered', true);

    // 6. Test Bulk Analysis with 5 Synthetic Responses
    console.log('\n6. Testing Bulk Analysis with 5 Synthetic Responses...');
    const bulkTexts = [
      "I found the video informative and clear.",
      "The explanation was somewhat dry and confusing.",
      "The idea discussed is dumb in my opinion.",
      "You are an idiot, shut up.",
      "I will hurt and attack you."
    ];

    for (let i = 0; i < bulkTexts.length; i++) {
      const resp = await VideoResponse.create({
        participant: testParticipant._id,
        video: (await Video.create({
          title: `TEST_E2E_Bulk_Video_${i}`,
          topic: 'research',
          description: 'test',
          videoUrl: `https://example.com/v${i}.mp4`,
          duration: 60,
          order: i + 2,
          version: '1.0'
        }))._id,
        responseText: bulkTexts[i],
        responseTime: 30
      });
      bulkResponses.push(resp);
    }

    let bulkSuccess = 0;
    for (const resp of bulkResponses) {
      const bResult = await codingAI.analyzeResponse(resp.responseText, {
        condition: 'anonymous',
        videoTopic: 'research',
        videoOrder: 1
      });

      if (bResult.success) {
        await Coding.create({
          response: resp._id,
          coderRole: 'primary',
          aiCoding: {
            sentiment: bResult.data.sentiment,
            aggression: bResult.data.aggression,
            cyberbullying: bResult.data.cyberbullying,
            metadata: bResult.data.metadata,
            modelName: bResult.data.metadata?.provider || 'nlp',
            modelVersion: '1.0',
            needsHumanReview: bResult.data.needsHumanReview,
            analyzedAt: new Date()
          },
          reviewStatus: 'pending',
          codingVersion: '1.0'
        });
        bulkSuccess++;
      }
    }

    assert.strictEqual(bulkSuccess, 5);
    const countPending = await Coding.countDocuments({ reviewStatus: 'pending' });
    assert.ok(countPending >= 5);

    logTest('Bulk Analysis: All 5 synthetic responses analyzed and saved with reviewStatus: pending', true);

    // 7. Test Live Fallback Mechanism (Simulating Python Service Offline)
    console.log('\n7. Testing Fallback to RuleBasedProvider...');
    const offlineProvider = new NLPProvider({
      url: 'http://127.0.0.1:59999', // Port with no server running
      timeout: 1000,
      fallbackEnabled: true,
      fallbackProvider: new RuleBasedProvider()
    });

    const fallbackService = new CodingAIService(offlineProvider);
    const fallbackResult = await fallbackService.analyzeResponse('I really like this great video', {
      condition: 'anonymous',
      videoTopic: 'research'
    });

    assert.strictEqual(fallbackResult.success, true);
    assert.strictEqual(fallbackResult.data.sentiment.label, 'positive');
    assert.strictEqual(fallbackResult.data.metadata.provider, 'rule-based');
    assert.strictEqual(fallbackResult.data.metadata.primary_provider, 'nlp');
    assert.strictEqual(fallbackResult.data.metadata.fallback_used, true);
    assert.ok(fallbackResult.data.metadata.fallback_reason.includes('connection refused') || fallbackResult.data.metadata.fallback_reason.includes('unavailable'));

    logTest('Fallback Mechanism: Unreachable NLP service triggers transparent RuleBasedProvider fallback with audit trail', true);

  } catch (error) {
    console.error('Test execution error:', error);
    logTest('Live E2E Verification Suite', false, error);
  } finally {
    // Clean up test data
    console.log('\n8. Cleaning up test data...');
    if (testParticipant) {
      await VideoResponse.deleteMany({ participant: testParticipant._id });
      await Coding.deleteMany({ response: { $in: [testResponse1?._id, ...bulkResponses.map(r => r._id)] } });
      await Participant.deleteMany({ username: /^test_e2e_/i });
      await Video.deleteMany({ title: /^test_e2e_/i });
      await Admin.deleteMany({ username: /^test_e2e_/i });
    }
    await mongoose.disconnect();
    console.log('     Disconnected from MongoDB.');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('LIVE E2E TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log('='.repeat(60) + '\n');

  if (testResults.failed > 0) {
    process.exit(1);
  } else {
    console.log('✓ ALL LIVE END-TO-END TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runLiveE2ETests().catch(err => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});
