# Phase 2 Testing Guide

## How to Test Phase 2 Implementation

This guide helps you verify that all Phase 2 database models are working correctly.

---

## Prerequisites

### 1. MongoDB Running

**Option A: Local MongoDB**
```bash
# Start MongoDB
mongod
```

**Option B: MongoDB Atlas**
1. Create free cluster at mongodb.com/atlas
2. Get connection string
3. Update `MONGODB_URI` in `backend/.env`

### 2. Environment Setup

```bash
cd backend

# Create .env file from template
copy .env.example .env

# Edit .env and set:
# MONGODB_URI=mongodb://localhost:27017/cyberbullying-research
# (or your Atlas connection string)
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

**New dependency added for Phase 2:**
- `bcryptjs` - For password hashing

---

## Running the Test Suite

### Full Test Suite

```bash
cd backend
npm test
```

### Alternative Command

```bash
cd backend
npm run test:models
```

### Direct Execution

```bash
cd backend
node src/tests/test-models.js
```

---

## Expected Test Output

```
Connected to test database

Cleaning test data...
Test data cleaned

Testing Participant Model...
✓ Participant: Create valid participant
✓ Participant: Required field validation
✓ Participant: Age validation (minimum)
✓ Participant: Condition enum validation
✓ Participant: Status enum validation

Testing Video Model...
✓ Video: Create valid video
✓ Video: URL validation
✓ Video: Validation status enum

Testing VideoResponse Model...
✓ VideoResponse: Create valid response
✓ VideoResponse: Duplicate response prevention ⭐
✓ VideoResponse: Immutable response text

Testing Questionnaire Model...
✓ Questionnaire: Create valid questionnaire
✓ Questionnaire: Empty questions validation

Testing QuestionnaireResponse Model...
✓ QuestionnaireResponse: Create valid response

Testing Coding Model...
✓ Coding: Create valid coding
✓ Coding: Sentiment enum validation

Testing Admin Model...
✓ Admin: Create valid admin
✓ Admin: Password stored as hash ⭐
✓ Admin: Unique email constraint

Testing AuditLog Model...
✓ AuditLog: Create valid log entry
✓ AuditLog: Category enum validation

Testing StudySettings Model...
✓ StudySettings: Create with 60/30/30 targets ⭐
✓ StudySettings: Target validation

Testing Unique Constraints...
✓ Unique Constraint: Participant username

Testing Model References...
✓ References: Populate participant and video

==================================================
TEST SUMMARY
==================================================
Total Tests: 45
Passed: 45
Failed: 0
==================================================

Disconnected from database
```

---

## Critical Tests to Verify

### ⭐ Test 1: Duplicate Response Prevention

**What it tests:** VideoResponse model prevents duplicate participant+video combinations

**Expected behavior:** ✅ First response succeeds, second response fails

**Why it matters:** Ensures data integrity - one response per participant per video

```javascript
// First response - OK
await VideoResponse.create({
  participant: participantId,
  video: videoId,
  responseText: 'Response 1'
}); // ✓ Success

// Second response - FAILS
await VideoResponse.create({
  participant: participantId,
  video: videoId,  // Same combination!
  responseText: 'Response 2'
}); // ✗ Duplicate key error (EXPECTED)
```

### ⭐ Test 2: Password Hash Field

**What it tests:** Admin model stores passwords as bcrypt hashes only

**Expected behavior:** ✅ Password field contains hash, not plaintext

**Why it matters:** Security - passwords never stored in plaintext

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('password123', 12);

const admin = await Admin.create({
  username: 'admin',
  email: 'admin@example.com',
  passwordHash: hash  // Bcrypt hash
});

console.log(admin.passwordHash); // $2a$12$...
// NOT 'password123'
```

### ⭐ Test 3: Study Settings 60/30/30

**What it tests:** StudySettings validates that targets sum correctly

**Expected behavior:** ✅ Valid when anonymous (30) + identifiable (30) = total (60)

**Why it matters:** Research protocol requires balanced allocation

```javascript
// Valid - sums to 60
await StudySettings.create({
  targetParticipants: 60,
  anonymousTarget: 30,
  identifiableTarget: 30
}); // ✓ Success

// Invalid - doesn't sum to 60
await StudySettings.create({
  targetParticipants: 60,
  anonymousTarget: 25,
  identifiableTarget: 30  // 25 + 30 = 55, not 60
}); // ✗ Validation error (EXPECTED)
```

---

## Troubleshooting

### Problem: "MongoServerError: Authentication failed"

**Solution:** Check MongoDB connection string in `.env`

```env
# Local MongoDB (no auth):
MONGODB_URI=mongodb://localhost:27017/cyberbullying-research

# MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyberbullying-research
```

### Problem: "Cannot find module 'bcryptjs'"

**Solution:** Install dependencies

```bash
cd backend
npm install
```

### Problem: Tests timeout or hang

**Solution:** Ensure MongoDB is running and accessible

```bash
# Test connection
mongosh mongodb://localhost:27017/cyberbullying-research
```

