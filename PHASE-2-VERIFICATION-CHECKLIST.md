# Phase 2 Verification Checklist

Use this checklist to verify Phase 2 implementation is complete and working.

---

## 📋 PRE-TESTING CHECKLIST

### Environment Setup
- [ ] MongoDB installed and running (or Atlas connection ready)
- [ ] Node.js 18+ installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] `.env` file created from `.env.example`
- [ ] `MONGODB_URI` configured in `.env`
- [ ] `SESSION_SECRET` set in `.env`

### File Verification
- [ ] `backend/src/models/Participant.js` exists
- [ ] `backend/src/models/Video.js` exists
- [ ] `backend/src/models/VideoResponse.js` exists
- [ ] `backend/src/models/Questionnaire.js` exists
- [ ] `backend/src/models/QuestionnaireResponse.js` exists
- [ ] `backend/src/models/Coding.js` exists
- [ ] `backend/src/models/Admin.js` exists
- [ ] `backend/src/models/AuditLog.js` exists
- [ ] `backend/src/models/StudySettings.js` exists
- [ ] `backend/src/models/index.js` exists
- [ ] `backend/src/tests/test-models.js` exists

---

## 🧪 TESTING CHECKLIST

### Run Test Suite
```bash
cd backend
npm test
```

### Test Results
- [ ] Test suite runs without crashing
- [ ] Database connection successful
- [ ] Test data cleanup works
- [ ] All Participant tests pass (5 tests)
- [ ] All Video tests pass (3 tests)
- [ ] All VideoResponse tests pass (3 tests)
- [ ] All Questionnaire tests pass (2 tests)
- [ ] All QuestionnaireResponse tests pass (1 test)
- [ ] All Coding tests pass (2 tests)
- [ ] All Admin tests pass (3 tests)
- [ ] All AuditLog tests pass (2 tests)
- [ ] All StudySettings tests pass (2 tests)
- [ ] Unique constraint tests pass (1 test)
- [ ] Reference tests pass (1 test)
- [ ] **Total: 45/45 tests pass**

---

## ✅ MODEL VERIFICATION

### Participant Model
- [ ] Can create participant
- [ ] Username must be unique
- [ ] Age minimum 18 enforced
- [ ] Condition enum validated (anonymous/identifiable)
- [ ] Status enum validated (active/completed/incomplete/withdrawn)
- [ ] `markConsent()` method works
- [ ] `withdraw()` method works
- [ ] `markCompleted()` method works

### Video Model
- [ ] Can create video
- [ ] URL format validated
- [ ] Duration range enforced (1-3600 seconds)
- [ ] Validation status enum works
- [ ] `approve()` method works
- [ ] `reject()` method works
- [ ] `getApprovedActive()` static works

### VideoResponse Model ⭐ CRITICAL
- [ ] Can create response
- [ ] **Cannot create duplicate response (same participant + video)**
- [ ] Response text is immutable after save
- [ ] Response length auto-calculated
- [ ] Word count auto-calculated
- [ ] `findByParticipant()` static works
- [ ] `findByVideo()` static works
- [ ] `getUncodedResponses()` static works

### Questionnaire Model
- [ ] Can create questionnaire
- [ ] Questionnaire ID must be unique
- [ ] Must have at least one question
- [ ] Question type enum validated
- [ ] `deactivate()` method works
- [ ] `getActiveQuestionnaires()` static works

### QuestionnaireResponse Model
- [ ] Can create response
- [ ] Version tracking works
- [ ] Raw answers preserved
- [ ] Calculated score separate from answers
- [ ] Total time auto-calculated
- [ ] `calculateScore()` method works
- [ ] `findByParticipant()` static works

### Coding Model
- [ ] Can create coding
- [ ] Sentiment enum validated
- [ ] Aggression category enum validated
- [ ] Cyberbullying type enum validated
- [ ] Coder role enum validated
- [ ] Confidence enum validated
- [ ] `markAsSecondary()` method works
- [ ] `calculateAgreement()` method works
- [ ] `findPrimaryCoding()` static works
- [ ] `calculateInterRaterReliability()` static works

