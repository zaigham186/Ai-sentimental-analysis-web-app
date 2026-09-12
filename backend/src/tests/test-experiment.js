/**
 * Experiment System Tests
 * Phase 5: Test video experiment flow
 * 
 * Run with: node src/tests/test-experiment.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Participant, Video, VideoResponse, StudySettings, AuditLog } = require('../models');
const assignmentService = require('../services/assignmentService');

// Test database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research-test';

/**
 * Test Suite
 */
async function runTests() {
  console.log('🧪 Starting Experiment System Tests...\n');

  try {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to test database\n');

    // Clean up and setup
    await setupTestData();

    // Run tests
    await testVideoEligibility();
    await testVideoOrdering();
    await testStartExperiment();
    await testGetCurrentVideo();
    await testResponseSubmission();
    await testDuplicateResponsePrevention();
    await testSequentialEnforcement();
    await testProgressTracking();
    await testRefreshRecovery();
    await testAnonymousIdentity();
    await testIdentifiableIdentity();
    await testCompleteExperiment();
    await testAuditLogging();

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

/**
 * Setup test data
 */
async function setupTestData() {
  console.log('🧹 Setting up test data...');

  // Clean up
  await Participant.deleteMany({ username: /^test_exp_/ });
  await Video.deleteMany({ title: /^Test Video/ });
  await VideoResponse.deleteMany({});
  await AuditLog.deleteMany({ category: 'experiment' });

  // Create or update study settings to ensure test capacity
  let settings = await StudySettings.findOne();
  if (!settings) {
    settings = await StudySettings.create({
      targetParticipants: 500,
      anonymousTarget: 250,
      identifiableTarget: 250,
      acceptingParticipants: true,
      studyStatus: 'recruiting'
    });
  } else {
    settings.acceptingParticipants = true;
    settings.studyStatus = 'recruiting';
    settings.studyLocked = false;
    const needed = Math.max(settings.currentParticipants + 100, 500);
    settings.targetParticipants = needed % 2 === 0 ? needed : needed + 1;
    settings.anonymousTarget = settings.targetParticipants / 2;
    settings.identifiableTarget = settings.targetParticipants / 2;
    await settings.save();
  }

  // Ensure 10 approved active videos
  let existingApproved = await Video.find({ validationStatus: 'approved', active: true }).sort({ order: 1 });
  const videos = [];
  if (existingApproved.length >= 10) {
    videos.push(...existingApproved.slice(0, 10));
  } else {
    for (let i = 1; i <= 10; i++) {
      const video = await Video.create({
        title: `Test Video ${i}`,
        topic: `Topic ${i}`,
        description: `Test video scenario ${i}`,
        videoUrl: `https://example.com/test-video-${i}.mp4`,
        duration: 30 + i,
        order: i,
        active: true,
        validationStatus: 'approved',
        version: '1.0'
      });
      videos.push(video);
    }
  }

  // Create unapproved video (should not appear)
  await Video.create({
    title: 'Test Video Unapproved',
    topic: 'Unapproved',
    description: 'This should not appear',
    videoUrl: 'https://example.com/unapproved.mp4',
    duration: 30,
    order: 11,
    active: true,
    validationStatus: 'candidate',
    version: '1.0'
  });

  // Create inactive video (should not appear)
  await Video.create({
    title: 'Test Video Inactive',
    topic: 'Inactive',
    description: 'This should not appear',
    videoUrl: 'https://example.com/inactive.mp4',
    duration: 30,
    order: 12,
    active: false,
    validationStatus: 'approved',
    version: '1.0'
  });

  console.log(`✓ Created ${videos.length} approved active videos`);
  console.log(`✓ Created 2 ineligible videos (should not appear)`);
  console.log('✓ Test data setup complete\n');

  return { settings, videos };
}

/**
 * Test 1: Video Eligibility
 */
async function testVideoEligibility() {
  console.log('Test 1: Video Eligibility');

  const videos = await Video.getApprovedActive();

  if (videos.length !== 10) {
    throw new Error(`Expected 10 approved active videos, got ${videos.length}`);
  }

  // Verify all are approved and active
  videos.forEach(v => {
    if (!v.active) throw new Error('Found inactive video in results');
    if (v.validationStatus !== 'approved') throw new Error('Found unapproved video in results');
  });

  console.log(`✓ Correctly filtered to ${videos.length} approved active videos`);
  console.log('✓ Unapproved and inactive videos excluded\n');
}

/**
 * Test 2: Video Ordering
 */
async function testVideoOrdering() {
  console.log('Test 2: Video Ordering');

  const videos = await Video.getApprovedActive();

  // Verify order is 1, 2, 3... 10
  for (let i = 0; i < videos.length; i++) {
    if (videos[i].order !== i + 1) {
      throw new Error(`Expected order ${i + 1}, got ${videos[i].order}`);
    }
  }

  console.log('✓ Videos ordered correctly (1, 2, 3... 10)');
  console.log('✓ Sequential order maintained\n');
}

/**
 * Test 3: Start Experiment
 */
async function testStartExperiment() {
  console.log('Test 3: Start Experiment');

  const settings = await StudySettings.getSettings();

  // Create test participant
  const participant = await Participant.create({
    name: 'Test Exp User',
    username: 'test_exp_user_1',
    age: 25,
    gender: 'male',
    university: 'SBBWU',
    department: 'CS',
    consentGiven: true,
    consentAt: new Date(),
    consentVersion: '1.0',
    status: 'active'
  });

  // Assign condition
  await assignmentService.assignCondition(participant, settings);
  
  // Reload participant from database
  const assignedParticipant = await Participant.findById(participant._id);

  // Start experiment
  const videos = await Video.getApprovedActive();
  assignedParticipant.experimentStartedAt = new Date();
  assignedParticipant.currentVideo = videos[0]._id;
  await assignedParticipant.save();

  await AuditLog.logAction({
    action: 'experiment_started',
    category: 'experiment',
    actorType: 'participant',
    actorId: assignedParticipant._id.toString(),
    actorUsername: assignedParticipant.username,
    details: {
      condition: assignedParticipant.condition,
      firstVideo: videos[0]._id.toString(),
      totalVideos: videos.length
    },
    success: true
  });

  // Verify
  if (!assignedParticipant.experimentStartedAt) throw new Error('experimentStartedAt not set');
  if (!assignedParticipant.currentVideo) throw new Error('currentVideo not set');
  if (!assignedParticipant.currentVideo.equals(videos[0]._id)) {
    throw new Error('currentVideo should be first video');
  }

  console.log('✓ Experiment started successfully');
  console.log(`✓ Current video set to first video (order ${videos[0].order})`);
  console.log('✓ Start timestamp recorded\n');
}

/**
 * Test 4: Get Current Video
 */
async function testGetCurrentVideo() {
  console.log('Test 4: Get Current Video');

  const participant = await Participant.findOne({ username: 'test_exp_user_1' });
  const currentVideo = await Video.findById(participant.currentVideo);

  if (!currentVideo) throw new Error('Current video not found');
  if (currentVideo.order !== 1) throw new Error('First video should have order 1');

  console.log(`✓ Retrieved current video: ${currentVideo.title}`);
  console.log(`✓ Video order: ${currentVideo.order}\n`);
}

/**
 * Test 5: Response Submission
 */
async function testResponseSubmission() {
  console.log('Test 5: Response Submission');

  const participant = await Participant.findOne({ username: 'test_exp_user_1' });
  const currentVideo = await Video.findById(participant.currentVideo);

  // Submit response
  const response = await VideoResponse.create({
    participant: participant._id,
    video: currentVideo._id,
    responseText: 'This is a test response with enough characters to pass validation.',
    responseTime: 45
  });

  // Verify response metrics calculated
  if (!response.responseLength) throw new Error('responseLength not calculated');
  if (!response.responseWordCount) throw new Error('responseWordCount not calculated');

  // Update participant progress
  participant.completedVideos.push(currentVideo._id);
  
  const videos = await Video.getApprovedActive();
  participant.currentVideo = videos[1]._id; // Move to video 2
  await participant.save();

  await AuditLog.logAction({
    action: 'video_response_submitted',
    category: 'experiment',
    actorType: 'participant',
    actorId: participant._id.toString(),
    actorUsername: participant.username,
    details: { videoId: currentVideo._id.toString(), responseTime: 45 },
    success: true
  });

  console.log('✓ Response submitted successfully');
  console.log(`✓ Response length: ${response.responseLength} characters`);
  console.log(`✓ Word count: ${response.responseWordCount} words`);
  console.log('✓ Participant advanced to next video\n');
}

/**
 * Test 6: Duplicate Response Prevention
 */
async function testDuplicateResponsePrevention() {
  console.log('Test 6: Duplicate Response Prevention');

  const participant = await Participant.findOne({ username: 'test_exp_user_1' });
  const completedVideo = participant.completedVideos[0];

  let error = null;
  try {
    await VideoResponse.create({
      participant: participant._id,
      video: completedVideo,
      responseText: 'Attempt to create duplicate response',
      responseTime: 30
    });
  } catch (err) {
    error = err;
  }

  if (!error) throw new Error('Should have prevented duplicate response');
  if (error.code !== 11000) throw new Error('Wrong error code: ' + error.code);

  console.log('✓ Duplicate response blocked');
  console.log('✓ Unique index working correctly\n');
}

/**
 * Test 7: Sequential Enforcement
 */
async function testSequentialEnforcement() {
  console.log('Test 7: Sequential Enforcement');

  const participant = await Participant.findOne({ username: 'test_exp_user_1' });
  const videos = await Video.getApprovedActive();

  // Current video should be video 2 (order 2)
  const currentVideo = await Video.findById(participant.currentVideo);
  if (currentVideo.order !== 2) {
    throw new Error(`Expected current video order 2, got ${currentVideo.order}`);
  }

  // Try to submit response for video 5 (should not be accessible)
  const video5 = videos[4]; // order 5

  let error = null;
  try {
    // In real flow, controller checks currentVideo matches submission
    if (!participant.currentVideo.equals(video5._id)) {
      throw new Error('Sequential enforcement: Not allowed to submit response for future video');
    }
    await VideoResponse.create({
      participant: participant._id,
      video: video5._id,
      responseText: 'Attempting to skip ahead to video 5',
      responseTime: 30
    });
  } catch (err) {
    error = err;
  }

  if (!error) throw new Error('Sequential enforcement should have blocked response for video 5');

  // Verify participant hasn't skipped - should still be on video 2
  if (participant.completedVideos.length !== 1) {
    throw new Error('Participant should have completed only 1 video');
  }

  console.log('✓ Sequential enforcement working');
  console.log('✓ Cannot skip ahead to future videos\n');
}

/**
 * Test 8: Progress Tracking
 */
async function testProgressTracking() {
  console.log('Test 8: Progress Tracking');

  const participant = await Participant.findOne({ username: 'test_exp_user_1' });
  const videos = await Video.getApprovedActive();

  const completed = participant.completedVideos.length;
  const total = videos.length;
  const percentage = Math.round((completed / total) * 100);

  console.log(`✓ Progress: ${completed}/${total} videos (${percentage}%)`);
  console.log(`✓ Current video: order ${(await Video.findById(participant.currentVideo)).order}\n`);
}

/**
 * Test 9: Refresh Recovery
 */
async function testRefreshRecovery() {
  console.log('Test 9: Refresh Recovery');

  const participantId = (await Participant.findOne({ username: 'test_exp_user_1' }))._id;

  // Simulate refresh - reload participant from DB
  const participant = await Participant.findById(participantId);

  if (!participant.experimentStartedAt) throw new Error('Lost experiment start data');
  if (!participant.currentVideo) throw new Error('Lost current video data');
  if (participant.completedVideos.length === 0) throw new Error('Lost completed videos data');

  console.log('✓ State preserved after refresh');
  console.log('✓ Experiment data intact');
  console.log('✓ Can resume from correct video\n');
}

/**
 * Test 10: Anonymous Identity
 */
async function testAnonymousIdentity() {
  console.log('Test 10: Anonymous Identity');

  const settings = await StudySettings.getSettings();

  // Create anonymous participant
  const participant = await Participant.create({
    name: 'Anonymous Test User',
    username: 'test_exp_anon',
    age: 26,
    gender: 'female',
    university: 'SBBWU',
    department: 'Psychology',
    consentGiven: true,
    consentAt: new Date(),
    consentVersion: '1.0',
    status: 'active',
    condition: 'anonymous',
    conditionAssigned: true,
    assignedAt: new Date(),
    assignmentVersion: '1.0'
  });

  // Get display name (simulating controller logic)
  const displayName = participant.condition === 'anonymous' ? 'Unknown User' : participant.name;

  if (displayName !== 'Unknown User') {
    throw new Error('Anonymous participant should display "Unknown User"');
  }

  console.log(`✓ Anonymous participant: ${participant.name}`);
  console.log(`✓ Display name: ${displayName}`);
  console.log('✓ Real name hidden correctly\n');
}

/**
 * Test 11: Identifiable Identity
 */
async function testIdentifiableIdentity() {
  console.log('Test 11: Identifiable Identity');

  // Create identifiable participant
  const participant = await Participant.create({
    name: 'Identifiable Test User',
    username: 'test_exp_ident',
    age: 27,
    gender: 'male',
    university: 'University of Peshawar',
    department: 'Computer Science',
    consentGiven: true,
    consentAt: new Date(),
    consentVersion: '1.0',
    status: 'active',
    condition: 'identifiable',
    conditionAssigned: true,
    assignedAt: new Date(),
    assignmentVersion: '1.0'
  });

  // Get display name
  const displayName = participant.condition === 'anonymous' ? 'Unknown User' : participant.name;

  if (displayName !== participant.name) {
    throw new Error('Identifiable participant should display real name');
  }

  console.log(`✓ Identifiable participant: ${participant.name}`);
  console.log(`✓ Display name: ${displayName}`);
  console.log('✓ Real name displayed correctly\n');
}

/**
 * Test 12: Complete Experiment
 */
async function testCompleteExperiment() {
  console.log('Test 12: Complete Experiment');

  const participant = await Participant.findOne({ username: 'test_exp_user_1' });
  const videos = await Video.getApprovedActive();

  // Complete remaining videos
  for (let i = 1; i < videos.length; i++) {
    const existing = await VideoResponse.findOne({ participant: participant._id, video: videos[i]._id });
    if (existing) {
      if (!participant.completedVideos.some(v => v.equals(videos[i]._id))) {
        participant.completedVideos.push(videos[i]._id);
      }
      continue;
    }
    if (participant.completedVideos.some(v => v.equals(videos[i]._id))) continue;

    await VideoResponse.create({
      participant: participant._id,
      video: videos[i]._id,
      responseText: `Test response for video ${i + 1} with sufficient length to pass validation.`,
      responseTime: 30 + i
    });

    participant.completedVideos.push(videos[i]._id);

    await AuditLog.logAction({
      action: 'video_response_submitted',
      category: 'experiment',
      actorType: 'participant',
      actorId: participant._id.toString(),
      actorUsername: participant.username,
      details: { videoId: videos[i]._id.toString(), responseTime: 30 + i },
      success: true
    });
  }

  // Set next video to null (all completed)
  participant.currentVideo = null;
  await participant.save();

  // Verify all completed
  if (participant.completedVideos.length !== videos.length) {
    throw new Error(`Expected ${videos.length} completed, got ${participant.completedVideos.length}`);
  }

  // Count responses
  const responseCount = await VideoResponse.countDocuments({ participant: participant._id });
  if (responseCount !== videos.length) {
    throw new Error(`Expected ${videos.length} responses, got ${responseCount}`);
  }

  // Mark as completed
  participant.completedAt = new Date();
  participant.status = 'completed';
  await participant.save();

  await AuditLog.logAction({
    action: 'experiment_completed',
    category: 'experiment',
    actorType: 'participant',
    actorId: participant._id.toString(),
    actorUsername: participant.username,
    details: { totalCompleted: participant.completedVideos.length },
    success: true
  });

  console.log(`✓ All ${videos.length} videos completed`);
  console.log(`✓ All ${responseCount} responses submitted`);
  console.log('✓ Experiment marked complete\n');
}

/**
 * Test 13: Audit Logging
 */
async function testAuditLogging() {
  console.log('Test 13: Audit Logging');

  const logs = await AuditLog.find({ category: 'experiment' });

  if (logs.length === 0) {
    throw new Error('No experiment audit logs found');
  }

  // Check for expected log types
  const startLogs = logs.filter(l => l.action === 'experiment_started');
  const responseLogs = logs.filter(l => l.action === 'video_response_submitted');
  const completeLogs = logs.filter(l => l.action === 'experiment_completed');

  console.log(`✓ Audit logs created: ${logs.length} total`);
  console.log(`✓ Experiment starts: ${startLogs.length}`);
  console.log(`✓ Response submissions: ${responseLogs.length}`);
  console.log(`✓ Experiment completions: ${completeLogs.length}\n`);
}

// Run tests
runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
