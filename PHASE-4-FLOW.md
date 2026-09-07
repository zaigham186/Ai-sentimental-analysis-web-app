# Phase 4 Assignment Flow Diagram

## Registration & Assignment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        PARTICIPANT FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. Study Information Page
         │
         ▼
2. Consent Form
   ├─ Consent recorded in cookie
   │
         ▼
3. Registration Form
   ├─ Name: Test User
   ├─ Username: testuser1
   ├─ Age: 25
   ├─ Gender: Male
   ├─ University: SBBWU
   ├─ Department: Computer Science
   │
   └─▶ POST /api/participants/register
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND ASSIGNMENT FLOW                      │
└─────────────────────────────────────────────────────────────────┘

participantController.registerParticipant()
│
├─ 1. Validate consent cookie
├─ 2. Check username availability
├─ 3. Load StudySettings
├─ 4. Check capacity (canAcceptParticipant)
│
├─ 5. Create Participant (WITHOUT condition)
│     ├─ name, username, age, gender, etc.
│     └─ condition: undefined (assigned next)
│
├─ 6. Call assignmentService.assignCondition()
│     │
│     ▼
│  assignmentService.assignCondition()
│     │
│     ├─ Check if already assigned → Error if true
│     ├─ Check study accepting participants
│     ├─ Check study not locked
│     │
│     ├─ Get next condition (balanced allocation)
│     │   │
│     │   ▼
│     │  StudySettings.getNextCondition()
│     │   │
│     │   ├─ Calculate anonymous ratio: 15/30 = 0.50
│     │   ├─ Calculate identifiable ratio: 10/30 = 0.33
│     │   └─ Return: 'identifiable' (lower ratio)
│     │
│     ├─ Assign condition to participant
│     │   ├─ participant.condition = 'identifiable'
│     │   ├─ participant.conditionAssigned = true
│     │   ├─ participant.assignedAt = Date.now()
│     │   ├─ participant.assignmentVersion = '1.0'
│     │   └─ participant.save()
│     │
│     ├─ Update StudySettings counts
│     │   ├─ currentParticipants++
│     │   └─ identifiableCount++
│     │
│     └─ Log in AuditLog
│         ├─ action: 'condition_assigned'
│         ├─ condition: 'identifiable'
│         ├─ assignmentVersion: '1.0'
│         └─ counts: { anonymous: 15, identifiable: 11 }
│
├─ 7. Create session cookie
├─ 8. Clear consent cookie
└─ 9. Return success (NO _id, NO raw condition)
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND CONTINUES                           │
└─────────────────────────────────────────────────────────────────┘

4. Participant Dashboard
   ├─ Welcome message
   ├─ Profile information
   │
   └─ Study Progress
      ├─ ✓ Consent & Registration
      └─ ✓ Condition Assignment → [View My Condition]
               │
               ▼
5. Click "View My Condition"
   │
   └─▶ GET /api/condition
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CONDITION DISPLAY LOGIC                      │
└─────────────────────────────────────────────────────────────────┘

conditionController.getConditionInfo()
│
├─ 1. Get participant from session
├─ 2. Check conditionAssigned flag
│
├─ 3. Build response based on condition
│     │
│     ├─ IF condition === 'anonymous'
│     │   ├─ displayName: "Unknown User"
│     │   ├─ notice: "You are participating anonymously..."
│     │   └─ HIDE real name from response
│     │
│     └─ IF condition === 'identifiable'
│         ├─ displayName: participant.name
│         └─ notice: "Your identity is visible..."
│
└─ 4. Return: { displayName, condition, notice, assignedAt, version }
      │
      ▼
6. Condition Page Display
   │
   ├─ FOR ANONYMOUS:
   │   ├─ Icon: 🔒
   │   ├─ "Responding as: Unknown User"
   │   ├─ Notice: "You are participating anonymously..."
   │   └─ Metadata: Date, Version, Condition
   │
   └─ FOR IDENTIFIABLE:
       ├─ Icon: 👤
       ├─ "Responding as: Test User"
       ├─ Notice: "Your identity is visible..."
       └─ Metadata: Date, Version, Condition

```

---

## Balanced Allocation Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│            StudySettings.getNextCondition()                      │
└─────────────────────────────────────────────────────────────────┘

Input State:
├─ targetParticipants: 60
├─ anonymousTarget: 30
├─ identifiableTarget: 30
├─ anonymousCount: 15
└─ identifiableCount: 10

Algorithm:
│
├─ Step 1: Check if both conditions available
│   ├─ anonymousCount (15) < anonymousTarget (30) ✓
│   └─ identifiableCount (10) < identifiableTarget (30) ✓
│
├─ Step 2: Calculate ratios
│   ├─ anonymousRatio = 15/30 = 0.50
│   └─ identifiableRatio = 10/30 = 0.33
│
├─ Step 3: Choose condition with lower ratio
│   └─ 0.33 < 0.50 → Choose 'identifiable'
│
└─ Return: 'identifiable'

Result:
├─ New anonymousCount: 15 (unchanged)
├─ New identifiableCount: 11 (incremented)
├─ New anonymousRatio: 15/30 = 0.50
└─ New identifiableRatio: 11/30 = 0.37

Next Assignment:
└─ Will still choose 'identifiable' (0.37 < 0.50)
   Until ratios are balanced again
```

---

## Security: Client Manipulation Prevention

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATTACK SCENARIO 1                             │
│              Client tries to specify condition                   │
└─────────────────────────────────────────────────────────────────┘

Malicious Request:
POST /api/participants/register
{
  "name": "Hacker",
  "username": "hacker1",
  "age": 25,
  "gender": "male",
  "university": "SBBWU",
  "department": "CS",
  "condition": "identifiable"  ← MALICIOUS FIELD
}

