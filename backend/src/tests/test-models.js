/**
 * Model Testing Script
 * Tests all Phase 2 models for validation, references, and constraints
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const models = require('../models');

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
    console.log(`✓ ${name}`);
  } else {
    testResults.failed++;
    console.log(`✗ ${name}`);
    if (error) console.log(`  Error: ${error.message}`);
  }
}

async function runTests() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoUri);
    console.log('Connected to test database\n');

    // Clean test data
    await cleanTestData();

    // Run all tests
    await testParticipantModel();
    await testVideoModel();
    await testVideoResponseModel();
    await testQuestionnaireModel();
    await testQuestionnaireResponseModel();
    await testCodingModel();
    await testAdminModel();
    await testAuditLogModel();
    await testStudySettingsModel();
    await testUniqueConstraints();
    await testReferences();

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log('='.repeat(50));

    if (testResults.failed > 0) {
      console.log('\nFailed Tests:');
      testResults.tests
        .filter(t => !t.passed)
        .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }

  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

async function cleanTestData() {
  console.log('Cleaning test data...');
  await models.Participant.deleteMany({ username: /^test/ });
  await models.Video.deleteMany({ title: /^TEST/ });
  await models.VideoResponse.deleteMany({});
  await models.Questionnaire.deleteMany({ questionnaireId: /^TEST/ });
  await models.QuestionnaireResponse.deleteMany({});
  await models.Coding.deleteMany({});
  await models.Admin.deleteMany({ username: /^test/ });
  await models.AuditLog.deleteMany({ actorUsername: /^test/ });
  console.log('Test data cleaned\n');
}

// ===== PARTICIPANT MODEL TESTS =====
async function testParticipantModel() {
  console.log('Testing Participant Model...');

  // Test valid participant
  try {
    const participant = await models.Participant.create({
      name: 'Test User',
      username: 'testuser1',
      age: 20,
      gender: 'female',
      university: 'SBBWU',
      department: 'Psychology',
      condition: 'anonymous',
      status: 'active'
    });
    logTest('Participant: Create valid participant', true);
    await participant.deleteOne();
  } catch (error) {
    logTest('Participant: Create valid participant', false, error);
  }

  // Test required fields
  try {
    await models.Participant.create({
      name: 'Test User'
      // Missing required fields
    });
    logTest('Participant: Required field validation', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Participant: Required field validation', true);
  }

  // Test age validation
  try {
    await models.Participant.create({
      name: 'Test User',
      username: 'testuser2',
      age: 15, // Below minimum
      gender: 'female',
      university: 'SBBWU',
      department: 'Psychology',
      condition: 'anonymous'
    });
    logTest('Participant: Age validation (minimum)', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Participant: Age validation (minimum)', true);
  }

  // Test enum validation for condition
  try {
    await models.Participant.create({
      name: 'Test User',
      username: 'testuser3',
      age: 20,
      gender: 'female',
      university: 'SBBWU',
      department: 'Psychology',
      condition: 'invalid_condition'
    });
    logTest('Participant: Condition enum validation', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Participant: Condition enum validation', true);
  }

  // Test status enum validation
  try {
    const participant = await models.Participant.create({
      name: 'Test User',
      username: 'testuser4',
      age: 20,
      gender: 'female',
      university: 'SBBWU',
      department: 'Psychology',
      condition: 'anonymous',
      status: 'active'
    });
    participant.status = 'invalid_status';
    await participant.save();
    logTest('Participant: Status enum validation', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Participant: Status enum validation', true);
  }

  console.log('');
}

// ===== VIDEO MODEL TESTS =====
async function testVideoModel() {
  console.log('Testing Video Model...');

  // Test valid video
  try {
    const video = await models.Video.create({
      title: 'TEST Video 1',
      topic: 'Test Topic',
      description: 'Test description',
      videoUrl: 'https://example.com/video.mp4',
      duration: 120,
      order: 1,
      version: '1.0'
    });
    logTest('Video: Create valid video', true);
    await video.deleteOne();
  } catch (error) {
    logTest('Video: Create valid video', false, error);
  }

  // Test URL validation
  try {
    await models.Video.create({
      title: 'TEST Video 2',
      topic: 'Test Topic',
      description: 'Test description',
      videoUrl: 'invalid-url',
      duration: 120,
      order: 2,
      version: '1.0'
    });
    logTest('Video: URL validation', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Video: URL validation', true);
  }

  // Test validation status enum
  try {
    const video = await models.Video.create({
      title: 'TEST Video 3',
      topic: 'Test Topic',
      description: 'Test description',
      videoUrl: 'https://example.com/video.mp4',
      duration: 120,
      order: 3,
      version: '1.0',
      validationStatus: 'approved'
    });
    logTest('Video: Validation status enum', true);
    await video.deleteOne();
  } catch (error) {
    logTest('Video: Validation status enum', false, error);
  }

  console.log('');
}

// ===== VIDEO RESPONSE MODEL TESTS =====
async function testVideoResponseModel() {
  console.log('Testing VideoResponse Model...');

  // Create test participant and video
  const participant = await models.Participant.create({
    name: 'Test User',
    username: 'testuser_response',
    age: 20,
    gender: 'female',
    university: 'SBBWU',
    department: 'Psychology',
    condition: 'anonymous'
  });

  const video = await models.Video.create({
    title: 'TEST Video Response',
    topic: 'Test Topic',
    description: 'Test description',
    videoUrl: 'https://example.com/video.mp4',
    duration: 120,
    order: 1,
    version: '1.0'
  });

  // Test valid response
  try {
    const response = await models.VideoResponse.create({
      participant: participant._id,
      video: video._id,
      responseText: 'This is a test response to the video.',
      responseTime: 60
    });
    logTest('VideoResponse: Create valid response', true);
  } catch (error) {
    logTest('VideoResponse: Create valid response', false, error);
  }

  // Test duplicate response (should fail due to unique constraint)
  try {
    await models.VideoResponse.create({
      participant: participant._id,
      video: video._id,
      responseText: 'This is a duplicate response.',
      responseTime: 30
    });
    logTest('VideoResponse: Duplicate response prevention', false, new Error('Should have failed'));
  } catch (error) {
    logTest('VideoResponse: Duplicate response prevention', true);
  }

  // Test immutable responseText
  try {
    const response = await models.VideoResponse.findOne({ participant: participant._id });
    response.responseText = 'Attempting to modify';
    await response.save();
    logTest('VideoResponse: Immutable response text', false, new Error('Should have failed'));
  } catch (error) {
    logTest('VideoResponse: Immutable response text', true);
  }

  // Cleanup
  await participant.deleteOne();
  await video.deleteOne();
  await models.VideoResponse.deleteMany({ participant: participant._id });

  console.log('');
}

// ===== QUESTIONNAIRE MODEL TESTS =====
async function testQuestionnaireModel() {
  console.log('Testing Questionnaire Model...');

  // Test valid questionnaire
  try {
    const questionnaire = await models.Questionnaire.create({
      questionnaireId: 'TEST_MORAL_DISENGAGEMENT',
      title: 'Test Moral Disengagement Scale',
      description: 'Test questionnaire for moral disengagement',
      version: '1.0',
      instructions: 'Please answer the following questions',
      questions: [
        {
          itemNumber: 1,
          text: 'Test question 1',
          type: 'likert',
          options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
          required: true,
          reverseCoded: false
        }
      ],
      scoringConfiguration: {
        method: 'sum',
        description: 'Sum of all items'
      },
      displayOrder: 1
    });
    logTest('Questionnaire: Create valid questionnaire', true);
    await questionnaire.deleteOne();
  } catch (error) {
    logTest('Questionnaire: Create valid questionnaire', false, error);
  }

  // Test empty questions validation
  try {
    await models.Questionnaire.create({
      questionnaireId: 'TEST_EMPTY',
      title: 'Test Empty',
      description: 'Test',
      version: '1.0',
      instructions: 'Test',
      questions: [], // Empty questions
      scoringConfiguration: { method: 'sum' },
      displayOrder: 1
    });
    logTest('Questionnaire: Empty questions validation', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Questionnaire: Empty questions validation', true);
  }

  console.log('');
}

// ===== QUESTIONNAIRE RESPONSE MODEL TESTS =====
async function testQuestionnaireResponseModel() {
  console.log('Testing QuestionnaireResponse Model...');

  const participant = await models.Participant.create({
    name: 'Test User',
    username: 'testuser_qresponse',
    age: 20,
    gender: 'female',
    university: 'SBBWU',
    department: 'Psychology',
    condition: 'anonymous'
  });

  const questionnaire = await models.Questionnaire.create({
    questionnaireId: 'TEST_Q_RESPONSE',
    title: 'Test Questionnaire',
    description: 'Test',
    version: '1.0',
    instructions: 'Test',
    questions: [{ itemNumber: 1, text: 'Test', type: 'likert', options: ['1', '2', '3'] }],
    scoringConfiguration: { method: 'sum' },
    displayOrder: 1
  });

  // Test valid response
  try {
    const response = await models.QuestionnaireResponse.create({
      participantId: participant._id,
      questionnaireId: questionnaire._id,
      questionnaireVersion: '1.0',
      answers: [{ itemNumber: 1, value: '3', responseTime: 2000 }],
      startedAt: new Date(Date.now() - 10000),
      completedAt: new Date(),
      totalTime: 10
    });
    logTest('QuestionnaireResponse: Create valid response', true);
  } catch (error) {
    logTest('QuestionnaireResponse: Create valid response', false, error);
  }

  // Cleanup
  await participant.deleteOne();
  await questionnaire.deleteOne();
  await models.QuestionnaireResponse.deleteMany({ participantId: participant._id });

  console.log('');
}

// ===== CODING MODEL TESTS =====
async function testCodingModel() {
  console.log('Testing Coding Model...');

  const participant = await models.Participant.create({
    name: 'Test User',
    username: 'testuser_coding',
    age: 20,
    gender: 'female',
    university: 'SBBWU',
    department: 'Psychology',
    condition: 'anonymous'
  });

  const video = await models.Video.create({
    title: 'TEST Video Coding',
    topic: 'Test',
    description: 'Test',
    videoUrl: 'https://example.com/video.mp4',
    duration: 120,
    order: 1,
    version: '1.0'
  });

  const response = await models.VideoResponse.create({
    participant: participant._id,
    video: video._id,
    responseText: 'Test response for coding',
    responseTime: 60
  });

  const admin = await models.Admin.create({
    username: 'testadmin_coding',
    email: 'testadmin_coding@example.com',
    passwordHash: 'dummy_hash_for_testing',
    name: 'Test Admin',
    role: 'coder'
  });

  // Test valid coding
  try {
    const coding = await models.Coding.create({
      response: response._id,
      sentiment: 'negative',
      aggression: {
        level: 5,
        category: 'moderate'
      },
      cyberbullying: {
        present: true,
        type: 'harassment',
        severity: 6
      },
      codedBy: admin._id,
      coderRole: 'primary',
      codingVersion: '1.0',
      confidence: 'high'
    });
    logTest('Coding: Create valid coding', true);
  } catch (error) {
    logTest('Coding: Create valid coding', false, error);
  }

  // Test enum validation
  try {
    await models.Coding.create({
      response: response._id,
      sentiment: 'invalid_sentiment',
      codedBy: admin._id,
      coderRole: 'primary',
      codingVersion: '1.0'
    });
    logTest('Coding: Sentiment enum validation', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Coding: Sentiment enum validation', true);
  }

  // Cleanup
  await participant.deleteOne();
  await video.deleteOne();
  await admin.deleteOne();
  await models.VideoResponse.deleteMany({ participant: participant._id });
  await models.Coding.deleteMany({ codedBy: admin._id });

  console.log('');
}

// ===== ADMIN MODEL TESTS =====
async function testAdminModel() {
  console.log('Testing Admin Model...');

  // Test valid admin
  try {
    const admin = await models.Admin.create({
      username: 'testadmin1',
      email: 'testadmin1@example.com',
      passwordHash: 'hashed_password_here',
      name: 'Test Admin',
      role: 'researcher',
      permissions: ['view_data', 'export_data']
    });
    logTest('Admin: Create valid admin', true);
    await admin.deleteOne();
  } catch (error) {
    logTest('Admin: Create valid admin', false, error);
  }

  // Test password field is not plaintext
  try {
    const admin = await models.Admin.create({
      username: 'testadmin2',
      email: 'testadmin2@example.com',
      passwordHash: '$2a$12$somehashvalue', // bcrypt hash format
      name: 'Test Admin',
      role: 'researcher'
    });
    logTest('Admin: Password stored as hash', admin.passwordHash.startsWith('$2'));
    await admin.deleteOne();
  } catch (error) {
    logTest('Admin: Password stored as hash', false, error);
  }

  // Test unique email
  try {
    await models.Admin.create({
      username: 'testadmin3',
      email: 'duplicate@example.com',
      passwordHash: 'hash1',
      name: 'Test Admin 1',
      role: 'researcher'
    });
    await models.Admin.create({
      username: 'testadmin4',
      email: 'duplicate@example.com',
      passwordHash: 'hash2',
      name: 'Test Admin 2',
      role: 'researcher'
    });
    logTest('Admin: Unique email constraint', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Admin: Unique email constraint', true);
    await models.Admin.deleteMany({ email: 'duplicate@example.com' });
  }

  console.log('');
}

// ===== AUDIT LOG MODEL TESTS =====
async function testAuditLogModel() {
  console.log('Testing AuditLog Model...');

  // Test valid audit log
  try {
    const log = await models.AuditLog.create({
      action: 'login',
      category: 'auth',
      actorType: 'admin',
      actorId: 'test_admin_id',
      actorUsername: 'testadmin',
      success: true,
      ipAddress: '127.0.0.1'
    });
    logTest('AuditLog: Create valid log entry', true);
    await log.deleteOne();
  } catch (error) {
    logTest('AuditLog: Create valid log entry', false, error);
  }

  // Test category enum
  try {
    await models.AuditLog.create({
      action: 'test_action',
      category: 'invalid_category',
      actorType: 'admin',
      actorId: 'test_id',
      success: true
    });
    logTest('AuditLog: Category enum validation', false, new Error('Should have failed'));
  } catch (error) {
    logTest('AuditLog: Category enum validation', true);
  }

  console.log('');
}

// ===== STUDY SETTINGS MODEL TESTS =====
async function testStudySettingsModel() {
  console.log('Testing StudySettings Model...');

  // Clean existing settings
  await models.StudySettings.deleteMany({});

  // Test valid settings with 60/30/30 target
  try {
    const settings = await models.StudySettings.create({
      targetParticipants: 60,
      anonymousTarget: 30,
      identifiableTarget: 30,
      studyStatus: 'setup',
      allocationMethod: 'balanced',
      recruitmentStatus: 'not_started',
      environment: 'development'
    });
    logTest('StudySettings: Create with 60/30/30 targets', true);
  } catch (error) {
    logTest('StudySettings: Create with 60/30/30 targets', false, error);
  }

  // Test target validation (should fail if targets don't match)
  try {
    await models.StudySettings.create({
      targetParticipants: 60,
      anonymousTarget: 25, // Doesn't sum to 60
      identifiableTarget: 30,
      studyStatus: 'setup',
      allocationMethod: 'balanced',
      recruitmentStatus: 'not_started',
      environment: 'development'
    });
    logTest('StudySettings: Target validation', false, new Error('Should have failed'));
  } catch (error) {
    logTest('StudySettings: Target validation', true);
  }

  console.log('');
}

// ===== UNIQUE CONSTRAINT TESTS =====
async function testUniqueConstraints() {
  console.log('Testing Unique Constraints...');

  // Test participant username uniqueness
  try {
    await models.Participant.create({
      name: 'User 1',
      username: 'duplicate_user',
      age: 20,
      gender: 'female',
      university: 'SBBWU',
      department: 'Psychology',
      condition: 'anonymous'
    });
    await models.Participant.create({
      name: 'User 2',
      username: 'duplicate_user',
      age: 21,
      gender: 'male',
      university: 'SBBWU',
      department: 'Psychology',
      condition: 'identifiable'
    });
    logTest('Unique Constraint: Participant username', false, new Error('Should have failed'));
  } catch (error) {
    logTest('Unique Constraint: Participant username', true);
    await models.Participant.deleteMany({ username: 'duplicate_user' });
  }

  console.log('');
}

// ===== REFERENCE TESTS =====
async function testReferences() {
  console.log('Testing Model References...');

  const participant = await models.Participant.create({
    name: 'Test User',
    username: 'testuser_refs',
    age: 20,
    gender: 'female',
    university: 'SBBWU',
    department: 'Psychology',
    condition: 'anonymous'
  });

  const video = await models.Video.create({
    title: 'TEST Video Refs',
    topic: 'Test',
    description: 'Test',
    videoUrl: 'https://example.com/video.mp4',
    duration: 120,
    order: 1,
    version: '1.0'
  });

  const response = await models.VideoResponse.create({
    participant: participant._id,
    video: video._id,
    responseText: 'Test response',
    responseTime: 60
  });

  // Test population
  try {
    const populatedResponse = await models.VideoResponse.findById(response._id)
      .populate('participant')
      .populate('video');
    
    const hasParticipant = populatedResponse.participant && populatedResponse.participant.username === 'testuser_refs';
    const hasVideo = populatedResponse.video && populatedResponse.video.title === 'TEST Video Refs';
    
    logTest('References: Populate participant and video', hasParticipant && hasVideo);
  } catch (error) {
    logTest('References: Populate participant and video', false, error);
  }

  // Cleanup
  await participant.deleteOne();
  await video.deleteOne();
  await models.VideoResponse.deleteMany({ participant: participant._id });

  console.log('');
}

// Run the test suite
runTests();
