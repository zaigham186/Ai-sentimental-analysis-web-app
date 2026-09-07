# Model Quick Reference Guide

Quick reference for all 9 database models in the Cyberbullying Research Platform.

---

## Import Models

```javascript
const models = require('./src/models');
// or
const { Participant, Video, VideoResponse, Questionnaire, QuestionnaireResponse, 
        Coding, Admin, AuditLog, StudySettings } = require('./src/models');
```

---

## Participant

```javascript
// Create
const participant = await models.Participant.create({
  name: 'Jane Doe',
  username: 'janedoe',
  age: 21,
  gender: 'female',
  university: 'SBBWU',
  department: 'Psychology',
  condition: 'anonymous' // or 'identifiable'
});

// Methods
await participant.markConsent('1.0');
await participant.withdraw('Personal reasons');
await participant.markCompleted();

// Static methods
const count = await models.Participant.countByCondition('anonymous');
```

**Key Fields:**
- `condition`: 'anonymous' | 'identifiable'
- `status`: 'active' | 'completed' | 'incomplete' | 'withdrawn'
- `gender`: 'male' | 'female' | 'other' | 'prefer_not_to_say'
- `university`: 'SBBWU' | 'University of Peshawar'

---

## Video

```javascript
// Create
const video = await models.Video.create({
  title: 'Video Title',
  topic: 'Cyberbullying Scenario',
  description: 'Description of the video',
  videoUrl: 'https://example.com/video.mp4',
  duration: 180, // seconds
  order: 1,
  version: '1.0'
});

// Methods
await video.approve(adminId, 'Approved by expert');
await video.reject(adminId, 'Not suitable for study');

// Static methods
const activeVideos = await models.Video.getApprovedActive();
const count = await models.Video.countByStatus('approved');
```

**Key Fields:**
- `validationStatus`: 'candidate' | 'under_review' | 'approved' | 'rejected'
- `active`: Boolean
- `duration`: 1-3600 seconds

---

## VideoResponse

**⚠️ CRITICAL: One response per participant per video (enforced)**

```javascript
// Create
const response = await models.VideoResponse.create({
  participant: participantId,
  video: videoId,
  responseText: 'Participant response here',
  responseTime: 120 // seconds
});

// Attempting duplicate will throw error
try {
  await models.VideoResponse.create({
    participant: participantId,
    video: videoId, // Same participant + video
    responseText: 'Different response'
  });
} catch (error) {
  console.log('Duplicate prevented!'); // ✓
}

// Static methods
const participantResponses = await models.VideoResponse.findByParticipant(participantId);
const videoResponses = await models.VideoResponse.findByVideo(videoId);
const uncoded = await models.VideoResponse.getUncodedResponses();
```

**Key Features:**
- `responseText`: Immutable (cannot be changed after save)
- `responseLength`, `responseWordCount`: Auto-calculated
- **Unique constraint on [participant + video]**

---

## Questionnaire

```javascript
// Create
const questionnaire = await models.Questionnaire.create({
  questionnaireId: 'MORAL_DISENGAGEMENT',
  title: 'Moral Disengagement Scale',
  description: 'Measures moral disengagement',
  version: '1.0',
  instructions: 'Please rate each statement...',
  questions: [
    {
      itemNumber: 1,
      text: 'Question text here',
      type: 'likert',
      options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
      required: true,
      reverseCoded: false
    }
  ],
  scoringConfiguration: {
    method: 'sum',
    description: 'Sum all items',
    minScore: 0,
    maxScore: 100
  },
  displayOrder: 1
});

// Methods
await questionnaire.deactivate();
const count = questionnaire.getQuestionCount();

// Static methods
const active = await models.Questionnaire.getActiveQuestionnaires();
const specific = await models.Questionnaire.findByIdAndVersion('MORAL_DISENGAGEMENT', '1.0');
```

**Key Fields:**
- `type`: 'likert' | 'multiple_choice' | 'text' | 'scale'
- `active`: Boolean
- `questionnaireId`: Unique, uppercase

---

## QuestionnaireResponse

```javascript
// Create
const response = await models.QuestionnaireResponse.create({
  participantId: participantId,
  questionnaireId: questionnaireId,
  questionnaireVersion: '1.0',
  answers: [
    { itemNumber: 1, value: 4, responseTime: 2000 },
    { itemNumber: 2, value: 3, responseTime: 1500 }
  ],
  startedAt: new Date(Date.now() - 60000),
  completedAt: new Date()
  // totalTime auto-calculated
});

// Methods
await response.calculateScore(scoringFunction);
const answer = response.getAnswerByItem(1);

// Static methods
const byParticipant = await models.QuestionnaireResponse.findByParticipant(participantId);
const byQuestionnaire = await models.QuestionnaireResponse.findByQuestionnaire(questionnaireId);
const rate = await models.QuestionnaireResponse.getCompletionRate(questionnaireId);
```

**Key Features:**
- Raw `answers` preserved
- `calculatedScore` stored separately
- `totalTime` auto-calculated in pre-save hook

---

## Coding

```javascript
// Create
const coding = await models.Coding.create({
  response: responseId,
  sentiment: 'negative',
  aggression: {
    level: 6,
    category: 'moderate',
    subcategories: ['verbal', 'threatening']
  },
  cyberbullying: {
    present: true,
    type: 'harassment',
    severity: 7
  },
  notes: 'Coder notes here',
  codedBy: adminId,
  coderRole: 'primary',
  codingVersion: '1.0',
  confidence: 'high'
});

// Methods
await coding.markAsSecondary();
await coding.calculateAgreement(primaryCodingId);

// Static methods
const allCodings = await models.Coding.findByResponse(responseId);
const primary = await models.Coding.findPrimaryCoding(responseId);
const secondary = await models.Coding.findSecondaryCoding(responseId);
const uncoded = await models.Coding.getUncodedResponses();
const reliability = await models.Coding.calculateInterRaterReliability();
```

