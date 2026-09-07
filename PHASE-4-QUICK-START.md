# Phase 4 Quick Start Guide
## Random Assignment & Condition System

---

## Testing the Assignment System

### 1. Start the Backend

```bash
cd backend
npm start
```

The server should start on `http://localhost:5000`

### 2. Run Assignment Tests

```bash
cd backend
node src/tests/test-assignment.js
```

**Expected Output:**
- ✓ Basic Assignment Service
- ✓ Balanced Allocation (60 participants)
- ✓ Target Limits
- ✓ Assignment Persistence
- ✓ Reassignment Prevention
- ✓ Capacity Handling
- ✓ Assignment Statistics
- ✓ Integrity Validation
- ✓ Audit Logging
- ✅ All tests passed!

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend should start on `http://localhost:3000`

---

## Manual Testing Flow

### Test Anonymous Condition

1. Navigate to `http://localhost:3000`
2. Click "Get Started" → Study Information
3. Complete Consent Form
4. Register as Participant:
   - Name: Test Anonymous User
   - Username: testanon1
   - Age: 25
   - Gender: Male
   - University: SBBWU
   - Department: Computer Science
5. After registration → View Dashboard
6. Click "View My Condition"
7. **Verify:** Should see "Responding as: Unknown User"
8. **Verify:** Notice says "You are participating anonymously"

### Test Identifiable Condition

1. Open new incognito/private window
2. Navigate to `http://localhost:3000`
3. Complete consent and register:
   - Name: Test Identifiable User
   - Username: testident1
   - (other fields as above)
4. View Dashboard → Click "View My Condition"
5. **Verify:** Should see "Responding as: Test Identifiable User"
6. **Verify:** Notice says "Your identity is visible"

### Test Assignment Balance

Register 10 participants and check the distribution:

```javascript
// Use this script to check balance
const mongoose = require('mongoose');
const { Participant, StudySettings } = require('./backend/src/models');

async function checkBalance() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const settings = await StudySettings.getSettings();
  console.log('Anonymous:', settings.anonymousCount);
  console.log('Identifiable:', settings.identifiableCount);
  console.log('Total:', settings.currentParticipants);
  
  await mongoose.connection.close();
}

checkBalance();
```

---

## Security Testing

### Test 1: Client Cannot Specify Condition

Try to manipulate registration request:

```javascript
// This should be IGNORED by backend
fetch('http://localhost:5000/api/participants/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    name: 'Hacker',
    username: 'hacker1',
    age: 25,
    gender: 'male',
    university: 'SBBWU',
    department: 'CS',
    condition: 'identifiable' // ← SHOULD BE IGNORED
  })
});
```

**Expected:** Backend assigns condition using balanced allocation, ignores client-provided value.

### Test 2: Cannot Reassign Condition

1. Register and get assigned a condition
2. Try to call assignment service again:

```javascript
const { assignmentService } = require('./backend/src/services/assignmentService');

// Should throw error: "Participant already assigned to a condition"
await assignmentService.assignCondition(participant);
```

**Expected:** Error thrown, condition unchanged.

### Test 3: Session Persistence

1. Register as participant
2. View condition page → note assigned condition
3. Close browser
4. Reopen and navigate to dashboard
5. View condition page again

**Expected:** Same condition displayed, session maintained.

### Test 4: Anonymous Name Not Exposed

Check API response for anonymous participant:

```javascript
// GET /api/condition (as anonymous participant)
// Response should NOT include real name
{
  "displayName": "Unknown User",  // ✓ Correct
  "condition": "anonymous",
  "notice": "You are participating anonymously..."
  // Real name should NOT appear anywhere
}
```

---

## Database Inspection

### Check Participant Assignment

```javascript
// MongoDB Shell or Compass
db.participants.find({}, {
  username: 1,
  condition: 1,
  conditionAssigned: 1,
  assignedAt: 1,
  assignmentVersion: 1
});
```

**Verify:**
- `conditionAssigned: true` for all participants
- `assignedAt` has valid timestamp
- `assignmentVersion` is set

### Check Study Settings

```javascript
db.studysettings.findOne({}, {
  currentParticipants: 1,
  anonymousCount: 1,
  identifiableCount: 1,
  anonymousTarget: 1,
  identifiableTarget: 1
});
```

**Verify:**
- Counts match actual participant records
- Sum of anonymous + identifiable = currentParticipants

### Check Audit Logs

```javascript
db.auditlogs.find({ 
  category: 'assignment' 
}).sort({ createdAt: -1 }).limit(10);
```

**Verify:**
- Each assignment logged
- `success: true` for successful assignments
- Failed assignments logged with error details

---

## Common Issues & Solutions

### Issue: "Study has reached maximum participants"

**Cause:** 60 participants already assigned (30/30 split reached)

**Solution:**
1. Reset study for testing:
```javascript
const { StudySettings } = require('./backend/src/models');
await StudySettings.updateOne({}, {
  currentParticipants: 0,
  anonymousCount: 0,
  identifiableCount: 0
});
```

2. Or delete test participants:
```javascript
await Participant.deleteMany({ username: /^test/ });
```

### Issue: "Condition not yet assigned"

**Cause:** Assignment failed during registration

**Solution:**
1. Check backend logs for error
2. Verify StudySettings has `acceptingParticipants: true`
3. Ensure database connection is active

### Issue: Imbalanced allocation

**Cause:** Manual participant creation bypassed assignment service

**Solution:**
1. Run integrity check:
```javascript
const { validateAssignmentIntegrity } = require('./backend/src/services/assignmentService');
const validation = await validateAssignmentIntegrity();
console.log(validation);
```

2. Fix discrepancies manually or reset

---

## API Endpoints Reference

### Registration (Includes Assignment)
```
POST /api/participants/register
Body: { name, username, age, gender, university, department }
Returns: Participant data (no _id, no condition exposed)
Side Effect: Condition assigned automatically
```

### Get Condition Info
```
GET /api/condition
Auth: Required (participant session)
Returns: { displayName, condition, notice, assignedAt, assignmentVersion }
```

### Verify Assignment
```
GET /api/condition/verify
Auth: Required (participant session)
Returns: { conditionAssigned, condition, assignedAt, assignmentVersion }
```

---

## Environment Setup

### Backend `.env`
```env
MONGODB_URI=mongodb://localhost:27017/cyberbullying-research
PORT=5000
NODE_ENV=development
SESSION_SECRET=your-secret-key
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Next Steps

After testing Phase 4:

1. ✅ Verify all tests pass
2. ✅ Test both conditions manually
3. ✅ Verify security (no client manipulation)
4. ✅ Check audit logs
5. ✅ Validate assignment integrity
6. 🔜 Proceed to Phase 5: Video Experiment

---

## Support

For issues or questions:
- Check `PHASE-4-SUMMARY.md` for detailed documentation
- Review test output: `backend/src/tests/test-assignment.js`
- Inspect database with MongoDB Compass
- Check backend logs for assignment errors

---

**Phase 4 Status:** ✅ Complete and Ready for Testing
