# Database Schema

## Overview
MongoDB database schema for the Cyberbullying Research Platform.

**Status:** ✅ Phase 2 Complete - All models implemented and tested

**Implementation Details:**
- 9 Mongoose models created
- Validation enforced at schema level
- Unique constraints configured
- Indexes optimized for common queries
- References established between collections
- All models tested and verified

## Collections

### participants
Stores participant registration and demographic information.

**Implementation:** ✅ Complete (`backend/src/models/Participant.js`)

```javascript
{
  _id: ObjectId, // MongoDB internal ID (NOT exposed to participants)
  
  // Basic Information
  name: String, // Required, max 100 chars
  username: String, // Required, unique, lowercase, 3-50 chars
  
  // Demographics (as approved by research protocol)
  age: Number, // Required, min 18, max 100
  gender: String, // Required, enum: ['male', 'female', 'other', 'prefer_not_to_say']
  university: String, // Required, enum: ['SBBWU', 'University of Peshawar']
  department: String, // Required, max 100 chars
  
  // Experimental Condition
  condition: String, // Required, enum: ['anonymous', 'identifiable']
  
  // Consent
  consentGiven: Boolean, // Default false
  consentAt: Date,
  consentVersion: String, // Max 20 chars
  
  // Status
  status: String, // Required, enum: ['active', 'completed', 'incomplete', 'withdrawn']
  
  // Experiment Progress
  currentVideo: ObjectId, // Reference to Video
  completedVideos: [ObjectId], // Array of Video references
  experimentStartedAt: Date,
  completedAt: Date,
  
  // Withdrawal
  withdrawalStatus: Boolean, // Default false
  withdrawalReason: String, // Max 500 chars
  withdrawalDate: Date,
  
  // Timestamps
  createdAt: Date, // Auto-generated
  updatedAt: Date  // Auto-generated
}
```

**Indexes:**
- `username` (unique)
- `status`
- `condition`
- `createdAt`

**Methods:**
- `markConsent(version)` - Record consent
- `withdraw(reason)` - Mark participant as withdrawn
- `markCompleted()` - Mark study as completed
- `countByCondition(condition)` - Static: Count participants by condition

**Validation:**
- Username: lowercase alphanumeric with hyphens/underscores
- Age: minimum 18 years
- All enum fields validated
- No participant-visible ID (MongoDB _id is internal only)

### videos
Stores video stimuli for the cyberbullying experiment.

**Implementation:** ✅ Complete (`backend/src/models/Video.js`)

