# Phase 5 Implementation Summary
## Video Response Experiment System

**Status:** ✅ Complete  
**Date:** Phase 5 Implementation  
**Components:** Experiment Controller, Video Playback, Response Collection, State Management

---

## Overview

Phase 5 implements the complete video-based experiment system where participants watch 10 short video scenarios and provide text responses. The system enforces sequential completion, prevents skipping, handles technical failures gracefully, and maintains proper identity display based on experimental condition.

---

## Key Features Implemented

### 1. Experiment Controller (`backend/src/controllers/experimentController.js`)

**Five Core Endpoints:**

#### `POST /api/experiment/start`
- Initializes experiment session (idempotent)
- Verifies consent and condition assignment
- Sets first video as current
- Logs experiment start in audit trail
- Returns experiment metadata

#### `GET /api/experiment/current`
- Returns current video participant should complete
- Enforces sequential order - backend determines video
- Checks for existing response (handles refresh)
- Returns display name based on condition
- Provides progress information

#### `POST /api/experiment/respond`
- Submits participant response for current video
- Validates response text (10-5000 characters)
- Prevents duplicate submissions (idempotent)
- Advances to next video automatically
- Records response time
- Logs submission in audit trail

#### `GET /api/experiment/progress`
- Returns current participant progress
- Shows completed/total videos
- Percentage completion
- Current video information
- Condition and display name

#### `POST /api/experiment/complete`
- Finalizes experiment participation
- Verifies all videos completed
- Verifies all responses submitted
- Transitions to questionnaires
- Idempotent operation

---

### 2. Video Eligibility & Ordering

**Only Approved Active Videos:**
```javascript
Video.getApprovedActive() // Returns videos where:
// active === true
// validationStatus === 'approved'
// sorted by order field
```

**Sequential Enforcement:**
- Backend maintains `currentVideo` pointer in Participant
- Frontend cannot request arbitrary videos
- Direct API manipulation blocked
- URL manipulation blocked
- Videos served strictly by order field (1, 2, 3... 10)

---

### 3. State Machine Implementation

**Participant Flow:**
```
REGISTERED → CONSENTED → ASSIGNED → CONDITION_NOTICE → 
EXPERIMENT_START → VIDEO_1 → VIDEO_2 → ... → VIDEO_10 → 
EXPERIMENT_COMPLETE → QUESTIONNAIRES
```

**State Tracking Fields (Participant model):**
- `experimentStartedAt: Date` - When experiment began
- `currentVideo: ObjectId` - Current video to complete
- `completedVideos: [ObjectId]` - Array of completed video IDs
- `completedAt: Date` - When experiment finished
- `status: String` - Overall participant status

**State Validation:**
- Cannot start without consent
- Cannot start without condition assignment
- Cannot submit response without starting experiment
- Cannot complete without all videos done
- Cannot complete without all responses submitted

---

### 4. Response Submission & Idempotency

**Duplicate Prevention:**
```javascript
// Compound unique index on VideoResponse
{ participant: 1, video: 1 }, { unique: true }
```