### Admin Model ⭐ CRITICAL
- [ ] Can create admin
- [ ] Username must be unique
- [ ] Email must be unique
- [ ] **Password stored as hash (not plaintext)**
- [ ] passwordHash not returned in queries by default
- [ ] Role enum validated
- [ ] `recordLogin()` method works
- [ ] `recordFailedLogin()` method works (locks after 5)
- [ ] `hasPermission()` method works

### AuditLog Model
- [ ] Can create log entry
- [ ] Category enum validated
- [ ] Actor type enum validated
- [ ] `logAction()` static works
- [ ] `findByActor()` static works
- [ ] `findByCategory()` static works
- [ ] `findFailedActions()` static works
- [ ] Sensitive data gets redacted

### StudySettings Model ⭐ CRITICAL
- [ ] Can create settings with 60/30/30
- [ ] **Anonymous + identifiable must equal total**
- [ ] Default values correct (60, 30, 30)
- [ ] `incrementParticipantCount()` works
- [ ] `canAcceptParticipant()` works
- [ ] `getNextCondition()` works (balanced allocation)
- [ ] `lockStudy()` works
- [ ] `getSettings()` static works (creates if not exists)

---

## 🔗 REFERENCE VERIFICATION

### Population Tests
- [ ] VideoResponse can populate participant
- [ ] VideoResponse can populate video
- [ ] Coding can populate response
- [ ] Coding can populate codedBy (admin)
- [ ] QuestionnaireResponse can populate participant
- [ ] QuestionnaireResponse can populate questionnaire

### Reference Integrity
- [ ] Deleting participant doesn't break responses
- [ ] Invalid ObjectId references rejected
- [ ] Null references allowed where optional

---

## 🔐 SECURITY VERIFICATION

### Password Security
- [ ] **Admin password never stored as plaintext**
- [ ] Bcrypt hash stored in passwordHash field
- [ ] passwordHash field not selected by default
- [ ] Account locks after 5 failed login attempts
- [ ] Lock duration is 30 minutes

### Data Protection
- [ ] VideoResponse.responseText immutable
- [ ] AuditLog sanitizes passwords
- [ ] AuditLog sanitizes tokens
- [ ] AuditLog sanitizes secrets
- [ ] Minimal PII collected (only approved fields)

### Access Control
- [ ] Admin roles defined and enforced
- [ ] Permissions array supports fine-grained control
- [ ] Study locking prevents unauthorized changes
- [ ] Audit logging tracks all actions

---

## 📊 VALIDATION VERIFICATION

### Required Fields
- [ ] Missing required fields cause validation error
- [ ] Error messages are descriptive

### Enum Validation
- [ ] Invalid enum values rejected
- [ ] Error messages specify valid values
- [ ] All enum fields tested

### Range Validation
- [ ] Age minimum 18 enforced
- [ ] Aggression level 0-10 enforced
- [ ] Cyberbullying severity 0-10 enforced
- [ ] Video duration 1-3600 enforced

### Format Validation
- [ ] URL format validated
- [ ] Email format validated
- [ ] Username format validated (alphanumeric + hyphens/underscores)

### Length Validation
- [ ] String max lengths enforced
- [ ] Response text max 5000 chars
- [ ] All length limits tested

---

## 🎯 CRITICAL FEATURE VERIFICATION

### ⭐ Feature 1: Duplicate Prevention
```bash
# This MUST fail:
# Creating two responses for same participant + video
```
- [ ] First response succeeds
- [ ] Second response fails with duplicate error
- [ ] Error code is 11000 (duplicate key)

### ⭐ Feature 2: Password Hashing
```bash
# Password MUST be hashed:
# Check admin.passwordHash starts with $2a$ or $2b$
```
- [ ] Password hash field exists
- [ ] Hash looks like bcrypt hash ($2a$12$...)
- [ ] Original password NOT stored
- [ ] Bcrypt.compare() verifies password

### ⭐ Feature 3: Immutable Response
```bash
# Response text CANNOT be modified:
# Attempting to change responseText should fail
```
- [ ] Response text saved correctly
- [ ] Attempt to modify fails or is ignored
- [ ] Original text preserved

