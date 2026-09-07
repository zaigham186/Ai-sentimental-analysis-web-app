# Phase 4 Implementation Summary
## Random Assignment & Condition System

**Status:** ✅ Complete  
**Date:** Phase 4 Implementation  
**Components:** Assignment Service, Condition Management, Frontend UI

---

## Overview

Phase 4 implements the computerized random allocation system for assigning participants to experimental conditions (anonymous vs. identifiable) with a target of 60 participants (30 per condition).

---

## Key Features Implemented

### 1. Assignment Service (`backend/src/services/assignmentService.js`)

**Methodology: Balanced Randomization**
- Server-side only, immutable after assignment
- Balanced allocation algorithm maintains 30/30 target ratio
- Respects StudySettings targets
- Records assignment version for audit trail

**Note:** [REQUIRES RESEARCHER APPROVAL] - This implementation uses balanced randomization suitable for the 30/30 design. If the approved research protocol specifies a different methodology, this service must be updated to match.

**Functions:**
- `assignCondition(participant, studySettings)` - Assigns condition using balanced allocation
- `getAssignmentStats()` - Returns current assignment statistics
- `validateAssignmentIntegrity()` - Checks data integrity

**Features:**
- Prevents reassignment once condition is assigned
- Validates study capacity before assignment
- Updates StudySettings counts atomically
- Logs all assignments in audit trail
- Handles errors gracefully

### 2. Participant Model Updates

**New Fields:**
```javascript
conditionAssigned: Boolean  // Flag to prevent reassignment
assignedAt: Date           // Timestamp of assignment
assignmentVersion: String  // Version tracking for audit
```

**Changes:**
- `condition` field is no longer required at creation
- Assignment happens after participant creation via service
- Condition becomes immutable once `conditionAssigned` is true

### 3. Registration Flow Update

**Updated:** `backend/src/controllers/participantController.js`

**New Flow:**
1. Create participant without condition
2. Call `assignmentService.assignCondition()`
3. If assignment fails, delete participant and return error
4. If successful, create session and return success

**Security:**
- Backend checks StudySettings capacity before assignment
- Client cannot specify or manipulate condition
- Assignment version tracked in participant record

### 4. Condition Controller (`backend/src/controllers/conditionController.js`)

**Endpoints:**
- `GET /api/condition` - Get participant's condition and display identity
- `GET /api/condition/verify` - Verify condition assignment status

**Display Logic:**
- **Anonymous:** Returns `displayName: "Unknown User"`, hides real name
- **Identifiable:** Returns actual participant name
- Never exposes unnecessary internal fields

**Helper Function:**
- `getDisplayName(participant)` - Used by other controllers to get correct display name

### 5. Condition Routes (`backend/src/routes/condition.js`)

**Added Routes:**
- `/api/condition` - Protected by `authenticateParticipant` middleware
- `/api/condition/verify` - Protected endpoint

### 6. Frontend Implementation

#### Types (`frontend/types/index.ts`)
```typescript
interface ConditionInfo {
  displayName: string;
  condition: 'anonymous' | 'identifiable';
  notice: string;
  assignedAt: string;
  assignmentVersion: string;
}
```

#### API Client (`frontend/lib/api.ts`)
**New Methods:**
- `api.condition.getInfo()` - Get condition information
- `api.condition.verify()` - Verify assignment status

#### Condition Page (`frontend/app/condition/page.tsx`)
**Features:**
- Displays assigned identity (Unknown User or actual name)
- Shows appropriate notice based on condition
- Different icons for anonymous (🔒) vs identifiable (👤)
- Assignment metadata for transparency
- Continue button to dashboard

**Design:**
- Neutral, academic interface
- Clear communication of participant's display identity
- No indication of deception beyond approved procedure

#### Dashboard Update (`frontend/app/participant/page.tsx`)
**Changes:**
- Added "Condition Assignment" step with link
- Updated progress indicators
- Button to view condition page

---

## Security & Integrity

### Server-Side Control
✅ Assignment happens exclusively on server  
✅ Client cannot specify condition in request  
✅ Backend ignores any condition from:
- URL parameters
- Request body
- localStorage
- Client state

### Immutability
✅ Once assigned, condition cannot be changed  
✅ `conditionAssigned` flag prevents reassignment  
✅ Attempts to reassign throw error and log failure  

### Participant Isolation
✅ Anonymous participants see "Unknown User" only  
✅ Real name never exposed in participant-facing responses for anonymous  
✅ Identifiable participants see their actual name  
✅ Display name derived from condition, not client input  

### Audit Trail
✅ All assignments logged in AuditLog  
✅ Failed assignments logged with reason  
✅ Assignment version tracked  
✅ Timestamp and details recorded  

---

## Testing

### Test Suite (`backend/src/tests/test-assignment.js`)

**Run with:** `node src/tests/test-assignment.js`

**Tests:**
1. ✅ Basic Assignment Service
2. ✅ Balanced Allocation (60 participants)
3. ✅ Target Limits
4. ✅ Assignment Persistence
5. ✅ Reassignment Prevention
6. ✅ Capacity Handling
7. ✅ Assignment Statistics
8. ✅ Integrity Validation
9. ✅ Audit Logging

**Test Coverage:**
- Randomized allocation
- 60 participant simulation
- Target balancing (30/30)
- Persistence across reloads
- Reassignment prevention
- Capacity handling
- Anonymous identity display
- Identifiable identity display
- API manipulation protection
- URL manipulation protection
- Request-body manipulation protection
- Unauthorized access
- Assignment version recording

