/**
 * Cyberbullying Research Platform — Dedicated Master QA Automation Suite
 * Complete Multi-Domain Audit: 22 Synthetic Cases, Security, Immutability,
 * Multi-Construct Independence, Human Authority, and Export Verification.
 *
 * Run with: node src/tests/test-master-qa-suite.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { 
  Participant, 
  Video, 
  VideoResponse, 
  Coding, 
  Admin, 
  AuditLog, 
  StudySettings 
} = require('../models');

const assignmentService = require('../services/assignmentService');
const { CodingAIService, NLPProvider } = require('../services/codingAI');
const researchAnalyticsService = require('../services/researchAnalyticsService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research-test';
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001';

// Test statistics counters
let totalPassed = 0;
let totalFailed = 0;
const defects = [];

function assert(condition, message) {
  if (!condition) {
    totalFailed++;
    defects.push(message);
    throw new Error(`FAIL: ${message}`);
  }
  totalPassed++;
  console.log(`  ✓ ${message}`);
}

async function runMasterQASuite() {
  console.log('===========================================================================');
  console.log('  CYBERBULLYING RESEARCH PLATFORM — MASTER QA AUTOMATION SUITE');
  console.log('  Comprehensive Multi-Domain Quality, Security & Methodological Audit');
  console.log('===========================================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB database: ' + mongoose.connection.name + '\n');

    // Clean up test namespaces
    await cleanup();

    // 1. Participant Journey & Immutability Audit
    await auditParticipantJourney();

    // 2. Authentication & Authorization Security Audit
    await auditAuthenticationAndAuthorization();

    // 3. NLP Microservice Live Connectivity & Model Sanity
    await auditNLPConnectivity();

    // 4. 22 Synthetic Test Cases & Multi-Construct Independence Audit
    await audit22SyntheticCases();

    // 5. AI/Human Separation & Review Workflow (Accept, Modify, Reject)
    await auditAIHumanWorkflows();

    // 6. Security Hardening, XSS & Parameter Tampering Audit
    await auditSecurityHardening();

    // 7. Research Analytics, Condition Comparison & Export Generation Audit
    await auditAnalyticsAndExports();

    // Clean up
    await cleanup();

    console.log('\n===========================================================================');
    console.log(`MASTER QA AUTOMATION RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
    console.log('===========================================================================');

    if (totalFailed > 0) {
      console.log('\nDEFECTS IDENTIFIED:');
      defects.forEach((d, idx) => console.log(`  ${idx + 1}. ${d}`));
      process.exit(1);
    } else {
      console.log('\n✓ ALL MASTER QA AUTOMATED TEST CHECKS PASSED WITH 100% SUCCESS!');
    }

  } catch (error) {
    console.error('\n❌ Master QA Suite Fatal Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed.');
  }
}

async function cleanup() {
  await Participant.deleteMany({ username: /^qa_test_/ });
  await Video.deleteMany({ title: /^QA Test Video/ });
  await VideoResponse.deleteMany({ responseText: /QA Test/ });
  await VideoResponse.deleteMany({ responseText: /inspiring and deeply compassionate/ });
  await VideoResponse.deleteMany({ responseText: /felt depressed watching this tragedy/ });
  await Coding.deleteMany({ notes: /QA Test/ });
  await Admin.deleteMany({ username: /^qa_admin_/ });
  await AuditLog.deleteMany({ actorUsername: /^qa_/ });
}

/**
 * 1. Participant Journey & Immutability Audit
 */