**Key Fields:**
- `sentiment`: 'positive' | 'neutral' | 'negative' | 'mixed'
- `aggression.category`: 'none' | 'mild' | 'moderate' | 'severe'
- `cyberbullying.type`: 'none' | 'harassment' | 'denigration' | 'flaming' | etc.
- `coderRole`: 'primary' | 'secondary' | 'expert' | 'validator'
- `confidence`: 'low' | 'medium' | 'high'

---

## Admin

**⚠️ CRITICAL: Use bcrypt for password hashing**

```javascript
const bcrypt = require('bcryptjs');

// Create
const passwordHash = await bcrypt.hash('password123', 12);
const admin = await models.Admin.create({
  username: 'researcher1',
  email: 'researcher@university.edu',
  passwordHash: passwordHash,
  name: 'Dr. Researcher',
  role: 'researcher',
  permissions: ['view_data', 'export_data']
});

// Methods
await admin.recordLogin('192.168.1.1');
await admin.recordFailedLogin(); // Locks after 5 attempts
await admin.unlock();
await admin.deactivate();
const hasPerm = admin.hasPermission('view_data');
const resetToken = admin.createPasswordResetToken();

// Static methods
const byUsername = await models.Admin.findByUsername('researcher1');
const byEmail = await models.Admin.findByEmail('researcher@university.edu');
const active = await models.Admin.getActiveAdmins();
const count = await models.Admin.countByRole('researcher');

// Verify password
const isValid = await bcrypt.compare(password, admin.passwordHash);
```

**Key Fields:**
- `role`: 'superadmin' | 'researcher' | 'coder' | 'analyst'
- `permissions`: Array of permission strings
- `active`: Boolean
- `passwordHash`: Bcrypt hash (select: false)

**Security:**
- Account locks after 5 failed attempts (30 minutes)
- passwordHash not returned in queries by default

---

## AuditLog

```javascript
// Create
await models.AuditLog.logAction({
  action: 'participant_registered',
  category: 'participant',
  actorType: 'participant',
  actorId: participant._id.toString(),
  actorUsername: participant.username,
  details: { condition: 'anonymous' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  success: true
});

// Static methods
const byActor = await models.AuditLog.findByActor(actorId, 100);
const byCategory = await models.AuditLog.findByCategory('auth', 100);
const byAction = await models.AuditLog.findByAction('login', 100);
const byDate = await models.AuditLog.findByDateRange(startDate, endDate);
const failed = await models.AuditLog.findFailedActions(100);
const security = await models.AuditLog.findSecurityEvents(100);
const stats = await models.AuditLog.getStatsByCategory(startDate, endDate);

// Sanitize sensitive data
const safe = models.AuditLog.sanitizeDetails({
  username: 'user',
  password: 'secret' // Will become [REDACTED]
});
```

**Key Fields:**
- `category`: 'auth' | 'participant' | 'video' | 'questionnaire' | 'response' | 'coding' | 'admin' | 'data' | 'system' | 'security'
- `actorType`: 'admin' | 'participant' | 'system'
- `success`: Boolean
- `metadata.severity`: 'info' | 'warning' | 'error' | 'critical'

---

## StudySettings

**⚠️ Single document collection**

```javascript
// Get settings (creates if not exists)
const settings = await models.StudySettings.getSettings();

// Check targets
console.log(settings.targetParticipants);  // 60
console.log(settings.anonymousTarget);     // 30
console.log(settings.identifiableTarget);  // 30

// Methods
await settings.incrementParticipantCount('anonymous');
await settings.decrementParticipantCount('identifiable');

const canAccept = settings.canAcceptParticipant('anonymous');
const nextCondition = settings.getNextCondition(); // Balanced allocation

await settings.lockStudy(adminId);
await settings.unlockStudy();

// Static methods
const updated = await models.StudySettings.updateSettings({
  acceptingParticipants: true,
  recruitmentStatus: 'open'
}, adminId);
```

**Key Fields:**
- `studyStatus`: 'setup' | 'recruiting' | 'active' | 'data_collection_complete' | 'closed'
- `allocationMethod`: 'random' | 'sequential' | 'balanced' | 'stratified'
- `recruitmentStatus`: 'not_started' | 'open' | 'paused' | 'closed'
- `environment`: 'development' | 'staging' | 'production'
- `studyLocked`: Boolean

**Defaults:**
- targetParticipants: 60
- anonymousTarget: 30
- identifiableTarget: 30
- allocationMethod: 'balanced'

---

## Common Patterns

### Population
```javascript
// Populate references
const response = await models.VideoResponse
  .findById(id)
  .populate('participant', 'username condition')
  .populate('video', 'title topic');
```

### Error Handling
```javascript
try {
  const participant = await models.Participant.create({ ... });
} catch (error) {
  if (error.code === 11000) {
    // Duplicate key error (unique constraint violated)
  } else if (error.name === 'ValidationError') {
    // Validation error
    console.log(error.errors);
  }
}
```

### Transactions (for complex operations)
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  const participant = await models.Participant.create([{ ... }], { session });
  await models.AuditLog.logAction({ ... }, { session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## Testing

```bash
# Run all model tests
npm test

# Run specific test file
node src/tests/test-models.js
```

---

**Quick Reference Version:** 1.0  
**Last Updated:** Phase 2 Complete