**Idempotency Handling:**
- Check for existing response before creating
- If exists, return success (don't create duplicate)
- Handles: double-clicks, slow network, browser retry, API retry
- Race conditions caught by unique index (returns 409 Conflict)

**Response Immutability:**
```javascript
responseText: {
  type: String,
  immutable: true // Mongoose prevents updates
}
```

---

### 5. Anonymous vs Identifiable Display

**Backend Logic (`conditionController.getDisplayName()`):**
```javascript
if (participant.condition === 'anonymous') {
  return 'Unknown User';
}
return participant.name;
```

**Frontend Display:**
- **Anonymous:** Shows "Unknown User" throughout experiment
- **Identifiable:** Shows actual participant name
- Notice displayed on every video page
- Identity preserved in all API responses

**Response Storage:**
```javascript
// VideoResponse does NOT store displayName
// Display name derived dynamically from condition
// Ensures consistency even if condition logic changes
```

---

### 6. Video Playback & Error Handling

**Video Player Features:**
- HTML5 video element with controls
- Supports MP4 format
- Responsive 16:9 aspect ratio
- Error handling with retry option
- Loading states

**Error Scenarios Handled:**
- Video URL unavailable
- Network interruption during playback
- Video file not found
- Unsupported format
- Slow buffering

**User-Friendly Messages:**
- "Video Unavailable" with contact info
- Retry button
- No stack traces exposed
- Graceful degradation

---

### 7. Progress Tracking

**Real-Time Progress Bar:**
- Visual indicator on every video page
- "X of 10 completed"
- Percentage completion
- Color-coded (blue for current, green for completed)

**Progress Data:**
```javascript
{
  current: 3,        // Current video number
  total: 10,         // Total videos
  completed: 2,      // Videos completed
  hasResponse: false // If current video has response
}
```

---

### 8. Refresh & Recovery

**Session Persistence:**
- Participant state stored in database
- Session cookie maintains authentication
- Refresh loads current state from DB
- Returns to correct video
- No duplicate responses created

**Browser Close/Reopen:**
- Valid session survives browser close
- Can resume from where they left off
- Completed videos remain completed
- Submitted responses preserved

---

### 9. Response Validation

**Frontend Validation:**
- Minimum 10 characters
- Maximum 5000 characters
- Cannot be empty or whitespace only
- Real-time character/word count
- Submit button disabled until valid

**Backend Validation:**
- express-validator checks
- Trim whitespace
- Length validation
- Type checking
- Returns user-friendly errors

**Guidance:**
- "Please provide your genuine reaction or opinion"
- "Write 2-4 sentences describing your thoughts"
- Word count display
- Character count display

---

### 10. Experiment Routes

**Security:**
- All routes require `authenticateParticipant`
- All routes require `requireConsent` (except progress)
- Validation middleware on submission
- Rate limiting inherited from global middleware

**Route Structure:**
```
POST   /api/experiment/start      - Start experiment
GET    /api/experiment/current    - Get current video
POST   /api/experiment/respond    - Submit response
GET    /api/experiment/progress   - Get progress
POST   /api/experiment/complete   - Complete experiment
```

---

## Frontend Implementation

### 1. Experiment Start Page (`/experiment/start`)

**Features:**
- Detailed instructions
- Time estimate (10-15 minutes)
- Important notes and guidelines
- Start button
- Contact information placeholder

**Flow:**
- Calls `POST /api/experiment/start`
- Redirects to `/experiment` on success
- Handles errors gracefully

---

### 2. Video Page (`/experiment`)

**Features:**
- Identity notice at top
- Progress bar with percentage
- Video title and description
- HTML5 video player
- Response instructions
- Textarea with validation
- Word/character count
- Submit button
- Help section

**State Management:**
- Loads current video on mount
- Tracks response time
- Prevents duplicate submissions
- Handles video errors
- Shows completion screen when done

**Validation:**
- Real-time character count
- Word count display
- Min 10 characters to submit
- Max 5000 characters
- Submit button state management

---

### 3. Complete Page (`/experiment/complete`)

**Features:**
- Progress summary
- Completion confirmation
- Next steps information
- Complete experiment button
- Success message after completion

**Flow:**
- Checks if all videos completed
- Redirects to `/experiment` if not done
- Calls `POST /api/experiment/complete`
- Shows success and next steps
- Links to dashboard (questionnaires not yet implemented)

---

## Security & Validation

### Server-Side Enforcement

✅ **Backend controls current video**
- Frontend cannot specify which video to view
- URL manipulation blocked
- API calls checked against current video

✅ **Response immutability**
- Cannot edit after submission
- Mongoose immutable field
- No update endpoints provided

✅ **Sequential completion enforced**
- Cannot skip videos
- Must complete in order 1→10
- Backend validates state transitions

✅ **Duplicate prevention**
- Unique index on participant+video
- Idempotent submission endpoint
- Race condition handling

---

### Identity Protection

✅ **Anonymous participants**
- Real name never in response APIs
- "Unknown User" displayed consistently
- Notice on every page
- Server-side display name generation

✅ **Identifiable participants**
- Actual name displayed
- Consistent across all pages
- Clear notice about visible identity

---

## Database Schema

### VideoResponse Collection
```javascript
{
  participant: ObjectId,          // ref: Participant
  video: ObjectId,                // ref: Video
  responseText: String,           // immutable
  responseLength: Number,         // auto-calculated
  responseWordCount: Number,      // auto-calculated
  responseTime: Number,           // seconds taken
  submittedAt: Date,              // auto, immutable
  createdAt: Date,                // auto
  updatedAt: Date                 // auto
}

// Indexes:
{ participant: 1, video: 1 } UNIQUE
{ submittedAt: -1 }
{ participant: 1 }
{ video: 1 }
```

### Participant Updates (Experiment Fields)
```javascript
{
  currentVideo: ObjectId,         // Current video ref
  completedVideos: [ObjectId],    // Completed video refs
  experimentStartedAt: Date,      // Start timestamp
  completedAt: Date,              // Completion timestamp
  status: String                  // active/completed/incomplete/withdrawn
}
```

---

## Error Handling

### Participant-Facing Errors

**Video Unavailable:**
```
"Video Unavailable
Unable to load video. Please contact the research team.
[Retry Button]"
```

**Response Validation:**
```
"Please provide a more detailed response (at least 10 characters)"
```

**Network Error:**
```
"Failed to submit response. Please try again."
```

**Duplicate Submission:**
```
Silently handled - response already exists, proceed to next video
```

---

### Technical Errors (Backend Logs)

- Duplicate response attempts logged
- Video loading failures logged
- State transition errors logged
- All submissions logged in AuditLog
- No sensitive data in error responses

---

## API Response Examples

### GET /api/experiment/current (Success)
```json
{
  "success": true,
  "data": {
    "video": {
      "id": "507f1f77bcf86cd799439011",
      "title": "Online Interaction Scenario 1",
      "description": "A conversation thread with ambiguous behavior",
      "videoUrl": "https://example.com/videos/scenario1.mp4",
      "duration": 35,
      "order": 1
    },
    "progress": {
      "current": 1,
      "total": 10,
      "completed": 0,
      "hasResponse": false
    },
    "displayName": "Unknown User",
    "condition": "anonymous",
    "notice": "You are participating anonymously..."
  }
}
```

### POST /api/experiment/respond (Success)
```json
{
  "success": true,
  "message": "Response submitted successfully",
  "data": {
    "responseId": "507f1f77bcf86cd799439012",
    "completed": 1,
    "total": 10,
    "allCompleted": false,
    "nextVideo": "507f1f77bcf86cd799439013"
  }
}
```

### GET /api/experiment/progress (Success)
```json
{
  "success": true,
  "data": {
    "experimentStarted": true,
    "startedAt": "2024-01-15T10:30:00.000Z",
    "completed": 3,
    "total": 10,
    "percentage": 30,
    "allCompleted": false,
    "currentVideo": {
      "id": "507f1f77bcf86cd799439014",
      "title": "Scenario 4",
      "order": 4
    },
    "condition": "anonymous",
    "displayName": "Unknown User"
  }
}
```

---

## Testing Checklist

### Backend Testing
- [ ] Start experiment endpoint
- [ ] Get current video endpoint
- [ ] Submit response endpoint
- [ ] Progress endpoint
- [ ] Complete experiment endpoint
- [ ] Idempotent operations
- [ ] Duplicate response prevention
- [ ] Sequential enforcement
- [ ] Anonymous identity preservation
- [ ] Identifiable identity display

### Frontend Testing
- [ ] Start page loads
- [ ] Instructions clear
- [ ] Start button works
- [ ] Video page loads
- [ ] Identity notice displays
- [ ] Progress bar updates
- [ ] Video plays
- [ ] Video error handling
- [ ] Response validation
- [ ] Character/word count
- [ ] Submit response
- [ ] Advance to next video
- [ ] Complete screen
- [ ] Completion flow

### Integration Testing
- [ ] Full 10-video flow (anonymous)
- [ ] Full 10-video flow (identifiable)
- [ ] Refresh during experiment
- [ ] Browser close/reopen
- [ ] Double-click submit
- [ ] Network interruption
- [ ] Duplicate API calls
- [ ] Direct URL manipulation
- [ ] Skip video attempt
- [ ] Response immutability

---

## Acceptance Criteria

✅ **Exactly 10 videos** - Configurable via Video model  
✅ **Correct order** - Enforced by order field, backend controlled  
✅ **Approved/active filtering** - Only approved active videos shown  
✅ **Video loading** - HTML5 player with controls  
✅ **Video failure handling** - Error state with retry  
✅ **Start experiment** - Idempotent initialization  
✅ **Current video** - Backend determines, not frontend  
✅ **Response submission** - Validates, stores, advances  
✅ **2-4 sentence guidance** - Instructions and word count  
✅ **Empty response handling** - Validation prevents submission  
✅ **Duplicate click** - Prevented by idempotency  
✅ **Duplicate API request** - Handled gracefully  
✅ **Network timeout** - Error handling with retry  
✅ **Idempotent retry** - Safe to retry operations  
✅ **One response/video** - Unique index enforces  
✅ **No skipping** - Sequential enforcement  
✅ **Direct URL manipulation** - Blocked by backend  
✅ **Direct API manipulation** - Validated by backend  
✅ **Refresh** - State preserved, resume correct video  
✅ **Browser close/reopen** - Session survives  
✅ **Anonymous display** - "Unknown User" throughout  
✅ **Identifiable display** - Actual name throughout  
✅ **Progress tracking** - Real-time progress bar  
✅ **Final completion** - All checks before complete  
✅ **Transition to questionnaires** - Next phase placeholder  

---

## Files Created

### Backend
- `backend/src/controllers/experimentController.js` - Core experiment logic
- `backend/src/routes/experiment.js` - API routes
- `backend/src/validators/experimentValidators.js` - Request validation

### Frontend
- `frontend/app/experiment/page.tsx` - Main video experiment page
- `frontend/app/experiment/start/page.tsx` - Instructions and start
- `frontend/app/experiment/complete/page.tsx` - Completion screen

### Documentation
- `PHASE-5-SUMMARY.md` - This file

---

## Files Modified

### Backend
- `backend/src/routes/index.js` - Added experiment routes

### Frontend
- `frontend/types/index.ts` - Added experiment types
- `frontend/lib/api.ts` - Added experiment endpoints
- `frontend/app/participant/page.tsx` - Added experiment button

---

## Next Phase

**Phase 6: Psychological Questionnaires**
- Questionnaire display system
- Response collection
- Progress tracking
- Scoring and subscales
- Validation and required fields
- Final debriefing

---

## Important Notes

**[REQUIRES RESEARCHER APPROVAL]**

1. **Video Stimuli:** No videos are hardcoded. Researchers must upload and approve videos through admin interface (Phase 7).

2. **Response Instructions:** Currently uses neutral instruction "Please provide your genuine reaction or opinion." Verify this matches research protocol.

3. **Response Length:** Suggested 2-4 sentences. Minimum 10 characters enforced. Verify these match protocol requirements.

4. **Video Order:** Videos served by `order` field. Confirm protocol doesn't require randomization.

5. **Contact Information:** Placeholder text used. Must be replaced with actual researcher contact before deployment.

6. **Debriefing:** Not included in Phase 5. Will be implemented with questionnaires in Phase 6.

---

**Phase 5 Status:** ✅ **COMPLETE**  
**Ready for:** Testing and Phase 6 implementation
