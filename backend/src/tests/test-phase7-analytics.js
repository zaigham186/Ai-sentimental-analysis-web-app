const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Connect to test database
const config = require('../config');
const { Participant, Video, VideoResponse, Coding, Admin } = require('../models');
const researchAnalyticsService = require('../services/researchAnalyticsService');
const {
  round,
  calculateValidPercentage,
  calculateCategoricalDistribution,
  calculateNumericSummary
} = require('../utils/researchStatistics');

async function runPhase7Tests() {
  console.log('============================================================');
  console.log('PHASE 7: RESEARCH ANALYTICS & REPORTING VERIFICATION');
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
    // 1. Statistical Utility Tests
    console.log('1. Testing Statistical Utilities...');
    assert(round(3.14159, 2) === 3.14, 'round(3.14159, 2) === 3.14');
    assert(round(null) === null, 'round(null) returns null safely');
    assert(calculateValidPercentage(5, 10) === 50.0, 'calculateValidPercentage(5, 10) === 50%');
    assert(calculateValidPercentage(5, 0) === 0.0, 'calculateValidPercentage with 0 denominator returns 0.0 (no division by zero error)');

    const catItems = ['positive', 'negative', 'positive', null, 'neutral', 'positive'];
    const catDist = calculateCategoricalDistribution(catItems, ['positive', 'neutral', 'negative', 'mixed']);
    assert(catDist.counts.positive === 3, 'Categorical counts: positive === 3');
    assert(catDist.counts.negative === 1, 'Categorical counts: negative === 1');
    assert(catDist.counts.neutral === 1, 'Categorical counts: neutral === 1');
    assert(catDist.missingCount === 1, 'Categorical missingCount preserved (1 missing)');
    assert(catDist.validTotal === 5, 'Valid denominator total === 5 (missing excluded from denominator)');
    assert(catDist.percentages.positive === 60.0, 'Valid percentage: 3/5 * 100 === 60.0%');

    const numDist = calculateNumericSummary([2, 8, 4, null, 6, 10]);
    assert(numDist.validCount === 5, 'Numeric validCount === 5');
    assert(numDist.missingCount === 1, 'Numeric missingCount === 1');
    assert(numDist.mean === 6.0, 'Numeric mean === 6.0');
    assert(numDist.median === 6.0, 'Numeric median === 6.0');
    assert(numDist.min === 2.0, 'Numeric min === 2.0');
    assert(numDist.max === 10.0, 'Numeric max === 10.0');

    // 2. Database Connection
    console.log('\n2. Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    assert(mongoose.connection.readyState === 1, 'Connected to MongoDB successfully');

    // 3. Setup Synthetic Research Data
    console.log('\n3. Setting up Controlled Synthetic Dataset...');
    const testSuffix = Date.now().toString().slice(-6);

    // Create 2 test participants (1 Anonymous, 1 Identifiable)
    const [pAnon, pIdent] = await Promise.all([
      Participant.create({
        name: `Test Anon ${testSuffix}`,
        username: `anon_${testSuffix}`,
        age: 21,
        gender: 'female',
        university: 'SBBWU',
        department: 'Psychology',
        condition: 'anonymous',
        status: 'completed',
        consentGiven: true
      }),
      Participant.create({
        name: `Test Ident ${testSuffix}`,
        username: `ident_${testSuffix}`,
        age: 22,
        gender: 'female',
        university: 'SBBWU',
        department: 'Computer Science',
        condition: 'identifiable',
        status: 'completed',
        consentGiven: true
      })
    ]);

    // Create a test video
    const testVideo = await Video.create({
      title: `Research Video ${testSuffix}`,
      topic: 'Cyberbullying Stimulus',
      description: 'Test stimulus for research analytics verification',
      videoUrl: `https://example.com/video-${testSuffix}.mp4`,
      duration: 120,
      order: 99,
      active: true,
      validationStatus: 'approved'
    });

    // Create 2 video responses
    const [respAnon, respIdent] = await Promise.all([
      VideoResponse.create({
        participant: pAnon._id,
        video: testVideo._id,
        responseText: 'This person is awful and should be banned from campus!',
        responseLength: 53,
        responseWordCount: 10,
        responseTime: 14
      }),
      VideoResponse.create({
        participant: pIdent._id,
        video: testVideo._id,
        responseText: 'I respectfully disagree with the points made in this video.',
        responseLength: 60,
        responseWordCount: 9,
        responseTime: 20
      })
    ]);

    // Create 2 coding records:
    // respAnon: AI says non-cyberbullying, but Human reviews and codes as Cyberbullying (Discrepancy test)
    // respIdent: Both AI and Human agree non-cyberbullying, negative sentiment
    const [codingAnon, codingIdent] = await Promise.all([
      Coding.create({
        response: respAnon._id,
        coderRole: 'primary',
        reviewStatus: 'reviewed',
        reviewAction: 'modified',
        sentiment: 'negative',
        aggression: { level: 8, category: 'severe' },
        cyberbullying: { present: true, type: 'harassment', severity: 7 },
        aiCoding: {
          sentiment: { label: 'neutral', score: 0.6 },
          aggression: { label: 'moderate', level: 5 },
          cyberbullying: { present: false, severity: 2 },
          toxicity: { is_toxic: true, overall_score: 0.82, categories: { insult: 0.85, threat: 0.1, obscene: 0.05, identity_attack: 0.0, severe_toxicity: 0.2 } }
        },
        reviewedAt: new Date()
      }),
      Coding.create({
        response: respIdent._id,
        coderRole: 'primary',
        reviewStatus: 'reviewed',
        reviewAction: 'accepted_ai',
        sentiment: 'negative',
        aggression: { level: 0, category: 'none' },
        cyberbullying: { present: false, type: 'none', severity: 0 },
        aiCoding: {
          sentiment: { label: 'negative', score: 0.8 },
          aggression: { label: 'none', level: 0 },
          cyberbullying: { present: false, severity: 0 },
          toxicity: { is_toxic: false, overall_score: 0.05, categories: { insult: 0.02, threat: 0.0, obscene: 0.0, identity_attack: 0.0, severe_toxicity: 0.0 } }
        },
        reviewedAt: new Date()
      })
    ]);

    assert(codingAnon._id && codingIdent._id, 'Synthetic research records created successfully');

    // 4. Testing Overview Service
    console.log('\n4. Testing Overview Metrics Service...');
    const overview = await researchAnalyticsService.getOverview({ video: testVideo._id.toString() });
    assert(overview.summary.totalResponses === 2, 'Overview: Total responses === 2 for test stimulus');
    assert(overview.summary.finalCodedCount === 2, 'Overview: Final coded count === 2');
    assert(overview.summary.codingCompletionRate === 100.0, 'Overview: Coding completion rate === 100%');
    assert(overview.summary.cyberbullyingCount === 1, 'Overview: Cyberbullying count === 1');
    assert(overview.summary.cyberbullyingRate === 50.0, 'Overview: Cyberbullying rate === 50%');
    assert(overview.sentiment.negative === 2, 'Overview: Negative sentiment count === 2');

    // 5. Testing Final Coding Priority
    console.log('\n5. Verifying Final Coding Priority Principle...');
    // For respAnon, AI said cyberbullying=false, but Human final coding is cyberbullying=true.
    // The overview cyberbullying count must reflect Human final coding (1 positive), not AI (0).
    assert(overview.summary.cyberbullyingCount === 1, 'Final Coding Priority: Uses human-approved coding (1), NOT AI prediction (0)');

    // 6. Testing Condition Comparison (Anonymous vs Identifiable)
    console.log('\n6. Testing Condition Comparison...');
    const comp = await researchAnalyticsService.getConditionComparison({ video: testVideo._id.toString() });
    assert(comp.anonymous.totalResponses === 1, 'Condition Comparison: Anonymous responses === 1');
    assert(comp.anonymous.cyberbullying.count === 1, 'Condition Comparison: Anonymous cyberbullying === 1 (100%)');
    assert(comp.identifiable.totalResponses === 1, 'Condition Comparison: Identifiable responses === 1');
    assert(comp.identifiable.cyberbullying.count === 0, 'Condition Comparison: Identifiable cyberbullying === 0 (0%)');
    assert(comp.anonymous.aggression.meanScore === 8.0, 'Condition Comparison: Anonymous mean aggression === 8.0');
    assert(comp.identifiable.aggression.meanScore === 0.0, 'Condition Comparison: Identifiable mean aggression === 0.0');

    // 7. Testing AI vs Human Agreement & Discrepancies
    console.log('\n7. Testing AI vs Human Agreement Service...');
    const aiHuman = await researchAnalyticsService.getAIHumanAgreement({ video: testVideo._id.toString() });
    assert(aiHuman.summary.totalReviewed === 2, 'AI vs Human: Total reviewed === 2');
    assert(aiHuman.summary.acceptedCount === 1, 'AI vs Human: Accepted count === 1 (50%)');
    assert(aiHuman.summary.modifiedCount === 1, 'AI vs Human: Modified count === 1 (50%)');
    assert(aiHuman.summary.discrepancyCount === 1, 'AI vs Human: Exactly 1 discrepancy detected (respAnon)');
    assert(aiHuman.discrepancies[0].ai.cyberbullying === 'No' && aiHuman.discrepancies[0].final.cyberbullying === 'Yes',
      'AI vs Human: Discrepancy details correctly capture AI (No) vs Final (Yes)');

    // 8. Testing Video Comparison
    console.log('\n8. Testing Video Comparison Breakdown...');
    const videoBreakdown = await researchAnalyticsService.getVideoComparison();
    const currentVideoStat = videoBreakdown.find(v => v.videoId.toString() === testVideo._id.toString());
    assert(currentVideoStat !== undefined, 'Video Breakdown: Stimulus found in breakdown list');
    assert(currentVideoStat.responseCount === 2, 'Video Breakdown: Response count === 2');
    assert(currentVideoStat.cyberbullyingRate === 50.0, 'Video Breakdown: Cyberbullying rate === 50%');

    // 9. Testing Paginated Responses Table
    console.log('\n9. Testing Paginated Responses Table...');
    const tableData = await researchAnalyticsService.getResponsesTable({ video: testVideo._id.toString() }, { page: 1, limit: 10 });
    assert(tableData.rows.length === 2, 'Responses Table: Correct row count returned');
    assert(tableData.rows[0].finalCoding.sentiment !== undefined, 'Responses Table: Contains finalCoding');
    assert(tableData.rows[0].aiSuggestion.sentiment !== undefined, 'Responses Table: Contains aiSuggestion');

    // 10. Testing Phase 6 Validation Summary
    console.log('\n10. Testing Phase 6 Validation Integration...');
    const valSummary = researchAnalyticsService.getValidationSummary();
    assert(typeof valSummary.is_validated === 'boolean', 'Validation Integration: Returns is_validated flag');
    if (valSummary.is_validated) {
      assert(valSummary.summary?.cyberbullying?.accuracy !== undefined, 'Validation Integration: Surfaces empirical accuracy');
      assert(valSummary.summary?.cyberbullying?.cohen_kappa !== undefined, 'Validation Integration: Surfaces Cohen kappa');
    } else {
      assert(valSummary.message.includes('HUMAN GOLD LABELS REQUIRED'), 'Validation Integration: Correct zero-fabrication message');
    }

    // 11. Testing CSV & Supervisor Report Export
    console.log('\n11. Testing Data Export Generation...');
    const csvContent = await researchAnalyticsService.generateCSV({ video: testVideo._id.toString() });
    assert(csvContent.includes('response_id,condition,video_order'), 'CSV Export: Correct headers present');
    assert(csvContent.includes('anonymous') && csvContent.includes('identifiable'), 'CSV Export: Contains condition rows');

    const supReport = await researchAnalyticsService.getSupervisorReport({ video: testVideo._id.toString() });
    assert(supReport.metadata.project !== undefined, 'Supervisor Report: Contains metadata');
    assert(supReport.overview !== undefined, 'Supervisor Report: Contains overview');
    assert(supReport.conditionComparison !== undefined, 'Supervisor Report: Contains condition comparison');
    assert(supReport.methodologyNote.includes('distinct analytical constructs'), 'Supervisor Report: Contains formal methodology note');

    // 12. Read-Only Safety Verification
    console.log('\n12. Verifying Read-Only Safety & Immutability...');
    const reloadedResponse = await VideoResponse.findById(respAnon._id);
    assert(reloadedResponse.responseText === 'This person is awful and should be banned from campus!',
      'Read-Only Check: Participant responseText remains strictly unaltered');

    // 13. Cleanup Test Data
    console.log('\n13. Cleaning up Synthetic Test Records...');
    await Coding.deleteMany({ _id: { $in: [codingAnon._id, codingIdent._id] } });
    await VideoResponse.deleteMany({ _id: { $in: [respAnon._id, respIdent._id] } });
    await Participant.deleteMany({ _id: { $in: [pAnon._id, pIdent._id] } });
    await Video.deleteOne({ _id: testVideo._id });
    assert(true, 'Test records cleaned up cleanly');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n============================================================');
  console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✓ ALL PHASE 7 AUTOMATED INTEGRATION TESTS PASSED!');
  }
}

runPhase7Tests();
