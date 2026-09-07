/**
 * Assignment Service Tests
 * Phase 4: Test computerized random allocation
 * 
 * Run with: node src/tests/test-assignment.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Participant, StudySettings, AuditLog } = require('../models');
const assignmentService = require('../services/assignmentService');

// Test database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research-test';

/**
 * Test Suite
 */
async function runTests() {
  console.log('🧪 Starting Assignment Service Tests...\n');

  try {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to test database\n');

    // Clean up test data
    await cleanupTestData();

    // Run tests
    await testAssignmentService();
    await testBalancedAllocation();
    await testTargetLimits();
    await testAssignmentPersistence();
    await testReassignmentPrevention();
    await testCapacityHandling();
    await testAssignmentStats();
    await testIntegrityValidation();
    await testAuditLogging();

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  // Delete all test participants
  await Participant.deleteMany({ username: /^test_/ });
  
  // Reset or delete study settings
  await StudySettings.deleteMany({});
  
  // Clear audit logs
  await AuditLog.deleteMany({ category: 'assignment' });
  
  console.log('✓ Test data cleaned up\n');
}

/**
 * Test 1: Basic Assignment Service
 */
async function testAssignmentService() {
  console.log('Test 1: Basic Assignment Service');

  // Create study settings
  const settings = await StudySettings.create({
    targetParticipants: 60,
    anonymousTarget: 30,
    identifiableTarget: 30,
    acceptingParticipants: true,
    studyStatus: 'recruiting'
  });

  // Create participant
  const participant = await Participant.create({
    name: 'Test User 1',
    username: 'test_user_1',
    age: 25,
    gender: 'male',
    university: 'SBBWU',
    department: 'Computer Science',
    consentGiven: true,
    consentAt: new Date(),
    consentVersion: '1.0',
    status: 'active'
  });

  // Assign condition
  const result = await assignmentService.assignCondition(participant, settings);

  // Verify
  if (!result.success) throw new Error('Assignment failed');
  if (!result.condition) throw new Error('No condition assigned');
  if (!['anonymous', 'identifiable'].includes(result.condition)) {
    throw new Error('Invalid condition');
  }

  // Reload participant from database to get updated fields
  const updatedParticipant = await Participant.findById(participant._id);
  if (!updatedParticipant.conditionAssigned) throw new Error('conditionAssigned flag not set');
  if (!updatedParticipant.assignedAt) throw new Error('assignedAt not set');
  if (!updatedParticipant.assignmentVersion) throw new Error('assignmentVersion not set');

  console.log(`✓ Participant assigned to ${result.condition} condition`);
  console.log(`✓ Assignment tracking fields set correctly\n`);
}

/**
 * Test 2: Balanced Allocation (60 participants)
 */
async function testBalancedAllocation() {
  console.log('Test 2: Balanced Allocation (60 participants)');

  const settings = await StudySettings.getSettings();

  // Create and assign 60 participants
  for (let i = 2; i <= 61; i++) {
    const participant = await Participant.create({
      name: `Test User ${i}`,
      username: `test_user_${i}`,
      age: 20 + (i % 10),
      gender: i % 2 === 0 ? 'male' : 'female',
      university: i % 2 === 0 ? 'SBBWU' : 'University of Peshawar',
      department: 'Computer Science',
      consentGiven: true,
      consentAt: new Date(),
      consentVersion: '1.0',
      status: 'active'
    });

    await assignmentService.assignCondition(participant, settings);
  }

  // Reload settings from database
  const updatedSettings = await StudySettings.findById(settings._id);

  // Verify counts
  if (updatedSettings.anonymousCount !== 30) {
    throw new Error(`Expected 30 anonymous, got ${updatedSettings.anonymousCount}`);
  }
  if (updatedSettings.identifiableCount !== 30) {
    throw new Error(`Expected 30 identifiable, got ${updatedSettings.identifiableCount}`);
  }
  if (updatedSettings.currentParticipants !== 60) {
    throw new Error(`Expected 60 participants, got ${updatedSettings.currentParticipants}`);
  }

  console.log(`✓ Balanced allocation: 30 anonymous, 30 identifiable`);
  console.log(`✓ Total: 60 participants\n`);
}

/**
 * Test 3: Target Limits
 */
async function testTargetLimits() {
  console.log('Test 3: Target Limits');

  const settings = await StudySettings.getSettings();

  // Try to create 61st participant
  const participant = await Participant.create({
    name: 'Test User 62',
    username: 'test_user_62',
    age: 25,
    gender: 'male',
    university: 'SBBWU',
    department: 'Computer Science',
    consentGiven: true,
    consentAt: new Date(),
    consentVersion: '1.0',
    status: 'active'
  });

  let error = null;
  try {
    await assignmentService.assignCondition(participant, settings);
  } catch (err) {
    error = err;
  }

  if (!error) throw new Error('Should have thrown error for exceeded capacity');
  if (!error.message.includes('target')) {
    throw new Error('Wrong error message: ' + error.message);
  }

  console.log(`✓ Correctly rejected assignment beyond capacity`);
  console.log(`✓ Error message: ${error.message}\n`);

  // Clean up
  await Participant.findByIdAndDelete(participant._id);
}

/**
 * Test 4: Assignment Persistence
 */
async function testAssignmentPersistence() {
  console.log('Test 4: Assignment Persistence');

  // Get first participant
  const participant = await Participant.findOne({ username: 'test_user_1' });
  const originalCondition = participant.condition;
  const originalAssignedAt = participant.assignedAt;

  // Simulate page refresh - reload participant
  const reloadedParticipant = await Participant.findById(participant._id);

  if (reloadedParticipant.condition !== originalCondition) {
    throw new Error('Condition changed after reload');
  }
  if (reloadedParticipant.assignedAt.getTime() !== originalAssignedAt.getTime()) {
    throw new Error('Assignment time changed after reload');
  }

  console.log(`✓ Condition persisted: ${originalCondition}`);
  console.log(`✓ Assignment time persisted: ${originalAssignedAt.toISOString()}\n`);
}

/**
 * Test 5: Reassignment Prevention
 */
async function testReassignmentPrevention() {
  console.log('Test 5: Reassignment Prevention');

  const settings = await StudySettings.getSettings();
  const participant = await Participant.findOne({ username: 'test_user_1' });
  const originalCondition = participant.condition;

  let error = null;
  try {
    await assignmentService.assignCondition(participant, settings);
  } catch (err) {
    error = err;
  }

  if (!error) throw new Error('Should have prevented reassignment');
  if (!error.message.includes('already assigned')) {
    throw new Error('Wrong error message: ' + error.message);
  }

  // Verify condition unchanged
  const reloadedParticipant = await Participant.findById(participant._id);
  if (reloadedParticipant.condition !== originalCondition) {
    throw new Error('Condition was changed despite error');
  }

  console.log(`✓ Reassignment blocked`);
  console.log(`✓ Condition preserved: ${originalCondition}\n`);
}

/**
 * Test 6: Capacity Handling
 */
async function testCapacityHandling() {
  console.log('Test 6: Capacity Handling');

  const settings = await StudySettings.getSettings();

  // Test canAcceptParticipant
  const canAccept = settings.canAcceptParticipant();
  if (canAccept) throw new Error('Should not accept participants when at capacity');

  // Test with specific conditions
  const canAcceptAnonymous = settings.canAcceptParticipant('anonymous');
  const canAcceptIdentifiable = settings.canAcceptParticipant('identifiable');

  if (canAcceptAnonymous) throw new Error('Should not accept anonymous when at capacity');
  if (canAcceptIdentifiable) throw new Error('Should not accept identifiable when at capacity');

  console.log(`✓ Correctly reports full capacity`);
  console.log(`✓ Both conditions at target\n`);
}

/**
 * Test 7: Assignment Statistics
 */
async function testAssignmentStats() {
  console.log('Test 7: Assignment Statistics');

  const stats = await assignmentService.getAssignmentStats();

  if (stats.targetParticipants !== 60) {
    throw new Error('Wrong target participants');
  }
  if (stats.currentParticipants !== 60) {
    throw new Error('Wrong current participants');
  }
  if (stats.anonymous.current !== 30) {
    throw new Error('Wrong anonymous count');
  }
  if (stats.identifiable.current !== 30) {
    throw new Error('Wrong identifiable count');
  }
  if (stats.anonymous.remaining !== 0) {
    throw new Error('Wrong anonymous remaining');
  }
  if (stats.identifiable.remaining !== 0) {
    throw new Error('Wrong identifiable remaining');
  }

  console.log(`✓ Statistics accurate`);
  console.log(`✓ Anonymous: ${stats.anonymous.current}/${stats.anonymous.target} (${stats.anonymous.percentage}%)`);
  console.log(`✓ Identifiable: ${stats.identifiable.current}/${stats.identifiable.target} (${stats.identifiable.percentage}%)\n`);
}

/**
 * Test 8: Integrity Validation
 */
async function testIntegrityValidation() {
  console.log('Test 8: Integrity Validation');

  const validation = await assignmentService.validateAssignmentIntegrity();

  if (!validation.valid) {
    console.error('Validation failed:', validation);
    throw new Error('Assignment integrity check failed');
  }
  if (validation.unassignedParticipants > 0) {
    throw new Error(`Found ${validation.unassignedParticipants} unassigned participants`);
  }
  if (validation.discrepancies.length > 0) {
    throw new Error('Found discrepancies: ' + JSON.stringify(validation.discrepancies));
  }

  console.log(`✓ Assignment integrity validated`);
  console.log(`✓ No discrepancies found`);
  console.log(`✓ Counts: Anonymous=${validation.counts.anonymous}, Identifiable=${validation.counts.identifiable}\n`);
}

/**
 * Test 9: Audit Logging
 */
async function testAuditLogging() {
  console.log('Test 9: Audit Logging');

  const logs = await AuditLog.find({ category: 'assignment' }).sort({ createdAt: 1 });

  if (logs.length === 0) {
    throw new Error('No audit logs found');
  }

  // Check successful assignments
  const successLogs = logs.filter(log => log.success && log.action === 'condition_assigned');
  if (successLogs.length !== 60) {
    throw new Error(`Expected 60 successful assignments, found ${successLogs.length}`);
  }

  // Check failed assignments
  const failureLogs = logs.filter(log => !log.success);
  if (failureLogs.length < 1) {
    throw new Error('Expected at least 1 failed assignment log');
  }

  // Verify log details
  const firstLog = successLogs[0];
  if (!firstLog.details.condition) throw new Error('Log missing condition');
  if (!firstLog.details.assignmentVersion) throw new Error('Log missing assignment version');

  console.log(`✓ Audit logs created: ${logs.length} total`);
  console.log(`✓ Successful assignments: ${successLogs.length}`);
  console.log(`✓ Failed attempts: ${failureLogs.length}\n`);
}

// Run tests
runTests();
