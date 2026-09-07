# Phase 5 Quick Start Guide
## Video Response Experiment System

---

## Prerequisites

Before testing Phase 5, ensure:
1. ✅ Phase 1-4 completed
2. ✅ MongoDB running
3. ✅ Backend dependencies installed
4. ✅ Frontend dependencies installed
5. ✅ At least 10 approved active videos in database

---

## Setup Test Videos

### Option 1: Run Test Script (Creates Test Videos)
```bash
cd backend
node src/tests/test-experiment.js
```

This creates 10 test videos automatically.

### Option 2: Manual Video Creation (MongoDB Compass/Shell)

```javascript
// Connect to your database
use cyberbullying-research

// Create 10 test videos
for (let i = 1; i <= 10; i++) {
  db.videos.insertOne({
    title: `Scenario ${i}: Online Interaction`,
    topic: `Topic ${i}`,
    description: `This video depicts an ethically ambiguous online interaction for participant response.`,
    videoUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
    duration: 35,
    order: i,
    active: true,
    validationStatus: 'approved',
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// Verify
db.videos.find({ active: true, validationStatus: 'approved' }).count()
// Should return 10
```

**Note:** Using Big Buck Bunny sample video for testing. Replace with actual research videos before deployment.

---

## Start Backend

```bash
cd backend
npm run dev
```

**Expected Output:**
```
✓ MongoDB connected successfully
Database: cyberbullying-research
✓ Server running on port 5000
Environment: development
```

---

## Start Frontend

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
✓ Ready in X ms
```

---

## Testing Flow

### Complete Participant Flow (Start to Finish)

#### 1. Navigate to Application
```
http://localhost:3000
```

#### 2. Complete Phases 1-4
- ✅ Study Information
- ✅ Consent Form
- ✅ Registration
- ✅ View Condition Assignment

#### 3. Start Experiment
**Dashboard → "Start Experiment" button**

**URL:** `http://localhost:3000/experiment/start`

**What to Check:**
- [ ] Instructions load correctly
- [ ] Time estimate displayed
- [ ] Important notes visible
- [ ] "Start Experiment" button works

**Action:** Click "Start Experiment"

---

#### 4. Video 1 Page
**URL:** `http://localhost:3000/experiment`

**What to Check:**
- [ ] Identity notice at top (Unknown User or actual name)
- [ ] Progress bar shows "0/10 completed"
- [ ] Video title displays
- [ ] Video player loads
- [ ] Video plays (if URL valid)
- [ ] Response instructions visible
- [ ] Textarea enabled
- [ ] Character/word count updates
- [ ] Submit button disabled until minimum length

**Actions:**
1. Watch video (or part of it)
2. Type response: "This video shows an interesting interaction. I think the behavior displayed could be considered inappropriate. The context makes it somewhat unclear."
3. Verify word count updates
4. Click "Submit Response & Continue"

**Expected:** Advances to Video 2

---

#### 5. Video 2-9 Pages
**Repeat for each video:**
- [ ] Progress bar updates (1/10, 2/10, etc.)
- [ ] New video loads
- [ ] Can submit response
- [ ] Advances automatically

**Test Scenarios:**

**Refresh Test:**
1. On Video 5, type partial response
2. Refresh page (F5)
3. **Expected:** Returns to Video 5, textarea cleared, progress preserved

**Empty Response Test:**
1. Try to submit empty response
2. **Expected:** Submit button disabled

**Short Response Test:**
1. Type "Too short"
2. **Expected:** Error message or button disabled

**Browser Close Test:**
1. Close browser on Video 6
2. Reopen and navigate to `/experiment`
3. **Expected:** Resumes at Video 6

---

#### 6. Video 10 (Final Video)
**What to Check:**
- [ ] Progress shows "9/10 completed"
- [ ] Submit button says "Submit Response" (no "& Continue")
- [ ] After submission, redirected to completion screen

---

#### 7. Completion Screen
**URL:** `http://localhost:3000/experiment`

**What to Check:**
- [ ] "All Videos Completed!" message
- [ ] Success indicator (checkmark)
- [ ] "Continue to Next Phase" button
- [ ] Clicking button goes to `/experiment/complete`

---

#### 8. Finalize Completion
**URL:** `http://localhost:3000/experiment/complete`

**What to Check:**
- [ ] Progress summary shows 10/10
- [ ] "Complete Experiment & Continue" button
- [ ] After clicking, shows success message
- [ ] Link to dashboard or questionnaires

---

## API Testing (Postman/cURL)

### 1. Start Experiment
```bash
curl -X POST http://localhost:5000/api/experiment/start \
  -H "Cookie: participantSession=<your_session_cookie>" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Experiment started successfully",
  "data": {
    "startedAt": "2024-01-15T10:00:00.000Z",
    "totalVideos": 10
  }
}
```

---