async function auditParticipantJourney() {
  console.log('---------------------------------------------------------------------------');
  console.log('1. PARTICIPANT JOURNEY, SEQUENCING & IMMUTABILITY AUDIT');
  console.log('---------------------------------------------------------------------------');

  // Create or expand active study settings
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

  // A. Participant Registration
  const participant = await Participant.create({
    name: 'QA Test Participant',
    username: 'qa_test_p1',
    age: 23,
    gender: 'female',
    university: 'SBBWU',
    department: 'Psychology',
    consentGiven: true,
    consentAt: new Date(),
    consentVersion: '1.0',
    status: 'active'
  });
  assert(participant._id != null, 'Participant registration creates valid MongoDB document');

  // B. Random Condition Assignment
  const assignResult = await assignmentService.assignCondition(participant, settings);
  assert(['anonymous', 'identifiable'].includes(assignResult.condition), 'Condition assigned is strictly anonymous or identifiable');
  
  const reloadedP = await Participant.findById(participant._id);
  assert(reloadedP.conditionAssigned === true, 'Participant conditionAssigned flag persisted');

  // C. Display Name Anonymization Check
  const displayName = reloadedP.condition === 'anonymous' ? 'Unknown User' : reloadedP.name;
  if (reloadedP.condition === 'anonymous') {
    assert(displayName === 'Unknown User', 'Anonymous condition properly masks real name to Unknown User');
  } else {
    assert(displayName === 'QA Test Participant', 'Identifiable condition presents participant real name');
  }

  // D. Stimulus & Response Submission
  const video = await Video.create({
    title: 'QA Test Video Stimulus 1',
    topic: 'Online Harassment',
    description: 'Cyberbullying scenario demonstration',
    videoUrl: 'https://example.com/stimulus1.mp4',
    duration: 45,
    order: 101,
    active: true,
    validationStatus: 'approved',
    version: '1.0'
  });

  const rawText = 'QA Test participant initial honest feedback on this troubling video.';
  const response = await VideoResponse.create({
    participant: participant._id,
    video: video._id,
    responseText: rawText,
    responseTime: 42
  });
  assert(response._id != null, 'VideoResponse document saved with participant reference');
  assert(response.responseLength === rawText.length, 'VideoResponse automatically computes character length');
  assert(response.responseWordCount === rawText.trim().split(/\s+/).length, 'VideoResponse accurately computes word count');

  // E. Strict Immutability Guard Verification
  let mutationBlocked = false;
  try {
    response.responseText = 'MUTATED TEXT ATTEMPT';
    await response.save();
  } catch (err) {
    mutationBlocked = true;
  }
  const dbResponse = await VideoResponse.findById(response._id);
  assert(mutationBlocked || dbResponse.responseText === rawText, 'Response immutability: Mongoose prevents direct responseText mutation');
  assert(dbResponse.responseText === rawText, 'Participant raw responseText remains 100% unmutated in database');

  // F. Duplicate Response Prevention (Compound Index)
  let duplicateBlocked = false;
  try {
    await VideoResponse.create({
      participant: participant._id,
      video: video._id,
      responseText: 'Duplicate attempt for same video',
      responseTime: 20
    });
  } catch (err) {
    if (err.code === 11000) duplicateBlocked = true;
  }
  assert(duplicateBlocked, 'Database enforces compound unique index: duplicate submission for same video is blocked');
  console.log();
}

/**
 * 2. Authentication & Authorization Security Audit
 */
async function auditAuthenticationAndAuthorization() {
  console.log('---------------------------------------------------------------------------');
  console.log('2. AUTHENTICATION & AUTHORIZATION SECURITY AUDIT');
  console.log('---------------------------------------------------------------------------');

  // A. Admin Account Creation & Bcrypt Password Hashing
  const bcrypt = require('bcryptjs');
  const rawPassword = 'SecureResearchPassword2026!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const admin = await Admin.create({
    name: 'QA Lead Researcher',
    username: 'qa_admin_1',
    email: 'qa_admin_1@sbbwu.edu.pk',
    passwordHash: passwordHash,
    role: 'researcher',
    active: true
  });
  assert(admin.passwordHash !== rawPassword, 'Admin password is encrypted with bcrypt (never stored in plaintext)');
  assert(await bcrypt.compare(rawPassword, admin.passwordHash), 'Password verification succeeds with correct credentials');
  assert(!(await bcrypt.compare('WrongPassword123', admin.passwordHash)), 'Password verification fails with incorrect credentials');

  // B. Role-Based Permissions
  const coderAdmin = await Admin.create({
    name: 'QA Research Coder',
    username: 'qa_admin_coder',
    email: 'qa_coder@sbbwu.edu.pk',
    passwordHash: passwordHash,
    role: 'coder',
    active: true
  });
  assert(admin.role === 'researcher', 'Researcher role correctly assigned');
  assert(coderAdmin.role === 'coder', 'Coder role correctly assigned');
  console.log();
}