### ⭐ Feature 4: Study Settings 60/30/30
```bash
# Targets MUST sum correctly:
# anonymous (30) + identifiable (30) = total (60)
```
- [ ] Valid settings with 60/30/30 succeed
- [ ] Invalid settings (e.g., 60/25/30) fail
- [ ] Error message descriptive

---

## 📚 DOCUMENTATION VERIFICATION

### Documents Exist
- [ ] `docs/database-schema.md` updated for Phase 2
- [ ] `PHASE-2-SUMMARY.md` created
- [ ] `PHASE-2-TESTING-GUIDE.md` created
- [ ] `PHASE-2-FINAL-REPORT.md` created
- [ ] `PHASE-2-VERIFICATION-CHECKLIST.md` created (this file)
- [ ] `backend/MODEL-QUICK-REFERENCE.md` created
- [ ] `README.md` updated to show Phase 2 complete

### Documentation Quality
- [ ] All models documented
- [ ] All fields explained
- [ ] All indexes listed
- [ ] All methods described
- [ ] Validation rules clear
- [ ] Security considerations noted
- [ ] Examples provided
- [ ] Troubleshooting guides included

---

## 🔄 INTEGRATION VERIFICATION

### Database Connection
- [ ] Server connects to MongoDB on startup
- [ ] Connection retry logic works
- [ ] Graceful disconnect on shutdown
- [ ] Connection status logged

### Model Registration
- [ ] All models registered with Mongoose
- [ ] Models accessible via require()
- [ ] No circular dependency issues
- [ ] Indexes created automatically

### Error Handling
- [ ] Validation errors caught
- [ ] Duplicate key errors caught
- [ ] Connection errors handled
- [ ] Descriptive error messages

---

## 📝 ACCEPTANCE CRITERIA (Final Check)

### Models (9/9)
- [ ] ✅ All 9 models exist
- [ ] ✅ All models tested
- [ ] ✅ All models working

### Validation
- [ ] ✅ All required fields validated
- [ ] ✅ All enums validated
- [ ] ✅ All ranges validated
- [ ] ✅ All formats validated

### Constraints
- [ ] ✅ Unique constraints work
- [ ] ✅ **Duplicate prevention works**
- [ ] ✅ Foreign key references work

### Security
- [ ] ✅ **Password hashing works**
- [ ] ✅ **NO plaintext passwords**
- [ ] ✅ Account locking works
- [ ] ✅ Audit logging works

### Research Protocol
- [ ] ✅ **60/30/30 targets supported**
- [ ] ✅ Questionnaire versioning works
- [ ] ✅ Coding versioning works
- [ ] ✅ Inter-rater reliability supported

### Testing
- [ ] ✅ Test suite complete
- [ ] ✅ All tests pass (45/45)
- [ ] ✅ Critical features verified

### Documentation
- [ ] ✅ Complete documentation
- [ ] ✅ Testing guide provided
- [ ] ✅ Quick reference created
- [ ] ✅ Troubleshooting included

---

## ✅ FINAL SIGN-OFF

### Phase 2 Complete When:
- [ ] All items in this checklist checked
- [ ] All 45 tests passing
- [ ] No critical issues found
- [ ] Documentation reviewed
- [ ] Team can explain key features

### Ready for Phase 3 When:
- [ ] Phase 2 verification complete
- [ ] Database layer tested
- [ ] Security verified
- [ ] Research protocol confirmed
- [ ] Team understands models

---

## 🚀 COMMANDS SUMMARY

```bash
# Setup
cd backend
npm install
copy .env.example .env
# Edit .env

# Test
npm test

# Expected: 45/45 tests pass

# Start (for verification)
npm run dev

# Expected: Server starts, MongoDB connects
```

---

## 📞 SUPPORT

### If Any Items Not Checked
1. Review PHASE-2-TESTING-GUIDE.md
2. Check error messages carefully
3. Verify MongoDB connection
4. Review model definitions
5. Check test output

### If All Items Checked
✅ **Phase 2 Complete!**

Proceed to:
1. Review PHASE-2-SUMMARY.md for overview
2. Review MODEL-QUICK-REFERENCE.md for usage
3. Start planning Phase 3 implementation

---

**Checklist Version:** 1.0  
**Phase:** 2 - Database Models & Schemas  
**Status:** Verification Ready