Backend Handling:
│
├─ participantController extracts only approved fields
│   const { name, username, age, gender, university, department } = req.body
│   // 'condition' field ignored
│
├─ Creates participant WITHOUT condition
│   await Participant.create({
│     name, username, age, gender, university, department
│     // NO condition field
│   })
│
└─ assignmentService determines condition server-side
    └─ Uses balanced allocation algorithm
    └─ Client input has NO effect

Result: ✅ Attack prevented

┌─────────────────────────────────────────────────────────────────┐
│                    ATTACK SCENARIO 2                             │
│         Client tries to change condition after assignment        │
└─────────────────────────────────────────────────────────────────┘

Malicious Request:
POST /api/condition/change
{ "condition": "identifiable" }

Backend Handling:
│
├─ No such endpoint exists
│   └─ Returns 404 Not Found
│
├─ Even if participant tries assignmentService directly:
│   └─ assignCondition() checks conditionAssigned flag
│       └─ Throws error: "Participant already assigned"
│
└─ Participant model validation:
    └─ condition field is read-only after conditionAssigned = true

Result: ✅ Attack prevented

┌─────────────────────────────────────────────────────────────────┐
│                    ATTACK SCENARIO 3                             │
│         Client tries to manipulate session/cookies               │
└─────────────────────────────────────────────────────────────────┘

Attack Attempt:
├─ Try to modify participantSession cookie
├─ Try to inject different participant ID
└─ Try to switch to different participant

Backend Handling:
│
├─ Cookies are httpOnly
│   └─ JavaScript cannot access or modify
│
├─ authenticateParticipant middleware
│   ├─ Loads participant from database by session ID
│   ├─ Verifies participant exists
│   ├─ Checks status (not withdrawn)
│   └─ Attaches verified participant to request
│
└─ All condition data comes from database
    └─ NOT from client input

Result: ✅ Attack prevented
```

---

## Data Flow: Anonymous vs Identifiable

```
┌─────────────────────────────────────────────────────────────────┐
│                      ANONYMOUS PARTICIPANT                       │
└─────────────────────────────────────────────────────────────────┘

Database:
{
  _id: ObjectId('...'),
  name: "Alice Johnson",        ← Stored (for data matching)
  username: "alice123",
  condition: "anonymous",
  conditionAssigned: true
}

API Response (GET /api/condition):
{
  displayName: "Unknown User",   ← Real name HIDDEN
  condition: "anonymous",
  notice: "You are participating anonymously..."
}

UI Display:
┌─────────────────────────────┐
│   Responding as:             │
│   Unknown User               │ ← Only this shown
│                              │
│   Your responses will be     │
│   stored as "Unknown User"   │
└─────────────────────────────┘

Future Video Response:
{
  participant: ObjectId('...'),
  displayName: "Unknown User",   ← Stored for display
  responseText: "This is mean",
  condition: "anonymous"
}


┌─────────────────────────────────────────────────────────────────┐
│                    IDENTIFIABLE PARTICIPANT                      │
└─────────────────────────────────────────────────────────────────┘

Database:
{
  _id: ObjectId('...'),
  name: "Bob Smith",            ← Stored
  username: "bob456",
  condition: "identifiable",
  conditionAssigned: true
}

API Response (GET /api/condition):
{
  displayName: "Bob Smith",      ← Real name SHOWN
  condition: "identifiable",
  notice: "Your identity is visible..."
}

UI Display:
┌─────────────────────────────┐
│   Responding as:             │
│   Bob Smith                  │ ← Actual name shown
│                              │
│   Your identity is visible   │
│   in your responses          │
└─────────────────────────────┘

Future Video Response:
{
  participant: ObjectId('...'),
  displayName: "Bob Smith",      ← Stored for display
  responseText: "This is mean",
  condition: "identifiable"
}
```

---

## State Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARTICIPANT STATE MACHINE                     │
└─────────────────────────────────────────────────────────────────┘

State: NEW
│
├─ Fields: name, username, age, gender, etc.
├─ condition: undefined
├─ conditionAssigned: false
├─ assignedAt: null
│
└─▶ assignmentService.assignCondition()
      │
      ▼
State: ASSIGNED
│
├─ condition: 'anonymous' | 'identifiable'
├─ conditionAssigned: true ← FLAG SET (immutable)
├─ assignedAt: Date
├─ assignmentVersion: '1.0'
│
└─▶ Participant can now use system
      │
      ▼
State: ACTIVE (with condition)
│
├─ Condition CANNOT change
├─ Attempts to reassign → Error
├─ Refresh → Condition persists
├─ New session → Condition persists
│
└─▶ Future: Complete experiment with assigned identity
```

---

## Integration with Future Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                      PHASE 5: VIDEO EXPERIMENT                   │
└─────────────────────────────────────────────────────────────────┘

Video Response Flow:
│
1. Participant views video
│
2. Response form displays identity
   ├─ Import: getDisplayName() from conditionController
   ├─ IF anonymous → Show "Unknown User"
   └─ IF identifiable → Show actual name
│
3. Participant submits response
   │
   └─▶ POST /api/experiment/response
         {
           videoId: ObjectId,
           responseText: "This is mean",
           // NO condition or displayName from client
         }
│
4. Backend (videoResponseController):
   ├─ Get participant from session
   ├─ Get displayName = getDisplayName(participant)
   ├─ Create VideoResponse
   │   {
   │     participant: participant._id,
   │     video: videoId,
   │     responseText: "This is mean",
   │     displayName: displayName,      ← Server determines
   │     condition: participant.condition
   │   }
   └─ Save response
│
5. Response stored with correct identity
   └─ Anonymous: "Unknown User"
   └─ Identifiable: "Bob Smith"
```

---

**Phase 4 Flow Documentation Complete**