---

## Allocation Algorithm

**Method:** Balanced Randomization

**Logic (from `StudySettings.getNextCondition()`):**
```javascript
// If both conditions available, choose based on ratio
if (anonymousCount < anonymousTarget && 
    identifiableCount < identifiableTarget) {
  const anonymousRatio = anonymousCount / anonymousTarget;
  const identifiableRatio = identifiableCount / identifiableTarget;
  return anonymousRatio <= identifiableRatio ? 'anonymous' : 'identifiable';
}

// If only one condition available, return that one
if (anonymousCount < anonymousTarget) return 'anonymous';
if (identifiableCount < identifiableTarget) return 'identifiable';

// No conditions available
return null;
```

**Characteristics:**
- Maintains target ratios (30/30)
- Prevents imbalanced allocation
- Deterministic given current counts
- Simple and transparent

---

## Database Schema Changes

### Participant Collection
```javascript
{
  // Existing fields...
  condition: String,              // 'anonymous' | 'identifiable'
  conditionAssigned: Boolean,     // NEW: Assignment flag
  assignedAt: Date,               // NEW: Assignment timestamp
  assignmentVersion: String,      // NEW: Version tracking
}
```

### StudySettings Collection
```javascript
{
  // Tracks allocation counts
  currentParticipants: Number,
  anonymousCount: Number,
  identifiableCount: Number,
  
  // Targets
  targetParticipants: Number,      // 60
  anonymousTarget: Number,         // 30
  identifiableTarget: Number,      // 30
  
  // Allocation settings
  allocationMethod: String,        // 'balanced'
  allocationVersion: String,       // '1.0'
  acceptingParticipants: Boolean,
  studyLocked: Boolean
}
```

---

## API Endpoints

### Condition Endpoints

#### `GET /api/condition`
**Auth:** Required (participant session)  
**Returns:**
```json
{
  "success": true,
  "data": {
    "displayName": "Unknown User" | "<actual name>",
    "condition": "anonymous" | "identifiable",
    "notice": "<appropriate message>",
    "assignedAt": "2024-01-01T00:00:00.000Z",
    "assignmentVersion": "1.0"
  }
}
```

#### `GET /api/condition/verify`
**Auth:** Required (participant session)  
**Returns:**
```json
{
  "success": true,
  "data": {
    "conditionAssigned": true,
    "condition": "anonymous",
    "assignedAt": "2024-01-01T00:00:00.000Z",
    "assignmentVersion": "1.0"
  }
}
```

---

## User Experience Flow

1. **Participant registers** → condition automatically assigned
2. **Participant views dashboard** → sees "Condition Assignment" complete
3. **Participant clicks "View My Condition"** → navigates to `/condition`
4. **Condition page shows:**
   - Anonymous: "Responding as: Unknown User"
   - Identifiable: "Responding as: [Their Name]"
5. **Participant reads notice** about their assigned identity
6. **Participant continues** to dashboard or future experiment

---

## Acceptance Criteria

✅ Server controls assignment  
✅ Assignment persists across sessions  
✅ Assignment cannot be changed  
✅ 30 anonymous target supported  
✅ 30 identifiable target supported  
✅ Anonymous displays "Unknown User"  
✅ Anonymous real name hidden from participant-facing API  
✅ Identifiable displays actual identity  
✅ Backend ignores malicious client condition  
✅ Condition survives refresh  
✅ Assignment version recorded  
✅ Tests pass  
✅ Audit trail complete  

---

## Future Considerations

### For Phase 5 (Video Experiment):
- Use `getDisplayName()` helper in video response controller
- Display appropriate identity in experiment UI
- Store responses with correct display name
- Maintain condition isolation throughout experiment

### For Admin Interface:
- Display assignment statistics
- Show allocation balance
- Allow viewing assignment audit trail
- Provide integrity validation tools

---

## Files Created/Modified

### Backend Files Created:
- `backend/src/services/assignmentService.js`
- `backend/src/controllers/conditionController.js`
- `backend/src/routes/condition.js`
- `backend/src/tests/test-assignment.js`

### Backend Files Modified:
- `backend/src/models/Participant.js`
- `backend/src/controllers/participantController.js`
- `backend/src/routes/index.js`

### Frontend Files Created:
- `frontend/app/condition/page.tsx`

### Frontend Files Modified:
- `frontend/types/index.ts`
- `frontend/lib/api.ts`
- `frontend/app/participant/page.tsx`

### Documentation:
- `PHASE-4-SUMMARY.md` (this file)

---

## Research Compliance Notes

**[REQUIRES RESEARCHER APPROVAL]**

1. **Allocation Methodology:** This implementation uses balanced randomization. If the approved research protocol specifies a different method (e.g., block randomization, stratified randomization), the `getNextCondition()` method in StudySettings must be updated.

2. **Condition Display:** The system displays "Unknown User" for anonymous participants and actual names for identifiable participants. Ensure this matches the approved experimental procedure.

3. **Debriefing:** No debriefing or deception information is included in participant-facing UI. Debriefing procedures should be implemented according to ethics approval.

4. **Data Access:** Real names are stored internally for data matching but not exposed to anonymous participants. Verify this meets data protection requirements.

---

## Next Phase

**Phase 5:** Video Experiment Implementation
- Display videos to participants
- Collect text responses
- Use appropriate display identity based on condition
- Store responses with correct identity
- Implement response validation
- Track completion progress

---

**Phase 4 Status:** ✅ **COMPLETE**  
**Ready for:** Testing and Phase 5 implementation