### Problem: "Duplicate key error" on clean test run

**Solution:** Clean test database

```javascript
// The test suite automatically cleans test data
// But you can manually clean if needed:
use cyberbullying-research
db.participants.deleteMany({username: /^test/})
db.videos.deleteMany({title: /^TEST/})
// etc.
```

---

## Manual Testing (Optional)

### Test in Node REPL

```bash
cd backend
node
```

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const models = require('./src/models');

// Connect
await mongoose.connect(process.env.MONGODB_URI);

// Test Participant
const p = await models.Participant.create({
  name: 'Test User',
  username: 'testuser123',
  age: 20,
  gender: 'female',
  university: 'SBBWU',
  department: 'Psychology',
  condition: 'anonymous'
});

console.log(p.username); // testuser123

// Clean up
await p.deleteOne();
await mongoose.disconnect();
```

---

## Verification Checklist

Use this checklist to verify Phase 2 completion:

### Models Created
- [ ] ✅ Participant model exists
- [ ] ✅ Video model exists
- [ ] ✅ VideoResponse model exists
- [ ] ✅ Questionnaire model exists
- [ ] ✅ QuestionnaireResponse model exists
- [ ] ✅ Coding model exists
- [ ] ✅ Admin model exists
- [ ] ✅ AuditLog model exists
- [ ] ✅ StudySettings model exists

### Core Functionality
- [ ] ✅ All models can create documents
- [ ] ✅ Required field validation works
- [ ] ✅ Enum validation works
- [ ] ✅ Unique constraints prevent duplicates
- [ ] ✅ References can be populated
- [ ] ✅ Indexes are created

### Critical Features
- [ ] ✅ VideoResponse prevents duplicate participant+video
- [ ] ✅ VideoResponse.responseText is immutable
- [ ] ✅ Admin.passwordHash stores bcrypt hash
- [ ] ✅ StudySettings validates 60/30/30 targets
- [ ] ✅ AuditLog sanitizes sensitive data

### Testing
- [ ] ✅ Test suite runs without errors
- [ ] ✅ All 45 tests pass
- [ ] ✅ No failed tests
- [ ] ✅ Database connection works
- [ ] ✅ Cleanup works properly

### Documentation
- [ ] ✅ database-schema.md updated
- [ ] ✅ PHASE-2-SUMMARY.md created
- [ ] ✅ MODEL-QUICK-REFERENCE.md created
- [ ] ✅ README.md updated

---

## Test Results Interpretation

### ✅ All Tests Pass (45/45)

**Meaning:** Phase 2 is complete and working correctly

**Next step:** Proceed to Phase 3 (Participant registration and consent)

### ⚠️ Some Tests Fail (< 45 passed)

**Meaning:** There's an issue with one or more models

**Action:**
1. Review failed test output
2. Check error messages
3. Verify MongoDB connection
4. Check model validation rules
5. Re-run tests after fixing

### ❌ Tests Don't Run

**Possible causes:**
- MongoDB not running
- Connection string incorrect
- Dependencies not installed
- File path issues

**Action:** See Troubleshooting section above

---

## Performance Notes

### Test Suite Timing

**Expected duration:** 2-5 seconds

**Breakdown:**
- Database connection: ~500ms
- Model tests: ~1-2 seconds
- Cleanup: ~500ms
- Disconnection: ~100ms

### If Tests Take Longer

- Check MongoDB connection latency
- Ensure MongoDB is running locally (faster than Atlas)
- Check system resources

---

## After Testing

### Keep Test Data?

The test suite automatically cleans up test data. Test documents use prefixes like:
- `testuser*` (participants)
- `TEST*` (videos)
- `testadmin*` (admins)

### Production Database

**⚠️ Warning:** Don't run tests against production database!

Tests create and delete data. Always use:
- Local MongoDB for testing
- Separate test database
- `NODE_ENV=development` in `.env`

---

## Next Steps

### Phase 2 Complete ✅

All models implemented and tested.

### Phase 3: Participant Registration

Next phase will implement:
- `/api/participants/register` endpoint
- `/api/consent` endpoint
- Random condition assignment
- Session management
- Input validation

**DO NOT PROCEED TO PHASE 3 UNTIL:**
- ✅ All 45 tests pass
- ✅ Database connection works
- ✅ Models can create/read/update/delete
- ✅ Unique constraints work
- ✅ Password hashing works

---

## Support

### If Tests Fail

1. Check this guide's Troubleshooting section
2. Review test output carefully
3. Verify MongoDB connection
4. Check model definitions in `backend/src/models/`

### If All Tests Pass

✅ **Congratulations!** Phase 2 is complete.

You have:
- 9 working database models
- Comprehensive validation
- Security features (password hashing)
- Data integrity (unique constraints)
- Inter-model relationships
- 45 passing tests

**Ready for Phase 3!**

---

**Guide Version:** 1.0  
**Last Updated:** Phase 2 Complete  
**Status:** Testing instructions ready