### 2. Get Current Video
```bash
curl http://localhost:5000/api/experiment/current \
  -H "Cookie: participantSession=<your_session_cookie>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "video": {
      "id": "...",
      "title": "Scenario 1: Online Interaction",
      "description": "...",
      "videoUrl": "https://...",
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

---

### 3. Submit Response
```bash
curl -X POST http://localhost:5000/api/experiment/respond \
  -H "Cookie: participantSession=<your_session_cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "responseText": "This is my test response with enough characters to pass validation requirements.",
    "responseTime": 45
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Response submitted successfully",
  "data": {
    "responseId": "...",
    "completed": 1,
    "total": 10,
    "allCompleted": false,
    "nextVideo": "..."
  }
}
```

---

### 4. Get Progress
```bash
curl http://localhost:5000/api/experiment/progress \
  -H "Cookie: participantSession=<your_session_cookie>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "experimentStarted": true,
    "startedAt": "2024-01-15T10:00:00.000Z",
    "completed": 1,
    "total": 10,
    "percentage": 10,
    "allCompleted": false,
    "currentVideo": {
      "id": "...",
      "title": "Scenario 2: Online Interaction",
      "order": 2
    },
    "condition": "anonymous",
    "displayName": "Unknown User"
  }
}
```

---

### 5. Complete Experiment
```bash
curl -X POST http://localhost:5000/api/experiment/complete \
  -H "Cookie: participantSession=<your_session_cookie>" \
  -H "Content-Type: application/json"
```

**Expected Response (if all videos completed):**
```json
{
  "success": true,
  "message": "Experiment completed successfully",
  "data": {
    "completedAt": "2024-01-15T10:30:00.000Z",
    "videosCompleted": 10,
    "nextStep": "questionnaires"
  }
}
```

**Expected Error (if not all completed):**
```json
{
  "success": false,
  "message": "All videos must be completed before finishing",
  "data": {
    "completed": 5,
    "total": 10,
    "remaining": 5
  }
}
```

---

## Database Verification

### Check Videos
```javascript
// MongoDB Shell or Compass
db.videos.find({ 
  active: true, 
  validationStatus: 'approved' 
}).sort({ order: 1 })

// Should return 10 videos ordered 1-10
```

### Check Participant Progress
```javascript
db.participants.findOne(
  { username: "your_test_username" },
  { 
    experimentStartedAt: 1,
    currentVideo: 1,
    completedVideos: 1,
    completedAt: 1
  }
)

// Should show:
// - experimentStartedAt: Date
// - currentVideo: ObjectId or null
// - completedVideos: Array of ObjectIds
// - completedAt: Date (if finished)
```

### Check Responses
```javascript
db.videoresponses.find({ 
  participant: ObjectId("...") 
}).sort({ submittedAt: 1 })

// Should show all submitted responses
// Each response has:
// - participant, video, responseText (immutable)
// - responseLength, responseWordCount
// - responseTime, submittedAt
```

### Check Audit Logs
```javascript
db.auditlogs.find({ 
  category: 'experiment' 
}).sort({ createdAt: -1 }).limit(10)

// Should show:
// - experiment_started
// - video_response_submitted (for each response)
// - experiment_completed
```

---

## Security Testing

### Test 1: Skip Video Attempt
```bash
# Try to get video 5 when on video 2
curl http://localhost:5000/api/experiment/current \
  -H "Cookie: participantSession=<your_session_cookie>"

# Should return current video (2), not requested video (5)
```

### Test 2: Duplicate Response
```bash
# Submit response twice for same video
curl -X POST http://localhost:5000/api/experiment/respond \
  -H "Cookie: participantSession=<your_session_cookie>" \
  -H "Content-Type: application/json" \
  -d '{"responseText": "First submission", "responseTime": 30}'

# Wait, then submit again
curl -X POST http://localhost:5000/api/experiment/respond \
  -H "Cookie: participantSession=<your_session_cookie>" \
  -H "Content-Type: application/json" \
  -d '{"responseText": "Duplicate attempt", "responseTime": 35}'

# Should succeed (idempotent) or return 409 Conflict
```

### Test 3: Anonymous Identity Check
```bash
# As anonymous participant, check current video
curl http://localhost:5000/api/experiment/current \
  -H "Cookie: participantSession=<your_session_cookie>"

# Response should include:
# "displayName": "Unknown User"
# NOT the real name
```

---

## Common Issues

### Issue: "No approved videos available"
**Cause:** No videos with `active: true` AND `validationStatus: 'approved'`

**Fix:**
```javascript
// Update videos to approved active
db.videos.updateMany(
  {},
  { 
    $set: { 
      active: true, 
      validationStatus: 'approved' 
    } 
  }
)
```

---

### Issue: Video player shows "Video Unavailable"
**Cause:** Invalid videoUrl

**Fix:** Use valid test video URL:
```javascript
db.videos.updateMany(
  {},
  { 
    $set: { 
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    } 
  }
)
```

---

### Issue: "Experiment not started"
**Cause:** Participant hasn't called start experiment endpoint

**Fix:** Visit `/experiment/start` page and click "Start Experiment"

---

### Issue: Progress not updating
**Cause:** Frontend caching or state issue

**Fix:** Refresh page or check network tab for API responses

---

## Performance Notes

- Each video page makes 1 API call to `/api/experiment/current`
- Response submission makes 1 API call to `/api/experiment/respond`
- Progress bar data comes from current video response
- No polling - only loads on page mount and after submission

---

## Next Steps

After testing Phase 5:
1. ✅ Verify all 10 videos load
2. ✅ Verify sequential enforcement
3. ✅ Verify responses stored correctly
4. ✅ Verify identity display (anonymous/identifiable)
5. ✅ Verify refresh recovery
6. ✅ Verify completion flow
7. 🔜 Proceed to Phase 6: Questionnaires

---

**Phase 5 Testing Status:** Ready for comprehensive testing
