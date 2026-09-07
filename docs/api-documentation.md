# API Documentation

## Base URL
- **Development:** `http://localhost:5000/api`
- **Production:** `https://your-api-domain.com/api`

## Authentication
Most endpoints will require authentication via HTTP-only cookies after Phase 1. Public endpoints do not require authentication.

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Optional success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Optional field-specific errors"]
}
```

## Rate Limiting
- **Default:** 100 requests per 15-minute window per IP
- **Auth endpoints:** 5 attempts per 15-minute window per IP

Rate limit headers:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

## Endpoints

---

## Health

### GET /api/health
Check API health status.

**Authentication:** None

**Response:**
```json
{
  "success": true,
  "message": "Research API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "database": "connected"
}
```

---

## Participants (Phase 2+)

### POST /api/participants/register
Register a new participant.

**Authentication:** None

**Request Body:**
```json
{
  "age": 20,
  "gender": "female",
  "institution": "SBBWU",
  "program": "Psychology",
  "academicYear": "3rd Year",
  "email": "optional@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "participantId": "P0001",
    "condition": "anonymous"
  }
}
```

**Validation:**
- `age`: Required, number, >= 18
- `gender`: Required, string
- `institution`: Required, one of ["SBBWU", "University of Peshawar"]
- `program`: Required, string
- `academicYear`: Required, string
- `email`: Optional, valid email format

---

### GET /api/participants/:id
Get participant profile.

**Authentication:** Required (participant session)

**Parameters:**
- `id`: Participant ID

**Response:**
```json
{
  "success": true,
  "data": {
    "participantId": "P0001",
    "condition": "anonymous",
    "status": "in_progress",
    "progress": {
      "consent": true,
      "experiment": false,
      "questionnaires": false
    }
  }
}
```

---

## Consent (Phase 3+)

### POST /api/consent
Submit informed consent.

**Authentication:** Required (participant session)

**Request Body:**
```json
{
  "participantId": "P0001",
  "agreedToParticipate": true,
  "agreedToDataUse": true,
  "agreedToWithdrawalTerms": true,
  "electronicSignature": "Full Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Consent recorded",
  "data": {
    "consentId": "consent_id",
    "signedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Experiment (Phase 4+)

### POST /api/experiment/start
Start experimental task.

**Authentication:** Required (participant session)

**Request Body:**
```json
{
  "participantId": "P0001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "experimentId": "exp_id",
    "condition": "anonymous",
    "videoUrl": "https://...",
    "instructions": "..."
  }
}
```

---

### POST /api/experiment/response
Submit experimental response.

**Authentication:** Required (participant session)

**Request Body:**
```json
{
  "participantId": "P0001",
  "experimentId": "exp_id",
  "responseText": "Participant's response...",
  "responseTime": 120
}
```

**Response:**
```json
{
  "success": true,
  "message": "Response recorded"
}
```

---

## Questionnaires (Phase 5+)

### GET /api/questionnaires
Get active questionnaires.

**Authentication:** Required (participant session)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "quest_id",
      "name": "Moral Disengagement Scale",
      "shortName": "MD",
      "items": [
        {
          "itemNumber": 1,
          "text": "Question text...",
          "type": "likert",
          "options": ["Strongly Disagree", "Disagree", ...]
        }
      ]
    }
  ]
}
```

---

### POST /api/questionnaires/response
Submit questionnaire response.

**Authentication:** Required (participant session)

**Request Body:**
```json
{
  "participantId": "P0001",
  "questionnaireId": "quest_id",
  "responses": [
    {
      "itemNumber": 1,
      "value": 3,
      "responseTime": 2500
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Questionnaire response recorded",
  "data": {
    "totalScore": 45,
    "subscaleScores": [
      {
        "subscale": "Moral Justification",
        "score": 12
      }
    ]
  }
}
```

---

## Admin (Phase 6+)

### POST /api/admin/login
Admin authentication.

**Authentication:** None

**Request Body:**
```json
{
  "username": "admin",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "adminId": "admin_id",
    "name": "Admin Name",
    "role": "researcher",
    "permissions": ["view_data", "export_data"]
  }
}
```

**Rate Limit:** 5 attempts per 15 minutes

---

### GET /api/admin/participants
List all participants.

**Authentication:** Required (admin session)

**Query Parameters:**
- `status`: Filter by status
- `condition`: Filter by condition
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "participants": [
      {
        "participantId": "P0001",
        "condition": "anonymous",
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "pages": 2
    }
  }
}
```

---

### GET /api/admin/responses
View participant responses for coding.

**Authentication:** Required (admin session with coding permission)

**Query Parameters:**
- `coded`: Filter by coding status (true/false)
- `condition`: Filter by condition

**Response:**
```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "responseId": "resp_id",
        "participantId": "P0001",
        "condition": "anonymous",
        "responseText": "...",
        "aggressionLevel": null,
        "coded": false
      }
    ]
  }
}
```

---

### POST /api/admin/coding
Code a response for aggression.

**Authentication:** Required (admin session with coding permission)

**Request Body:**
```json
{
  "responseId": "resp_id",
  "aggressionLevel": 3,
  "aggressionCategory": "moderate",
  "notes": "Optional coder notes",
  "confidence": "high"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Coding recorded"
}
```

---

### GET /api/admin/export
Export de-identified research data.

**Authentication:** Required (admin session with export permission)

**Query Parameters:**
- `format`: Export format ("csv" | "json" | "spss")
- `includeRaw`: Include raw responses (true/false)

**Response:**
- Content-Type: application/json or text/csv
- Downloads file

---

### GET /api/admin/analytics
Get study analytics and statistics.

**Authentication:** Required (admin session)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalParticipants": 150,
      "completed": 120,
      "inProgress": 25,
      "withdrawn": 5
    },
    "byCondition": {
      "anonymous": 75,
      "identified": 75
    },
    "completionRate": 80,
    "averageTime": 35
  }
}
```

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Common Error Messages

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "Age must be 18 or older",
    "Email format is invalid"
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 429 Rate Limit
```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

**Document Version:** 1.0  
**Phase:** 1 (Health endpoint implemented, others documented for future phases)  
**Last Updated:** Phase 1