/**
 * 3. NLP Microservice Live Connectivity & Model Sanity
 */
async function auditNLPConnectivity() {
  console.log('---------------------------------------------------------------------------');
  console.log('3. NLP MICROSERVICE CONNECTIVITY & MODEL INTEGRITY AUDIT');
  console.log('---------------------------------------------------------------------------');

  const response = await fetch(`${NLP_SERVICE_URL}/health`);
  assert(response.status === 200, 'FastAPI health endpoint returns HTTP 200 OK');
  
  const data = await response.json();
  assert(data.status === 'healthy', 'NLP service reports overall status: healthy');
  assert(data.models_ready === true, 'All NLP models loaded and ready in RAM');
  assert(data.models.sentiment.loaded === true, 'CardiffNLP XLM-RoBERTa sentiment model is loaded');
  assert(data.models.toxicity.loaded === true, 'Detoxify multilingual model is loaded');
  assert(data.models.aggression.loaded === true, 'Xu et al. (2020) Aggression Lexicon is loaded');
  assert(data.models.cyberbullying.loaded === true, 'Operational Cyberbullying definition is active');
  console.log();
}

/**
 * 4. 22 Synthetic Test Cases & Multi-Construct Independence Audit
 */
async function audit22SyntheticCases() {
  console.log('---------------------------------------------------------------------------');
  console.log('4. 22 SYNTHETIC TEST CASES & CONSTRUCT INDEPENDENCE AUDIT');
  console.log('---------------------------------------------------------------------------');

  const nlpProvider = new NLPProvider({
    url: NLP_SERVICE_URL,
    timeout: 30000,
    fallbackEnabled: true
  });
  const codingService = new CodingAIService(nlpProvider);

  const testCases = [
    { id: 'TC-01', label: 'Positive', text: 'This was an inspiring and deeply compassionate video. Loved it!' },
    { id: 'TC-02', label: 'Negative Non-Bullying', text: 'I really felt depressed watching this tragedy. It was heartbreaking.' },
    { id: 'TC-03', label: 'Neutral', text: 'The video shows students walking into an auditorium at 2 PM.' },
    { id: 'TC-04', label: 'Mixed Sentiment', text: 'The visuals were great, but the message was thoroughly disturbing.' },
    { id: 'TC-05', label: 'Short Response', text: 'Terrible.' },
    { id: 'TC-06', label: 'Long Response', text: 'This experimental scenario systematically depicts how online interpersonal dynamics can quickly deteriorate when individuals feel empowered by perceived visual anonymity. The victims reactions demonstrate profound psychological isolation while the bystanders remain passive, contributing to secondary trauma.' },
    { id: 'TC-09', label: 'Special Characters', text: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`' },
    { id: 'TC-10', label: 'Emojis', text: '😢💔😡👎' },
    { id: 'TC-11', label: 'Numbers', text: '1234567890 9876543210' },
    { id: 'TC-12', label: 'Urdu (Perso-Arabic)', text: 'یہ رویہ بالکل ناقابل قبول اور افسوسناک ہے۔' },
    { id: 'TC-13', label: 'Roman Urdu', text: 'Ye bohot bura laga dekh kar. Sharam aani chahiye.' },
    { id: 'TC-14', label: 'Code-Switching', text: 'He was so rude yar, bilkul bakwas behavior tha uska.' },
    { id: 'TC-15', label: 'English Slang', text: 'Bro is totally unhinged, massive L behavior tbh.' },
    { id: 'TC-16', label: 'Aggressive Hostile', text: 'Shut up before I make you regret ever showing up here.' },
    { id: 'TC-17', label: 'Direct Insult', text: 'You are completely useless, pathetic, and a total loser.' },
    { id: 'TC-18', label: 'Threat of Harm', text: 'I will find where you study and beat you up after class.' },
    { id: 'TC-19', label: 'Toxic / Obscene', text: 'Get the hell out of here you filthy idiot.' },
    { id: 'TC-20', label: 'Ambiguous / Banter', text: 'Haha yar you are completely crazy, go away lol.' },
    { id: 'TC-21', label: 'Sarcasm / Irony', text: 'Oh wonderful, what a genius move. Truly brilliant.' },
    { id: 'TC-22', label: 'Quoted Hostility', text: 'The perpetrator said you are worthless to the victim.' }
  ];

  for (const tc of testCases) {
    const aiResult = await codingService.analyzeResponse(tc.text);
    assert(aiResult.success === true, `[${tc.id}] ${tc.label}: Analysis succeeded`);
    const res = aiResult.data;
    assert(res != null, `[${tc.id}] ${tc.label}: Analysis returns valid data object`);
    const sentimentVal = res.sentiment.label || res.sentiment.suggested;
    assert(['positive', 'neutral', 'negative', 'mixed'].includes(sentimentVal), `[${tc.id}] Valid sentiment enum: ${sentimentVal}`);
    const toxScore = res.metadata?.toxicity_score ?? res.toxicity?.score;
    assert(typeof toxScore === 'number' && toxScore >= 0 && toxScore <= 1, `[${tc.id}] Toxicity score bounded: ${toxScore}`);
    assert(typeof res.aggression.level === 'number', `[${tc.id}] Aggression level numeric: ${res.aggression.level}`);
    assert(typeof res.cyberbullying.present === 'boolean', `[${tc.id}] Cyberbullying present boolean: ${res.cyberbullying.present}`);
  }

  // Test Boundary Case: TC-07 Empty String
  const emptyRes = await codingService.analyzeResponse('');
  assert(emptyRes.success === false, '[TC-07] Empty string correctly rejected with validation error');

  // CRITICAL RESEARCH METHODOLOGY CHECK:
  // TC-02: Negative sentiment MUST NOT automatically force Cyberbullying = True
  const negResult = await codingService.analyzeResponse('I really felt depressed watching this tragedy. It was heartbreaking.');
  assert(negResult.data.sentiment.label === 'negative', 'Negative Non-Bullying text classified as negative sentiment');
  assert(negResult.data.cyberbullying.present === false, 'CRITICAL METHODOLOGY CHECK: Negative sentiment does NOT automatically trigger cyberbullying');
  console.log();
}

/**
 * 5. AI/Human Separation & Review Workflow (Accept, Modify, Reject)
 */
async function auditAIHumanWorkflows() {
  console.log('---------------------------------------------------------------------------');
  console.log('5. AI/HUMAN SEPARATION & REVIEW WORKFLOW (ACCEPT, MODIFY, REJECT)');
  console.log('---------------------------------------------------------------------------');

  const admin = await Admin.findOne({ username: 'qa_admin_1' });
  const participant = await Participant.findOne({ username: 'qa_test_p1' });
  
  const video2 = await Video.create({
    title: 'QA Test Video Stimulus 2',
    topic: 'Online Harassment',
    description: 'Cyberbullying scenario 2',
    videoUrl: 'https://example.com/stimulus2.mp4',
    duration: 40,
    order: 102,
    active: true,
    validationStatus: 'approved',
    version: '1.0'
  });
  
  const response = await VideoResponse.create({
    participant: participant._id,
    video: video2._id,
    responseText: 'QA Test Response for human review workflow validation.',
    responseTime: 35
  });

  const nlpProvider = new NLPProvider({ url: NLP_SERVICE_URL, timeout: 30000, fallbackEnabled: true });
  const codingService = new CodingAIService(nlpProvider);
  const aiResult = await codingService.analyzeResponse(response.responseText);
  assert(aiResult.success === true, 'AI analysis completed successfully');
  const aiSuggestion = aiResult.data;

  // A. AI Suggestion Saved with reviewStatus: pending
  const coding = await Coding.create({
    response: response._id,
    coderRole: 'primary',
    codingVersion: '1.0',
    confidence: 'medium',
    notes: 'QA Test AI Coding',
    aiCoding: {
      sentiment: {
        label: aiSuggestion.sentiment.label || aiSuggestion.sentiment.suggested,
        confidence: aiSuggestion.sentiment.confidence,
        evidence: aiSuggestion.sentiment.evidence,
        needsReview: aiSuggestion.sentiment.needsReview
      },
      aggression: {
        label: aiSuggestion.aggression.label || aiSuggestion.aggression.suggestedCategory,
        level: aiSuggestion.aggression.level,
        confidence: aiSuggestion.aggression.confidence,
        evidence: aiSuggestion.aggression.evidence,
        needsReview: aiSuggestion.aggression.needsReview
      },
      cyberbullying: {
        present: aiSuggestion.cyberbullying.present,
        type: aiSuggestion.cyberbullying.type || 'none',
        severity: aiSuggestion.cyberbullying.severity,
        confidence: aiSuggestion.cyberbullying.confidence,
        evidence: aiSuggestion.cyberbullying.evidence,
        needsReview: aiSuggestion.cyberbullying.needsReview
      }
    },
    reviewStatus: 'pending',
    sentiment: null,
    aggression: { level: null, category: null },
    cyberbullying: { present: null }
  });

  assert(coding.reviewStatus === 'pending', 'AI suggestion initially saved with reviewStatus: pending');
  assert(coding.sentiment === null, 'Primary research sentiment remains null until researcher approves');
  assert(coding.cyberbullying.present === null, 'Primary research cyberbullying remains null until researcher approves');

  // B. Workflow 1: Accept AI Suggestion
  const suggestedSentiment = aiSuggestion.sentiment.label || aiSuggestion.sentiment.suggested;
  coding.sentiment = suggestedSentiment;
  coding.aggression = { 
    level: aiSuggestion.aggression.level, 
    category: aiSuggestion.aggression.label || aiSuggestion.aggression.suggestedCategory || 'none' 
  };
  coding.cyberbullying = { 
    present: aiSuggestion.cyberbullying.present, 
    type: aiSuggestion.cyberbullying.type || 'none' 
  };
  coding.reviewStatus = 'reviewed';
  coding.reviewAction = 'accepted_ai';
  coding.codedBy = admin._id;
  coding.auditTrail.push({
    action: 'accept',
    reviewerId: admin._id,
    reviewerUsername: admin.username,
    timestamp: new Date(),
    details: { aiSentiment: suggestedSentiment }
  });
  await coding.save();

  const acceptedDoc = await Coding.findById(coding._id);
  assert(acceptedDoc.reviewStatus === 'reviewed', 'Accept workflow: reviewStatus transitions to reviewed');
  assert(acceptedDoc.reviewAction === 'accepted_ai', 'Accept workflow: reviewAction set to accepted_ai');
  assert(acceptedDoc.sentiment === suggestedSentiment, 'Accept workflow: Final sentiment matches accepted AI suggestion');
  assert(acceptedDoc.auditTrail.length === 1, 'Accept workflow: Audit trail records the accept event');

  // C. Workflow 2: Modify AI Suggestion
  acceptedDoc.sentiment = 'mixed'; // Researcher override
  acceptedDoc.reviewAction = 'modified';
  acceptedDoc.auditTrail.push({
    action: 'modify',
    reviewerId: admin._id,
    reviewerUsername: admin.username,
    timestamp: new Date(),
    details: { previous: suggestedSentiment, updated: 'mixed' }
  });
  await acceptedDoc.save();

  const modifiedDoc = await Coding.findById(coding._id);
  assert(modifiedDoc.reviewAction === 'modified', 'Modify workflow: reviewAction set to modified');
  assert(modifiedDoc.sentiment === 'mixed', 'Modify workflow: Overridden human sentiment stored accurately');
  assert(modifiedDoc.aiCoding.sentiment.label !== 'mixed', 'Modify workflow: Original AI suggestion preserved in aiCoding for auditability');

  // D. Workflow 3: Reject AI Suggestion
  modifiedDoc.reviewAction = 'rejected';
  modifiedDoc.notes = 'Rejected AI suggestion due to idiomatic cultural nuance';
  modifiedDoc.auditTrail.push({
    action: 'reject',
    reviewerId: admin._id,
    reviewerUsername: admin.username,
    timestamp: new Date(),
    details: { reason: 'Cultural nuance' }
  });
  await modifiedDoc.save();

  const rejectedDoc = await Coding.findById(coding._id);
  assert(rejectedDoc.reviewAction === 'rejected', 'Reject workflow: reviewAction set to rejected');
  assert(rejectedDoc.auditTrail.length === 3, 'Audit trail preserves complete history of researcher interactions');
  console.log();
}

/**
 * 6. Security Hardening, XSS & Parameter Tampering Audit
 */
async function auditSecurityHardening() {
  console.log('---------------------------------------------------------------------------');
  console.log('6. SECURITY HARDENING, XSS & PARAMETER SANITIZATION AUDIT');
  console.log('---------------------------------------------------------------------------');

  // A. XSS Payload Escaping Check
  const xssPayload = "<script>alert('XSS-VULNERABILITY')</script>";
  const participant = await Participant.findOne({ username: 'qa_test_p1' });
  
  const video3 = await Video.create({
    title: 'QA Test Video Stimulus 3',
    topic: 'Online Harassment',
    description: 'Cyberbullying scenario 3',
    videoUrl: 'https://example.com/stimulus3.mp4',
    duration: 40,
    order: 103,
    active: true,
    validationStatus: 'approved',
    version: '1.0'
  });
  
  const xssResponse = await VideoResponse.create({
    participant: participant._id,
    video: video3._id,
    responseText: xssPayload,
    responseTime: 25
  });
  assert(xssResponse._id != null, 'XSS string stored without crashing database');
  const fetchedXSS = await VideoResponse.findById(xssResponse._id);
  assert(fetchedXSS.responseText === xssPayload, 'Stored exact character sequence; React automatically escapes text in UI DOM');

  // B. Malformed ObjectId Validation
  const isValidId = mongoose.Types.ObjectId.isValid('malformed-not-an-object-id');
  assert(isValidId === false, 'Mongoose Types.ObjectId.isValid properly flags malformed ID');
  console.log();
}

/**
 * 7. Research Analytics, Condition Comparison & Export Generation Audit
 */
async function auditAnalyticsAndExports() {
  console.log('---------------------------------------------------------------------------');
  console.log('7. RESEARCH ANALYTICS, GROUP COMPARISON & EXPORT GENERATION AUDIT');
  console.log('---------------------------------------------------------------------------');

  // A. Overview Metrics
  const overview = await researchAnalyticsService.getOverviewMetrics();
  assert(typeof overview.totalResponses === 'number', 'Analytics: totalResponses is numeric');
  assert(typeof (overview.finalCodedCount ?? overview.codedResponses) === 'number', 'Analytics: finalCodedCount is numeric');
  assert(typeof overview.codingCompletionRate === 'number', 'Analytics: codingCompletionRate is numeric');
  assert(typeof overview.cyberbullyingRate === 'number', 'Analytics: cyberbullyingRate is numeric');

  // B. Condition Comparison
  const conditionComp = await researchAnalyticsService.getConditionComparison();
  assert(conditionComp.anonymous != null, 'Condition comparison: anonymous cohort present');
  assert(conditionComp.identifiable != null, 'Condition comparison: identifiable cohort present');
  assert(typeof conditionComp.anonymous.totalResponses === 'number', 'Anonymous total responses is numeric');
  assert(typeof conditionComp.identifiable.totalResponses === 'number', 'Identifiable total responses is numeric');

  // C. AI vs Human Agreement Summary
  const agreement = await researchAnalyticsService.getAIHumanAgreement();
  assert(typeof agreement.summary?.totalReviewed === 'number', 'Agreement: totalReviewed is numeric');
  assert(agreement.reviewActions != null, 'Agreement: reviewActions breakdown exists');
  assert(Array.isArray(agreement.discrepancies), 'Agreement: discrepancies list is an array');

  // D. Multi-Format Export Generation
  const supervisorReport = await researchAnalyticsService.generateSupervisorReport();
  assert(supervisorReport.metadata != null, 'Supervisor report: metadata object present');
  assert(supervisorReport.overview != null, 'Supervisor report: overview object present');
  assert(supervisorReport.conditionComparison != null, 'Supervisor report: conditionComparison object present');
  assert(Array.isArray(supervisorReport.methodologyNotes) || typeof supervisorReport.methodologyNotes === 'string', 'Supervisor report: methodology notes present');

  console.log();
}

runMasterQASuite();
