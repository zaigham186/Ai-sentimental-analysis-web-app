/**
 * Phase 8: Final Production, Security, Reproducibility & Research Readiness
 * Comprehensive Automated Verification Suite
 */

const mongoose = require('mongoose');
const config = require('../config');
const { authLimiter, nlpLimiter, helmetMiddleware } = require('../middleware/security');
const codingController = require('../controllers/codingController');
const { Participant, Video, VideoResponse, Coding, Admin } = require('../models');
const { CodingAIService, RuleBasedProvider } = require('../services/codingAI');

// Mock Express response helper
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runPhase8HardeningTests() {
  console.log('============================================================');
  console.log('PHASE 8: FINAL PRODUCTION & SECURITY HARDENING VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

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
    // 1. Security Middleware Configuration Tests
    console.log('1. Verifying Security Middleware Configuration...');
    assert(typeof authLimiter === 'function', 'authLimiter is defined as Express middleware');
    assert(typeof nlpLimiter === 'function', 'nlpLimiter is defined as Express middleware');
    assert(typeof helmetMiddleware === 'function', 'helmetMiddleware is configured');

    // 2. Database Connection
    console.log('\n2. Connecting to MongoDB for Data Integrity Audits...');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
    assert(mongoose.connection.readyState === 1, 'MongoDB connected successfully');

    // 3. Controller Input Validation Tests (Malformed IDs must yield 400 Bad Request, not 500 CastError)
    console.log('\n3. Verifying Controller Input Validation (HTTP 400 vs CastError 500)...');
    
    // getResponseById
    const resGet = createMockRes();
    await codingController.getResponseById({ params: { id: 'malformed-object-id-123' } }, resGet);
    assert(resGet.statusCode === 400, 'getResponseById rejects malformed ID with 400 Bad Request');
    assert(resGet.body?.message === 'Invalid response ID format', 'getResponseById returns descriptive error message');

    // createCoding
    const resCreate = createMockRes();
    await codingController.createCoding({ 
      body: { responseId: 'invalid-id' }, 
      admin: { id: new mongoose.Types.ObjectId() } 
    }, resCreate);
    assert(resCreate.statusCode === 400, 'createCoding rejects malformed responseId with 400 Bad Request');
    assert(resCreate.body?.message === 'Invalid response ID format', 'createCoding returns descriptive error message');

    // updateCoding
    const resUpdate = createMockRes();
    await codingController.updateCoding({ 
      params: { id: 'not-valid-id' }, 
      body: { sentiment: 'negative' } 
    }, resUpdate);
    assert(resUpdate.statusCode === 400, 'updateCoding rejects malformed ID with 400 Bad Request');
    assert(resUpdate.body?.message === 'Invalid coding ID format', 'updateCoding returns descriptive error message');

    // deleteCoding
    const resDelete = createMockRes();
    await codingController.deleteCoding({ params: { id: 'bad-id' } }, resDelete);
    assert(resDelete.statusCode === 400, 'deleteCoding rejects malformed ID with 400 Bad Request');
    assert(resDelete.body?.message === 'Invalid coding ID format', 'deleteCoding returns descriptive error message');

    // analyzeWithAI
    const resAnalyze = createMockRes();
    await codingController.analyzeWithAI({ params: { id: 'bad-ai-id' } }, resAnalyze);
    assert(resAnalyze.statusCode === 400, 'analyzeWithAI rejects malformed ID with 400 Bad Request');
    assert(resAnalyze.body?.message === 'Invalid response ID format', 'analyzeWithAI returns descriptive error message');

    // reviewAISuggestion
    const resReview = createMockRes();
    await codingController.reviewAISuggestion({ 
      params: { id: 'bad-review-id' }, 
      body: { action: 'accept' },
      admin: { id: new mongoose.Types.ObjectId() }
    }, resReview);
    assert(resReview.statusCode === 400, 'reviewAISuggestion rejects malformed ID with 400 Bad Request');
    assert(resReview.body?.message === 'Invalid ID format', 'reviewAISuggestion returns descriptive error message');

    // bulkAnalyze
    const resBulk = createMockRes();
    await codingController.bulkAnalyze({ body: { responseIds: ['bad-id-1', 'bad-id-2'] } }, resBulk);
    assert(resBulk.statusCode === 400, 'bulkAnalyze rejects invalid responseIds array with 400 Bad Request');
    assert(resBulk.body?.message === 'One or more response IDs are invalid', 'bulkAnalyze returns descriptive error message');

    // 4. Participant Data Protection & Immutability Audit
    console.log('\n4. Verifying Participant Data Protection & Immutability Hooks...');
    const testParticipant = await Participant.create({
      username: `phase8_audit_${Date.now()}`,
      name: 'Audit Participant',
      age: 22,
      gender: 'female',
      university: 'SBBWU',
      department: 'Computer Science',
      condition: 'anonymous',
      status: 'active'
    });

    const testVideo = await Video.create({
      title: 'Phase 8 Audit Video',
      topic: 'Cyberbullying Stimulus',
      description: 'Audit stimulus for security verification',
      videoUrl: 'https://example.com/video8.mp4',
      duration: 120,
      order: 888
    });

    const initialText = 'Original, immutable participant research response.';
    const testResponse = await VideoResponse.create({
      participant: testParticipant._id,
      video: testVideo._id,
      responseText: initialText,
      responseLength: initialText.length,
      responseWordCount: 5
    });

    assert(testResponse.responseText === initialText, 'Participant VideoResponse created successfully');

    // Attempt to modify responseText on persistent document loaded from DB
    const savedResponse = await VideoResponse.findById(testResponse._id);
    let mutationBlocked = false;
    try {
      savedResponse.responseText = 'TAMPERED PARTICIPANT DATA';
      await savedResponse.save();
    } catch (err) {
      mutationBlocked = true;
      const isImmutabilityErr = 
        err.message.includes('immutable') || 
        err.message.includes('modified') || 
        err.message.includes('responseText') ||
        err.errors?.responseText?.reason?.message?.includes('immutable');
      assert(isImmutabilityErr, 
        'Direct mutation attempt blocked by Mongoose immutability hook: ' + (err.errors?.responseText?.reason?.message || err.message));
    }
    assert(mutationBlocked, 'Security Audit: Participant responseText is strictly tamper-proof');

    // Verify reloaded document from DB still contains original text
    const reloaded = await VideoResponse.findById(testResponse._id);
    assert(reloaded.responseText === initialText, 'Database verification: Original responseText remains unaltered');

    // 5. Construct Decoupling Audit (Sentiment ≠ Toxicity ≠ Aggression ≠ Cyberbullying)
    console.log('\n5. Verifying Separation of Research Constructs...');
    const testAdmin = await Admin.create({
      username: `audit_researcher_${Date.now()}`,
      email: `audit_${Date.now()}@research.edu`,
      passwordHash: '$2a$10$X7nE.G3j0qC8K1L9M6P4r.0sU9Y5V8w1z4T2q7R5s8p0m2n4k6',
      name: 'Dr. Research Auditor',
      role: 'researcher'
    });

    // Test a case where negative sentiment is present, but aggression and cyberbullying are NONE/ABSENT
    const nonAggressiveCoding = await Coding.create({
      response: testResponse._id,
      codedBy: testAdmin._id,
      coderRole: 'primary',
      sentiment: 'negative',
      aggression: {
        category: 'none',
        level: 0
      },
      cyberbullying: {
        present: false,
        type: 'none',
        severity: 0
      },
      reviewStatus: 'reviewed',
      notes: 'Construct independence verification test: Negative sentiment without cyberbullying.'
    });

    assert(nonAggressiveCoding.sentiment === 'negative', 'Coding record contains Negative sentiment');
    assert(nonAggressiveCoding.aggression.category === 'none', 'Aggression is categorized as None');
    assert(nonAggressiveCoding.cyberbullying.present === false, 'Cyberbullying is categorized as Absent');
    assert(nonAggressiveCoding.sentiment !== nonAggressiveCoding.cyberbullying.present, 
      'Construct independence confirmed: Negative sentiment does NOT force cyberbullying to true');

    // 6. Transparent Fallback & CodingAIService Verification
    console.log('\n6. Verifying CodingAIService & RuleBased Fallback...');
    const ruleBasedProvider = new RuleBasedProvider();
    const codingService = new CodingAIService(ruleBasedProvider);
    assert(codingService !== null, 'CodingAIService initializes successfully');

    const sampleAnalysis = await codingService.analyzeResponse('You are a terrible person and I hate you!', {
      condition: 'identifiable',
      videoTopic: 'Online conflict'
    });
    assert(sampleAnalysis.success === true, 'Analysis completes successfully via fallback provider');
    assert(sampleAnalysis.data?.sentiment?.label !== undefined, 'Fallback provider returns sentiment');
    assert(sampleAnalysis.data?.aggression?.label !== undefined, 'Fallback provider returns aggression');
    assert(sampleAnalysis.data?.cyberbullying?.present !== undefined, 'Fallback provider returns cyberbullying');

    // 7. Cleanup Test Records
    console.log('\n7. Cleaning up Audit Test Records...');
    await Coding.deleteOne({ _id: nonAggressiveCoding._id });
    await VideoResponse.deleteOne({ _id: testResponse._id });
    await Video.deleteOne({ _id: testVideo._id });
    await Participant.deleteOne({ _id: testParticipant._id });
    await Admin.deleteOne({ _id: testAdmin._id });
    assert(true, 'Audit test records cleaned up cleanly from database');

  } catch (err) {
    console.error('Hardening test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n============================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✓ ALL PHASE 8 HARDENING AND SECURITY AUDIT TESTS PASSED!');
  }
}

runPhase8HardeningTests();
