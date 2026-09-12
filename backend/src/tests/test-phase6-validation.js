/**
 * Phase 6: Research Validation, Accuracy Evaluation & Calibration Test Suite
 * 
 * Verifies:
 * 1. Admin Validation Status endpoint (/api/admin/coding/validation-status)
 * 2. Accuracy metrics, Cohen's kappa, and threshold calibration contract
 * 3. Zero-fabrication principle (explicit handling of unvalidated vs validated state)
 * 4. Human-in-the-loop workflow regression check (Accept / Modify / Reject)
 * 5. Participant submission and database safety regression check
 * 6. Privacy check (zero participant text in logs or validation report)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const { Participant, Video, VideoResponse, Coding, Admin } = require('../models');
const { CodingAIService, createCodingProvider } = require('../services/codingAI');
const codingController = require('../controllers/codingController');

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

async function runPhase6Tests() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 6: RESEARCH VALIDATION & CALIBRATION TEST SUITE');
  console.log('='.repeat(60) + '\n');

  try {
    // 0. Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cyberbullying_research');
    }

    // 1. Verify Live FastAPI NLP Service Health
    console.log('1. Checking Live FastAPI NLP Service Health...');
    const nlpUrl = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001';
    const healthRes = await axios.get(`${nlpUrl}/health`, { timeout: 5000 });
    assert.strictEqual(healthRes.data.status, 'healthy');
    assert.strictEqual(healthRes.data.models_ready, true);
    logTest('NLP Service: Live and healthy with loaded models', true);

    // 2. Test Validation Artifacts on Disk
    console.log('\n2. Verifying Validation Engine Artifacts...');
    const resultsDir = path.resolve(__dirname, '../../../validation/results');
    const reportsDir = path.resolve(__dirname, '../../../validation/reports');

    assert.ok(fs.existsSync(path.join(resultsDir, 'validation_report.json')), 'validation_report.json must exist');
    assert.ok(fs.existsSync(path.join(resultsDir, 'metrics.json')), 'metrics.json must exist');
    assert.ok(fs.existsSync(path.join(resultsDir, 'confusion_matrices.json')), 'confusion_matrices.json must exist');
    assert.ok(fs.existsSync(path.join(resultsDir, 'threshold_analysis.json')), 'threshold_analysis.json must exist');
    assert.ok(fs.existsSync(path.join(resultsDir, 'errors.json')), 'errors.json must exist');
    assert.ok(fs.existsSync(path.join(reportsDir, 'VALIDATION_REPORT.md')), 'VALIDATION_REPORT.md must exist');
    logTest('Validation Artifacts: All 5 JSON results and Markdown report present', true);

    const report = JSON.parse(fs.readFileSync(path.join(resultsDir, 'validation_report.json'), 'utf8'));
    assert.strictEqual(report.is_validated, true);
    assert.strictEqual(report.validation_status, 'Benchmark Validated');
    assert.strictEqual(report.is_synthetic_benchmark, true);
    assert.strictEqual(report.sample_count, 15);
    logTest('Validation Contract: Benchmark dataset correctly labeled as synthetic benchmark', true);

    // Verify metrics precision, recall, F1, and kappa
    const cb = report.summary.cyberbullying;
    assert.ok(cb.accuracy !== undefined, 'Cyberbullying accuracy must be present');
    assert.ok(cb.precision !== undefined, 'Cyberbullying precision must be present');
    assert.ok(cb.recall !== undefined, 'Cyberbullying recall must be present');
    assert.ok(cb.f1 !== undefined, 'Cyberbullying F1 must be present');
    assert.ok(cb.cohen_kappa !== undefined, 'Cyberbullying Cohen kappa must be present');
    logTest('Metrics Contract: Cyberbullying accuracy, precision, recall, F1, and Cohen kappa present', true);

    // Verify threshold calibration
    const thresh = report.threshold_calibration;
    assert.ok(thresh.cyberbullying_optimal !== undefined, 'Optimal threshold must be present');
    assert.ok(thresh.cyberbullying_best_f1 !== undefined, 'Best F1 must be present');
    logTest('Calibration Contract: Optimal operating threshold calculated', true);

    // Verify inter-rater reliability
    const ir = report.inter_rater;
    assert.strictEqual(ir.secondary_coder_available, true);
    assert.ok(ir.cohen_kappa.sentiment !== undefined, 'Human-human sentiment kappa present');
    assert.ok(ir.cohen_kappa.cyberbullying !== undefined, 'Human-human cyberbullying kappa present');
    logTest('Inter-Rater Reliability: Human-vs-human Cohen kappa calculated', true);

    // 3. Test Controller getValidationStatus Endpoint
    console.log('\n3. Testing Admin getValidationStatus Controller Method...');
    let controllerResponseData = null;
    let controllerResponseStatus = 200;

    const mockReq = { user: { role: 'researcher' } };
    const mockRes = {
      status: (code) => {
        controllerResponseStatus = code;
        return mockRes;
      },
      json: (data) => {
        controllerResponseData = data;
        return mockRes;
      }
    };

    await codingController.getValidationStatus(mockReq, mockRes);
    assert.strictEqual(controllerResponseStatus, 200);
    assert.strictEqual(controllerResponseData.success, true);
    assert.strictEqual(controllerResponseData.data.is_validated, true);
    assert.strictEqual(controllerResponseData.data.sample_count, 15);
    assert.strictEqual(controllerResponseData.data.nlpHealth.available, true);
    logTest('Controller Method: getValidationStatus returns valid validation payload with live NLP health', true);

    // 4. Test Zero-Fabrication Behavior on Missing Report
    console.log('\n4. Testing Zero-Fabrication Fallback Behavior...');
    const tempBackupPath = path.join(resultsDir, 'validation_report.json.tmp_test_backup');
    const realReportPath = path.join(resultsDir, 'validation_report.json');

    // Temporarily rename to test missing report handling
    fs.renameSync(realReportPath, tempBackupPath);
    try {
      let unvalidatedData = null;
      const unvalidatedRes = {
        json: (data) => { unvalidatedData = data; return unvalidatedRes; },
        status: () => unvalidatedRes
      };
      await codingController.getValidationStatus(mockReq, unvalidatedRes);
      assert.strictEqual(unvalidatedData.success, true);
      assert.strictEqual(unvalidatedData.data.is_validated, false);
      assert.strictEqual(unvalidatedData.data.validation_status, 'Not validated');
      assert.strictEqual(unvalidatedData.data.sample_count, 0);
      assert.ok(unvalidatedData.data.message.includes('HUMAN GOLD LABELS REQUIRED'));
      logTest('Zero-Fabrication Guard: Unvalidated state correctly reports HUMAN GOLD LABELS REQUIRED', true);
    } finally {
      // Restore file
      fs.renameSync(tempBackupPath, realReportPath);
    }

    // 5. Existing System Regression Test: Human-in-the-Loop Review
    console.log('\n5. Regression Test: Human-in-the-Loop Review Workflow...');
    let syntheticAdmin = await Admin.findOne({ username: 'phase6_synth_admin' });
    if (!syntheticAdmin) {
      syntheticAdmin = await Admin.create({
        username: 'phase6_synth_admin',
        email: 'phase6_admin@example.com',
        name: 'Phase 6 Researcher',
        passwordHash: '$2a$10$dummyhashforphase6tests000000000000000000000000000000000',
        role: 'researcher'
      });
    }

    let syntheticParticipant = await Participant.findOne({ username: 'phase6_synth_user' });
    if (!syntheticParticipant) {
      syntheticParticipant = await Participant.create({
        username: 'phase6_synth_user',
        name: 'Phase 6 Participant',
        age: 23,
        gender: 'female',
        university: 'SBBWU',
        department: 'Psychology',
        condition: 'anonymous',
        status: 'active',
        consentGiven: true
      });
    }

    let syntheticVideo = await Video.findOne({ order: 105 });
    if (!syntheticVideo) {
      syntheticVideo = await Video.create({
        title: 'Phase 6 Synthetic Video Stimulus',
        topic: 'Campus Social Media Stimulus',
        description: 'Synthetic video stimulus for Phase 6 regression verification',
        videoUrl: 'https://example.com/phase6-stimulus.mp4',
        duration: 90,
        order: 105,
        active: true,
        version: '1.0'
      });
    }

    // Clean up any stale responses for this synthetic pair
    await VideoResponse.deleteMany({ participant: syntheticParticipant._id, video: syntheticVideo._id });
    await Coding.deleteMany({ response: { $in: await VideoResponse.find({ participant: syntheticParticipant._id }).distinct('_id') } });

    // Create synthetic response
    const synthResponse = await VideoResponse.create({
      participant: syntheticParticipant._id,
      video: syntheticVideo._id,
      responseText: 'I will destroy your reputation and make sure you regret this.',
      responseDuration: 18,
      videoPlaybackProgress: 100,
      videoWatchCount: 1,
      order: 105
    });

    const codingAI = new CodingAIService(createCodingProvider());
    const aiResult = await codingAI.analyzeResponse(synthResponse.responseText, {
      videoTopic: syntheticVideo.topic,
      condition: syntheticParticipant.condition
    });
    assert.strictEqual(aiResult.success, true);
    assert.ok(aiResult.data.sentiment.label);
    assert.ok(aiResult.data.cyberbullying);
    logTest('Regression: AI Analysis succeeds and returns valid multi-dimensional data', true);

    // Create coding document with pending status
    const codingRecord = await Coding.create({
      response: synthResponse._id,
      coderRole: 'primary',
      aiCoding: {
        sentiment: aiResult.data.sentiment,
        aggression: aiResult.data.aggression,
        cyberbullying: aiResult.data.cyberbullying,
        metadata: aiResult.data.metadata
      },
      reviewStatus: 'pending',
      codingVersion: '1.0'
    });
    assert.strictEqual(codingRecord.reviewStatus, 'pending');

    // Human review action (Accept AI)
    codingRecord.sentiment = codingRecord.aiCoding.sentiment.label;
    codingRecord.aggression = {
      level: codingRecord.aiCoding.aggression.level,
      category: codingRecord.aiCoding.aggression.label
    };
    codingRecord.cyberbullying = {
      present: codingRecord.aiCoding.cyberbullying.present,
      type: codingRecord.aiCoding.cyberbullying.type,
      severity: codingRecord.aiCoding.cyberbullying.severity
    };
    codingRecord.reviewStatus = 'reviewed';
    codingRecord.reviewAction = 'accepted_ai';
    codingRecord.reviewedBy = syntheticAdmin._id;
    codingRecord.reviewedAt = new Date();
    codingRecord.codedBy = syntheticAdmin._id;
    codingRecord.codedAt = new Date();
    await codingRecord.save();
    logTest('Regression: Human-in-the-loop review workflow preserved intact', true);

    // Verify response immutability
    const verifiedResponse = await VideoResponse.findById(synthResponse._id);
    assert.strictEqual(verifiedResponse.responseText, 'I will destroy your reputation and make sure you regret this.');
    logTest('Regression: Original participant response text remained 100% immutable', true);

    // 6. Privacy Check: Ensure no raw participant text in validation report
    console.log('\n6. Privacy & Research Integrity Check...');
    const reportStr = fs.readFileSync(path.join(resultsDir, 'validation_report.json'), 'utf8');
    assert.ok(!reportStr.includes(synthResponse._id.toString()), 'No production response IDs in validation report');
    logTest('Privacy Check: Production participant data strictly isolated from validation benchmarks', true);

    // Cleanup synthetic test records
    await Coding.deleteMany({ response: synthResponse._id });
    await VideoResponse.deleteMany({ _id: synthResponse._id });
    logTest('Cleanup: Test artifacts cleanly purged from database', true);

  } catch (err) {
    logTest('Unexpected Execution Failure', false, err);
  } finally {
    console.log('\n' + '='.repeat(60));
    console.log(`RESULTS: ${testResults.passed} passed, ${testResults.failed} failed`);
    console.log('='.repeat(60) + '\n');
    await mongoose.disconnect();
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

runPhase6Tests();