```javascript
{
  _id: ObjectId,
  
  // Video Information
  title: String, // Required, max 200 chars
  topic: String, // Required, max 100 chars
  description: String, // Required, max 1000 chars
  videoUrl: String, // Required, validated URL format, max 500 chars
  duration: Number, // Required, in seconds, min 1, max 3600
  order: Number, // Required, display order, min 1
  active: Boolean, // Default true
  
  // Expert Validation
  validationStatus: String, // Required, enum: ['candidate', 'under_review', 'approved', 'rejected']
  validationNotes: String, // Max 1000 chars
  validationDate: Date,
  validatedBy: ObjectId, // Reference to Admin
  version: String, // Required, default '1.0', max 20 chars
  
  // Metadata
  metadata: {
    category: String, // Max 100 chars
    tags: [String],   // Each max 50 chars
    notes: String     // Max 500 chars
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `active` + `validationStatus` (compound)
- `order`
- `validationStatus`

**Methods:**
- `approve(adminId, notes)` - Mark as approved
- `reject(adminId, notes)` - Mark as rejected
- `getApprovedActive()` - Static: Get all approved active videos
- `countByStatus(status)` - Static: Count by validation status

**Validation:**
- URL format validated (https?://...)
- Duration between 1 second and 1 hour
- Validation status enum enforced
- No fabricated expert validation

### videoResponses
Stores experimental task responses.

**Implementation:** ✅ Complete (`backend/src/models/VideoResponse.js`)

**CRITICAL:** Enforces one response per participant per video via unique compound index.

```javascript
{
  _id: ObjectId,
  
  // References
  participant: ObjectId, // Required, reference to Participant
  video: ObjectId, // Required, reference to Video
  
  // Response (IMMUTABLE - cannot be changed after submission)
  responseText: String, // Required, min 1, max 5000 chars, immutable: true
  
  // Metrics (auto-calculated)
  responseLength: Number, // Character count
  responseWordCount: Number, // Word count
  responseTime: Number, // Time taken in seconds
  
  // Submission
  submittedAt: Date, // Required, default now, immutable
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `participant` + `video` (compound, **UNIQUE** - prevents duplicate responses)
- `submittedAt`
- `participant`
- `video`

**Methods:**
- `getWithDetails()` - Populate participant and video
- `findByParticipant(participantId)` - Static: Get all responses by participant
- `findByVideo(videoId)` - Static: Get all responses for a video
- `countByVideo(videoId)` - Static: Count responses for a video
- `getUncodedResponses()` - Static: Get responses without coding

**Validation:**
- Response text is immutable (cannot be modified after save)
- Participant + video combination must be unique
- Response length and word count auto-calculated on save
- Raw response text preserved unchanged

**Data Integrity:**
- ✅ **Duplicate prevention enforced via unique index**
- ✅ **Response text cannot be modified (immutable field)**
- ✅ **Metrics auto-calculated via pre-save hook**

### questionnaires
Stores questionnaire definitions (data-driven).

**Implementation:** ✅ Complete (`backend/src/models/Questionnaire.js`)

```javascript
{
  _id: ObjectId,
  
  // Identification
  questionnaireId: String, // Required, unique, uppercase, max 50 chars
  title: String, // Required, max 200 chars
  description: String, // Required, max 1000 chars
  version: String, // Required, default '1.0', max 20 chars
  
  // Instructions
  instructions: String, // Required, max 2000 chars
  
  // Questions (data-driven, NOT hardcoded)
  questions: [{
    itemNumber: Number, // Required, min 1
    text: String, // Required, max 1000 chars
    type: String, // Required, enum: ['likert', 'multiple_choice', 'text', 'scale']
    options: [String], // Each max 200 chars
    scaleMin: Number,
    scaleMax: Number,
    required: Boolean, // Default true
    reverseCoded: Boolean // Default false
  }],
  
  // Scoring Configuration
  scoringConfiguration: {
    method: String, // Required, max 50 chars
    description: String, // Max 1000 chars
    minScore: Number,
    maxScore: Number,
    interpretation: String // Max 1000 chars
  },
  
  // Subscales
  subscales: [{
    name: String, // Required, max 100 chars
    items: [Number], // Item numbers
    description: String // Max 500 chars
  }],
  
  // Display
  displayOrder: Number, // Required, min 1, default 1
  active: Boolean, // Default true
  
  // Attribution
  citation: String, // Max 500 chars
  author: String, // Max 200 chars
  publicationYear: Number, // 1900 to current year
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `questionnaireId` (unique)
- `active` + `displayOrder` (compound)

**Methods:**
- `deactivate()` - Mark as inactive
- `getQuestionCount()` - Get number of questions
- `getActiveQuestionnaires()` - Static: Get all active questionnaires
- `findByIdAndVersion(id, version)` - Static: Find by ID and version

**Validation:**
- At least one question required
- Question types validated via enum
- Questionnaire ID must be uppercase alphanumeric
- **NO invented research questions - data-driven only**

### questionnaireResponses
Stores participant questionnaire responses.

**Implementation:** ✅ Complete (`backend/src/models/QuestionnaireResponse.js`)

**Key Feature:** Raw answers preserved separately from calculated scores.

```javascript
{
  _id: ObjectId,
  
  // References
  participantId: ObjectId, // Required, reference to Participant
  questionnaireId: ObjectId, // Required, reference to Questionnaire
  
  // Version Tracking (critical for research validity)
  questionnaireVersion: String, // Required, max 20 chars
  
  // Raw Answers (preserved as submitted)
  answers: [{
    itemNumber: Number, // Required, min 1
    value: Mixed, // Required, any type (number, string, etc.)
    responseTime: Number // Time for item in milliseconds
  }],
  
  // Calculated Scores (separate from raw data)
  calculatedScore: {
    totalScore: Number,
    subscaleScores: [{
      subscale: String, // Max 100 chars
      score: Number,
      interpretation: String // Max 200 chars
    }],
    calculatedAt: Date,
    calculatedBy: String // enum: ['automatic', 'manual', 'system']
  },
  
  // Completion Tracking
  startedAt: Date, // Required
  completedAt: Date, // Required, default now
  totalTime: Number, // Required, in seconds, auto-calculated
  isComplete: Boolean, // Default true
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `participantId` + `questionnaireId` (compound)
- `questionnaireId`
- `completedAt`
- `questionnaireVersion`

**Methods:**
- `calculateScore(scoringFunction)` - Calculate and store scores
- `getAnswerByItem(itemNumber)` - Get specific answer
- `findByParticipant(participantId)` - Static: Get all responses by participant
- `findByQuestionnaire(questionnaireId)` - Static: Get all responses for questionnaire
- `countByQuestionnaire(id)` - Static: Count responses
- `getCompletionRate(id)` - Static: Calculate completion percentage

**Data Integrity:**
- ✅ **Raw answers preserved unchanged**
- ✅ **Scores separate from raw data**
- ✅ **Version tracking enforced**
- ✅ **Total time auto-calculated via pre-save hook**

### codings
Stores aggression/cyberbullying coding for video responses.

**Implementation:** ✅ Complete (`backend/src/models/Coding.js`)

**Key Feature:** Supports configurable coding categories and inter-rater reliability.

```javascript
{
  _id: ObjectId,
  
  // Reference
  response: ObjectId, // Required, reference to VideoResponse
  
  // Core Coding Dimensions (configurable)
  sentiment: String, // enum: ['positive', 'neutral', 'negative', 'mixed']
  
  aggression: {
    level: Number, // Min 0, max 10
    category: String, // enum: ['none', 'mild', 'moderate', 'severe']
    subcategories: [String] // Max 100 chars each
  },
  
  cyberbullying: {
    present: Boolean,
    type: String, // enum: ['none', 'harassment', 'denigration', 'flaming', 
                  //        'impersonation', 'outing', 'exclusion', 'cyberstalking', 'other']
    severity: Number // Min 0, max 10
  },
  
  // Extensible Dimensions
  dimensions: Map, // Key-value pairs for additional coding dimensions
  
  // Coder Notes
  notes: String, // Max 2000 chars
  
  // Coder Information
  codedBy: ObjectId, // Required, reference to Admin
  coderRole: String, // Required, enum: ['primary', 'secondary', 'expert', 'validator']
  
  // Versioning
  codingVersion: String, // Required, default '1.0', max 20 chars
  
  // Confidence
  confidence: String, // enum: ['low', 'medium', 'high'], default 'medium'
  
  // Inter-Rater Reliability
  reliability: {
    hasSecondCoding: Boolean, // Default false
    agreement: Boolean,
    discrepancy: Number, // Min 0
    resolved: Boolean, // Default false
    resolvedBy: ObjectId // Reference to Admin
  },
  
  codedAt: Date, // Required, default now
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `response` + `coderRole` (compound)
- `codedBy`
- `codingVersion`
- `aggression.category`
- `cyberbullying.present`
- `codedAt`

**Methods:**
- `markAsSecondary()` - Mark as secondary coding
- `calculateAgreement(primaryCodingId)` - Calculate inter-rater agreement
- `findByResponse(responseId)` - Static: Get all codings for response
- `findPrimaryCoding(responseId)` - Static: Get primary coding
- `findSecondaryCoding(responseId)` - Static: Get secondary coding
- `getUncodedResponses()` - Static: Get responses without primary coding
- `calculateInterRaterReliability()` - Static: Calculate overall reliability

**Architecture:**
- ✅ **Supports configurable coding categories via dimensions Map**
- ✅ **Inter-rater reliability tracking built-in**
- ✅ **Coding versioning for methodology tracking**
- ✅ **No hard-coded scientific categories unless supplied**

### admins
Stores admin user accounts.

**Implementation:** ✅ Complete (`backend/src/models/Admin.js`)

**CRITICAL:** Passwords stored as bcrypt hashes ONLY - never plaintext.

```javascript
{
  _id: ObjectId,
  
  // Authentication
  username: String, // Required, unique, lowercase, 3-50 chars
  email: String, // Required, unique, lowercase, max 255 chars
  passwordHash: String, // Required, bcrypt hash, select: false (not returned in queries)
  
  // Profile
  name: String, // Required, max 100 chars
  role: String, // Required, enum: ['superadmin', 'researcher', 'coder', 'analyst']
  
  // Permissions (fine-grained access control)
  permissions: [String], // enum: ['view_participants', 'view_responses', 'view_data',
                         //        'code_responses', 'manage_videos', 'manage_questionnaires',
                         //        'export_data', 'manage_admins', 'manage_study_settings',
                         //        'view_audit_logs']
  
  // Status
  active: Boolean, // Default true
  
  // Security
  lastLogin: Date,
  lastLoginIp: String, // Max 45 chars (IPv6)
  failedLoginAttempts: Number, // Min 0, default 0
  lockedUntil: Date, // Account lock after 5 failed attempts
  passwordChangedAt: Date,
  
  // Password Reset
  passwordResetToken: String, // Hashed, select: false
  passwordResetExpires: Date, // select: false
  
  // Session Tracking
  sessions: [{
    token: String,
    createdAt: Date,
    expiresAt: Date,
    ipAddress: String
  }],
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `username` (unique)
- `email` (unique)
- `active`
- `role`

**Virtual Properties:**
- `isLocked` - Returns true if account is currently locked

**Methods:**
- `recordLogin(ipAddress)` - Record successful login
- `recordFailedLogin()` - Increment failed attempts, lock after 5
- `unlock()` - Unlock account
- `deactivate()` - Mark as inactive
- `hasPermission(permission)` - Check if admin has permission
- `createPasswordResetToken()` - Generate password reset token
- `findByUsername(username)` - Static: Find by username
- `findByEmail(email)` - Static: Find by email
- `getActiveAdmins()` - Static: Get all active admins
- `countByRole(role)` - Static: Count admins by role

**Security Features:**
- ✅ **Password hash field (never plaintext)**
- ✅ **passwordHash not selected by default**
- ✅ **Account locking after 5 failed attempts**
- ✅ **30-minute lock duration**
- ✅ **Password reset token support**
- ✅ **Session tracking**

**Note:** Password hashing must be done using bcrypt in controller/service layer:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash(password, 12);
admin.passwordHash = hash;
```

### auditLogs
Tracks all significant system actions for security and compliance.

**Implementation:** ✅ Complete (`backend/src/models/AuditLog.js`)

```javascript
{
  _id: ObjectId,
  
  // Action Information
  action: String, // Required, max 100 chars, indexed
  category: String, // Required, enum: ['auth', 'participant', 'video', 'questionnaire',
                    //                   'response', 'coding', 'admin', 'data', 'system', 'security']
  
  // Actor (who performed the action)
  actorType: String, // Required, enum: ['admin', 'participant', 'system']
  actorId: String, // Required, max 100 chars, indexed
  actorUsername: String, // Max 100 chars
  
  // Target (what was affected)
  targetType: String, // Max 50 chars
  targetId: String, // Max 100 chars
  
  // Details (action-specific data)
  details: Mixed, // Flexible object for action details
  
  // Request Metadata
  ipAddress: String, // Max 45 chars (IPv6)
  userAgent: String, // Max 500 chars
  
  // Result
  success: Boolean, // Required, default true
  errorMessage: String, // Max 500 chars
  
  // Timestamp
  timestamp: Date, // Required, default now, indexed
  
  // Additional Metadata
  metadata: {
    duration: Number, // Action duration in milliseconds
    changes: Mixed, // Before/after for updates
    severity: String // enum: ['info', 'warning', 'error', 'critical']
  }
}
```

**Indexes:**
- `timestamp` (descending)
- `action` + `timestamp` (compound)
- `category` + `timestamp` (compound)
- `actorId` + `timestamp` (compound)
- `success`
- `metadata.severity` + `timestamp` (compound)

**Static Methods:**
- `logAction(data)` - Create new audit log entry
- `findByActor(actorId, limit)` - Get logs by actor
- `findByCategory(category, limit)` - Get logs by category
- `findByAction(action, limit)` - Get logs by action type
- `findByDateRange(start, end)` - Get logs in date range
- `findFailedActions(limit)` - Get failed actions
- `findSecurityEvents(limit)` - Get security-related events
- `getStatsByCategory(start, end)` - Aggregate stats by category
- `sanitizeDetails(details)` - Remove sensitive data before logging

**Security:**
- ✅ **Sensitive fields automatically redacted**
- ✅ **No plaintext passwords or tokens logged**
- ✅ **Comprehensive action tracking**
- ✅ **Optimized indexes for queries**

**Usage Example:**
```javascript
await AuditLog.logAction({
  action: 'admin_login',
  category: 'auth',
  actorType: 'admin',
  actorId: admin._id.toString(),
  actorUsername: admin.username,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  success: true
});
```

### studySettings
Stores global study configuration and parameters.

**Implementation:** ✅ Complete (`backend/src/models/StudySettings.js`)

**Note:** Single document collection for study-wide settings.

**Default Research Targets:** 60 total (30 anonymous, 30 identifiable)

```javascript
{
  _id: ObjectId,
  
  // Study Status
  studyStatus: String, // Required, enum: ['setup', 'recruiting', 'active', 
                       //                   'data_collection_complete', 'closed']
  
  // Recruitment Targets (60/30/30 by default)
  targetParticipants: Number, // Required, default 60, min 1
  anonymousTarget: Number, // Required, default 30, min 0
  identifiableTarget: Number, // Required, default 30, min 0
  
  // Current Counts (tracked automatically)
  currentParticipants: Number, // Default 0
  anonymousCount: Number, // Default 0
  identifiableCount: Number, // Default 0
  
  // Versioning
  stimulusSetVersion: String, // Required, default '1.0', max 20 chars
  questionnaireVersions: Map, // Key-value pairs of questionnaire versions
  codingVersion: String, // Default '1.0', max 20 chars
  
  // Allocation
  allocationMethod: String, // Required, enum: ['random', 'sequential', 'balanced', 'stratified']
  allocationVersion: String, // Default '1.0', max 20 chars
  
  // Recruitment
  recruitmentStatus: String, // Required, enum: ['not_started', 'open', 'paused', 'closed']
  acceptingParticipants: Boolean, // Default false
  recruitmentStartDate: Date,
  recruitmentEndDate: Date,
  
  // Environment
  environment: String, // Required, enum: ['development', 'staging', 'production']
  
  // Study Lock (prevents changes during active data collection)
  studyLocked: Boolean, // Default false
  lockedAt: Date,
  lockedBy: ObjectId, // Reference to Admin
  
  // Consent
  currentConsentVersion: String, // Default '1.0', max 20 chars
  consentRequired: Boolean, // Default true
  
  // Video Configuration
  activeVideoIds: [ObjectId], // References to Video
  videoPresentationOrder: String, // enum: ['sequential', 'random', 'fixed']
  
  // Questionnaire Configuration
  activeQuestionnaireIds: [ObjectId], // References to Questionnaire
  questionnaireOrder: [ObjectId], // References to Questionnaire
  
  // Experiment Settings
  experimentSettings: {
    maxResponseTime: Number, // in seconds, default 600
    minResponseLength: Number, // default 10
    allowWithdrawal: Boolean, // default true
    showProgressBar: Boolean // default true
  },
  
  // Analytics
  analyticsEnabled: Boolean, // Default true
  
  // Metadata
  notes: String, // Max 2000 chars
  lastModifiedBy: ObjectId, // Reference to Admin
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Pre-save Validation:**
- ✅ **anonymousTarget + identifiableTarget must equal targetParticipants**

**Methods:**
- `incrementParticipantCount(condition)` - Increment counts
- `decrementParticipantCount(condition)` - Decrement counts
- `canAcceptParticipant(condition)` - Check if can accept more participants
- `getNextCondition()` - Get next condition based on balanced allocation
- `lockStudy(adminId)` - Lock study settings
- `unlockStudy()` - Unlock study settings
- `getSettings()` - Static: Get settings (creates if not exists)
- `updateSettings(updates, adminId)` - Static: Update settings

**Key Features:**
- ✅ **Supports 60/30/30 target configuration**
- ✅ **Balanced allocation algorithm**
- ✅ **Study locking mechanism**
- ✅ **Questionnaire versioning**
- ✅ **Coding versioning**
- ✅ **Auto-creates default settings**

**Default Values:**
```javascript
{
  targetParticipants: 60,
  anonymousTarget: 30,
  identifiableTarget: 30,
  studyStatus: 'setup',
  allocationMethod: 'balanced',
  environment: 'development'
}
```

---

## Relationships

```
Participant (1) ─────────< (many) VideoResponse
Video (1) ───────────────< (many) VideoResponse
VideoResponse (1) ───────< (many) Coding
Admin (1) ───────────────< (many) Coding
Admin (1) ───────────────< (many) Video (validatedBy)
Admin (1) ───────────────< (many) AuditLog

Participant (1) ─────────< (many) QuestionnaireResponse
Questionnaire (1) ───────< (many) QuestionnaireResponse

StudySettings (1) ───────< (many) Video (activeVideoIds)
StudySettings (1) ───────< (many) Questionnaire (activeQuestionnaireIds)
```

**Implementation Status:** ✅ All references configured with Mongoose ObjectId refs

## Data Integrity

### Constraints Implemented
- ✅ Participant usernames are unique
- ✅ Admin usernames and emails are unique
- ✅ Questionnaire IDs are unique
- ✅ **One video response per participant per video (compound unique index)**
- ✅ Questionnaire responses reference valid questionnaire IDs
- ✅ Study settings: anonymous + identifiable targets must equal total target

### Immutable Fields
- ✅ `VideoResponse.responseText` - Cannot be modified after submission
- ✅ `VideoResponse.submittedAt` - Cannot be modified after creation

### Cascading Actions
- **Participant withdrawal:** Status marked as 'withdrawn', data retained
- **Admin deactivation:** Status marked inactive, audit logs retained
- **Questionnaire deactivation:** Marked inactive, responses retained
- **Video deactivation:** Marked inactive, responses retained

### Validation Summary
- ✅ All required fields enforced
- ✅ Enum values validated
- ✅ String length limits enforced
- ✅ Number ranges validated (age, scores, durations)
- ✅ URL format validated
- ✅ Email format validated
- ✅ Username format validated (alphanumeric + hyphens/underscores)

## Indexes Strategy

### Performance Indexes Implemented

**Participant Model:**
- `username` (unique) - For login/lookup
- `status` - Filter by participant status
- `condition` - Filter by experimental condition
- `createdAt` - Sort by registration date

**Video Model:**
- `active` + `validationStatus` (compound) - Get approved active videos
- `order` - Sort videos by display order
- `validationStatus` - Filter by approval status

**VideoResponse Model:**
- `participant` + `video` (compound, unique) - **Prevents duplicate responses**
- `submittedAt` - Sort by submission date
- `participant` - Get all responses by participant
- `video` - Get all responses for a video

**Questionnaire Model:**
- `questionnaireId` (unique) - Lookup by ID
- `active` + `displayOrder` (compound) - Get active questionnaires in order

**QuestionnaireResponse Model:**
- `participantId` + `questionnaireId` (compound) - Track participant responses
- `questionnaireId` - Get all responses for questionnaire
- `completedAt` - Sort by completion date
- `questionnaireVersion` - Track version history

**Coding Model:**
- `response` + `coderRole` (compound) - Find primary/secondary codings
- `codedBy` - Get all codings by a coder
- `codingVersion` - Track coding methodology version
- `aggression.category` - Filter by aggression category
- `cyberbullying.present` - Filter by cyberbullying presence
- `codedAt` - Sort by coding date

**Admin Model:**
- `username` (unique) - Login lookup
- `email` (unique) - Email lookup
- `active` - Filter active admins
- `role` - Filter by role

**AuditLog Model:**
- `timestamp` (descending) - Recent events first
- `action` + `timestamp` (compound) - Events by action type
- `category` + `timestamp` (compound) - Events by category
- `actorId` + `timestamp` (compound) - Events by actor
- `success` - Filter failed actions
- `metadata.severity` + `timestamp` (compound) - Filter by severity

### Future Compound Indexes
When query patterns emerge in production:
- `(condition, status)` - Participant filtering
- `(participantId, createdAt)` - Timeline queries
- `(questionnaireId, participantId)` - Response lookup

## Data Retention

### Active Data
- Participant data: Retained until study completion + 7 years (per institutional policy)
- Audit logs: Retained indefinitely
- Admin accounts: Deactivate but retain

### Backup Strategy
- Daily automated backups (MongoDB Atlas)
- Point-in-time recovery
- 30-day retention period

## Security Considerations

### Sensitive Data Protection
- ✅ **Passwords:** Stored as bcrypt hashes only (never plaintext)
- ✅ **passwordHash field:** Not selected in queries by default (`select: false`)
- ✅ **Password reset tokens:** Hashed before storage
- ✅ **Audit logs:** Sensitive fields automatically redacted
- ✅ **Minimal PII:** Only collect approved demographic fields
- ✅ **Response preservation:** Raw responses immutable after submission

### Encryption
- ✅ **At rest:** MongoDB Atlas encryption enabled
- ✅ **In transit:** TLS/SSL for all connections
- ✅ **Application level:** Bcrypt for passwords (cost factor 12)

### Access Control
- ✅ **Application-level:** Role-based permissions in Admin model
- ✅ **Database-level:** Authentication required
- ✅ **IP whitelist:** Production MongoDB Atlas
- ✅ **Audit trail:** All actions logged in AuditLog collection

### Data Anonymization
- No participant-visible ID exposed
- MongoDB ObjectId used internally only
- De-identification support for data export
- Response text preserved for analysis but participant identity protected

---

## Phase 2 Implementation Summary

### ✅ Models Created (9/9)
1. ✅ **Participant** - Demographics and study progress
2. ✅ **Video** - Video stimuli with validation workflow
3. ✅ **VideoResponse** - Experimental responses (duplicate prevention)
4. ✅ **Questionnaire** - Data-driven questionnaire definitions
5. ✅ **QuestionnaireResponse** - Questionnaire responses with scoring
6. ✅ **Coding** - Response coding with inter-rater reliability
7. ✅ **Admin** - Admin users with password hashing
8. ✅ **AuditLog** - Comprehensive action tracking
9. ✅ **StudySettings** - Global study configuration (60/30/30)

### ✅ Key Features Implemented
- ✅ **Validation:** All required fields, enums, ranges enforced
- ✅ **Unique Constraints:** Usernames, emails, participant+video combinations
- ✅ **Immutable Fields:** Response text, submission timestamps
- ✅ **Indexes:** Optimized for common query patterns
- ✅ **References:** Mongoose ObjectId relationships configured
- ✅ **Password Security:** Bcrypt hash storage only
- ✅ **Versioning:** Questionnaires, coding, stimuli versioning
- ✅ **60/30/30 Targets:** Study settings pre-configured
- ✅ **Duplicate Prevention:** Compound unique index on VideoResponse

### ✅ Testing
- ✅ Test suite created (`backend/src/tests/test-models.js`)
- ✅ Tests all models for validation
- ✅ Tests unique constraints
- ✅ Tests enum validation
- ✅ Tests references and population
- ✅ Tests duplicate response prevention
- ✅ Tests password hash field

### 📁 Files Created
```
backend/src/models/
├── index.js                    # Model exports
├── Participant.js              # Participant model
├── Video.js                    # Video model
├── VideoResponse.js            # Response model (duplicate prevention)
├── Questionnaire.js            # Questionnaire model
├── QuestionnaireResponse.js    # Questionnaire response model
├── Coding.js                   # Coding model (inter-rater reliability)
├── Admin.js                    # Admin model (password hashing)
├── AuditLog.js                 # Audit log model
└── StudySettings.js            # Study settings model (60/30/30)

backend/src/tests/
└── test-models.js              # Comprehensive model tests
```

---

**Document Version:** 2.0  
**Last Updated:** Phase 2 Complete  
**Status:** ✅ All models implemented, tested, and documented
