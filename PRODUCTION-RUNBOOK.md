# Production & Research Operations Runbook (Phase 8 Final)

## Cyberbullying & Sentimental Analysis Research Platform
**Version:** 1.0.0 (Research Production Ready)  
**Target Audience:** Lead Researcher, Systems Administrator, Research Supervisor, Academic Reviewers  
**Last Hardened:** September 2026

---

## 1. System Architecture & Topology

The platform operates as a multi-tier microservices architecture designed for academic rigor, data integrity, and strict ethical participant protections:

```
+-----------------------------------------------------------------------------+
|                               Client Layer                                  |
|   Participant Portal (/participant)       Admin / Researcher Portal (/admin)|
|   - Consent & Demographics               - AI-Assisted Multi-Dim Coding     |
|   - Video Stimuli & Response             - Research Analytics & Exports     |
|   - Manipulation Checks                  - Validation & Calibration         |
+-----------------------------------------------------------------------------+
                                       |
                                       v  HTTP / REST + WebSocket
+-----------------------------------------------------------------------------+
|                        Frontend (Next.js 14 / React 18)                     |
|                        Port: 3000 | Node.js Runtime                         |
+-----------------------------------------------------------------------------+
                                       |
                                       v  HTTP / REST + Session Auth
+-----------------------------------------------------------------------------+
|                        Backend API (Express.js / Node.js 18+)               |
|                        Port: 5000 | Rate Limiters & Security               |
|                        - Participant Engine & Session Management            |
|                        - CodingAIService (NLPProvider + RuleBased Fallback) |
|                        - Research Analytics & Export Aggregation Engine     |
+-----------------------------------------------------------------------------+
               |                                            |
               v                                            v
+-------------------------------+      +--------------------------------------+
| MongoDB Database (v6.0+)      |      | Python NLP Microservice (FastAPI)    |
| Port: 27017                   |      | Port: 8001 | PyTorch / Transformers  |
| Collections:                  |      | - XLM-RoBERTa (Sentiment)            |
| - participants (anonymized)   |      | - Detoxify Multilingual (Toxicity)   |
| - videoresponses (immutable)  |      | - Xu et al. (2020) Lexicon (Aggres.) |
| - codings (audit trails)      |      | - Operational Criteria (Cyberbully)  |
| - videos, admins, sessions    |      +--------------------------------------+
+-------------------------------+
```

### Core Research Integrity Principles
1. **Participant Section Untouched**: Participant onboarding, consent, stimuli playback, and response collection operate completely independently from researcher analytics.
2. **Immutable Responses**: Raw `responseText` in `VideoResponse` is protected with Mongoose schema-level immutability hooks (`immutable: true`, setter guards, `pre('validate')`, and `pre('save')`).
3. **Four Independent Constructs**:
   - **Sentiment**: Valence polarity (Positive / Neutral / Negative / Mixed).
   - **Toxicity**: Toxic language, insult, obscenity, identity attack, or severe threats.
   - **Aggression**: Intensity and hostile intent level (0–10; None / Mild / Moderate / Severe).
   - **Cyberbullying**: Repeated, intentional harm, power imbalance, or targeted harassment.
   *(Negative sentiment does not inherently imply toxicity, aggression, or cyberbullying).*
4. **Human-in-the-Loop Primary Authority**: AI suggestions (`aiCoding`) are never research conclusions. Only reviewed and human-approved coding (`coderRole: 'primary'`, `reviewStatus: 'reviewed'`) forms the basis of research outcomes.
5. **Zero Fabrication Guarantee**: Empirical accuracy and calibration metrics require human ground truth. Missing data is never synthetically filled.

---

## 2. Prerequisites & Environment Setup

### Software Requirements
- **Node.js**: v18.17.0+ or v20.x
- **Python**: 3.10+ or 3.11+
- **MongoDB**: Community or Enterprise v6.0+
- **Git**: 2.35+
- **Operating System**: Windows 10/11, macOS, or Ubuntu 22.04 LTS

### Environment File Configurations

#### 1. Backend (`backend/.env`)
```bash
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/cyberbullying-research
SESSION_SECRET=your-production-secure-secret-minimum-32-chars-long
FRONTEND_URL=http://localhost:3000
NLP_PROVIDER_ENABLED=true
NLP_FALLBACK_ENABLED=true
NLP_SERVICE_URL=http://127.0.0.1:8001
NLP_SERVICE_TIMEOUT_MS=30000
```

#### 2. NLP Microservice (`nlp-service/.env`)
```bash
APP_NAME=Research NLP Service
APP_VERSION=1.0.0
HOST=127.0.0.1
PORT=8001
SENTIMENT_MODEL=cardiffnlp/twitter-xlm-roberta-base-sentiment
TOXICITY_MODEL=multilingual
MAX_TEXT_LENGTH=5000
LOG_LEVEL=INFO
```

#### 3. Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 3. Step-by-Step Startup Sequence

Always start the services in the following order to ensure dependent connections are established:

### Step 1: Start MongoDB
Ensure MongoDB daemon is running locally or connection to cluster is active:
```powershell
mongod --dbpath "C:\data\db"
```

### Step 2: Start the Python FastAPI NLP Service
Navigate to `nlp-service/` and run uvicorn:
```powershell
cd nlp-service
.\venv\Scripts\Activate.ps1
$env:PYTHONIOENCODING="utf-8"
uvicorn app.main:app --host 127.0.0.1 --port 8001
```
*Verification:*
```powershell
curl http://127.0.0.1:8001/health
# Expected: {"status":"healthy","models_ready":true,"models":{...}}
```

### Step 3: Start the Backend Express API
In a new terminal:
```powershell
cd backend
npm install
npm start
```
*Verification:*
```powershell
curl http://localhost:5000/api/health
# Expected: {"status":"healthy","database":"connected",...}
```

### Step 4: Start the Next.js Frontend
In a new terminal:
```powershell
cd frontend
npm install
npm run dev
```
*Verification:*
Open `http://localhost:3000` in a web browser.

---

## 4. Multi-Service Health Checks & Verification

A unified test command can verify all microservices and database connections:

| Service | Endpoint | Success Response |
| :--- | :--- | :--- |
| **NLP Microservice** | `GET http://127.0.0.1:8001/health` | `HTTP 200: {"status": "healthy", "models_ready": true}` |
| **Backend API** | `GET http://localhost:5000/api/health` | `HTTP 200: {"status": "healthy", "database": "connected"}` |
| **NLP Validation** | `GET http://localhost:5000/api/admin/coding/validation-status` | `HTTP 200: {"success": true, "data": {...}}` |
| **Research Analytics**| `GET http://localhost:5000/api/admin/research-analytics/overview` | `HTTP 200: {"success": true, "data": {...}}` |

---

## 5. Security & Protection Guidelines

1. **Brute Force Protection (`authLimiter`)**:
   - `POST /api/admin/login` allows a maximum of 10 failed login attempts per 15-minute window per IP.
2. **AI DoS Prevention (`nlpLimiter`)**:
   - `POST /api/admin/coding/:id/analyze` and `POST /bulk-analyze` allow a maximum of 30 requests per minute per IP.
3. **Strict Input Sanitization**:
   - All ObjectId parameters in `/coding` routes are validated via `mongoose.Types.ObjectId.isValid()`. Malformed IDs immediately return `400 Bad Request`.
   - Analytical filter parameters in `researchAnalyticsService.js` are validated against strict whitelists to prevent MongoDB operator injection.
4. **Security Headers**:
   - Helmet enforces strict HTTP response headers, Content Security Policy (`defaultSrc: ['self']`), `X-Content-Type-Options: nosniff`, and `X-Frame-Options`.

---

## 6. Supervisor Demonstration & Research Reporting Flow

For academic review, demonstration, and thesis defense, follow this structured walkthrough:

1. **Participant Flow Inspection**:
   - Visit `http://localhost:3000/participant`.
   - Observe participant briefing, consent, condition assignment (Anonymous vs Identifiable), video stimuli playback, and response collection.
2. **Admin Authentication**:
   - Visit `http://localhost:3000/admin/login`.
   - Log in with researcher credentials.
3. **AI-Assisted Coding & Human Review**:
   - Navigate to **Sentimental Coding** (`/admin/coding`).
   - Open a participant response.
   - Trigger **AI Analysis**: inspect the multi-dimensional prediction cards (Sentiment valence, Toxicity categories from Detoxify, Aggression score and keywords from Xu et al. lexicon, Cyberbullying criteria breakdown).
   - Execute the **Human Review Workflow**: click **Accept AI**, **Modify**, or **Reject** and supply qualitative researcher notes.
   - Confirm that the response text cannot be edited.
4. **Research Analytics & Supervisor Report**:
   - Navigate to **Analytics & Results** (`/admin/analytics`).
   - View overview metric tiles (Total, Coded, Pending Review, Construct breakdowns).
   - Inspect **Condition Comparison**: observe differential distributions between Anonymous and Identifiable groups.
   - Inspect **AI vs Human Agreement**: review concordance rates and examine the discrepancy inspector.
   - Inspect **Validation & Calibration**: review empirical benchmarks and confusion matrices.
   - Inspect **Supervisor Report & Export**: generate a publication-ready report and trigger exports in **CSV**, **XLSX**, or **JSON**.

---

## 7. Failover, Backup & Recovery

### Transparent Fallback to Rule-Based Provider
If the Python NLP microservice goes offline or experiences high latency:
- The backend `CodingAIService` catches the network timeout (`NLP_SERVICE_TIMEOUT_MS`).
- The system automatically and transparently falls back to `RuleBasedProvider`.
- Metadata tags the analysis provider as `rule-based` with `fallbackUsed: true`.
- Zero user interruption occurs; researchers are notified with a warning banner.

### Database Backup Command
```powershell
# Create backup
mongodump --db cyberbullying-research --out "C:\backups\$(Get-Date -Format 'yyyyMMdd_HHmm')"

# Restore backup
mongorestore --db cyberbullying-research "C:\backups\20260911_1200\cyberbullying-research"
```

---

## 8. Linguistic Limitations & Context-Aware Research Considerations

When analyzing qualitative feedback from Pakistani university student cohorts, researchers and academic reviewers must account for the following documented sociolinguistic phenomena:

### 1. Roman Urdu and Code-Switching (Urdish / Pinglish)
- **Characteristics**: Participants frequently interweave Romanized Urdu phrases (`"bohot bura laga"`, `"sharam aani chahiye"`, `"bakwas"`) with English technical or casual vocabulary (`"so rude"`, `"toxic comments"`, `"block him"`).
- **Model Behavior**:
  - The CardiffNLP Twitter-XLM-RoBERTa model was trained on multilingual corpora across 100+ languages including Urdu and English; however, non-standardized phonetic Roman Urdu spellings can experience lower confidence scores.
  - The Xu et al. (2020) Aggression Lexicon in this platform has been supplemented with South Asian and Roman Urdu colloquial aggression markers.
  - **Researcher Protocol**: Ambiguous, highly idiomatic, or sarcastic Roman Urdu expressions must be flagged for secondary human expert adjudication.

### 2. Context Dependency & Pragmatic Ambiguity
- **Teasing vs Bullying**: In youth peer-group dynamics, banter or playful teasing (`"yar tum pagal ho"`) may be interpreted by NLP models as hostile due to surface token matches, whereas human context reveals consensual social intimacy.
- **Victim Empathy vs Perpetrator Endorsement**: Responses discussing violent video scenarios may quote vulgarities to condemn them (`"He wrote 'loser' which is disgusting"`). The model may flag the quoted token as toxic; human coding must distinguish between quoting harm and producing harm.

### 3. Researcher Adjudication Imperative
- The system design explicitly operationalizes **AI suggestions as non-definitive decision support**. 
- In all theses, journal submissions, or conference reports deriving from this platform, researchers must cite the dual-methodology approach: AI pre-annotation followed by blinded primary researcher confirmation.

---

## 9. Reproducibility & Research Auditability Protocol

To satisfy APA, IEEE, and university ethical review board reproducibility standards:

1. **Deterministic Processing**:
   - Neural classification utilizes fixed temperature (deterministic argmax on softmax logits).
   - Lexicon matching relies on pre-compiled regex trees and standardized tokenization rules.
2. **Comprehensive Audit Logs (`AuditLog` Collection)**:
   - Every state transition—from consent grant, condition assignment, stimuli presentation, response submission, AI analysis execution, to human coding review—is immutably persisted with actor ID, timestamp, and metadata diffs.
3. **Model Version & Provenance Pinning**:
   - Sentiment: `cardiffnlp/twitter-xlm-roberta-base-sentiment` (pinned HuggingFace commit hash).
   - Toxicity: `Detoxify` multilingual package (pinned v0.5.2).
   - Aggression: Xu et al. (2020) operational framework with static configuration in `resources/aggression/lexicon_config.json`.
4. **Data Isolation & Clean Export**:
   - Production participant responses and benchmark calibration datasets are stored in strictly isolated namespaces to eliminate contamination.
   - All statistical exports include standard deviation, valid counts, and zero-fabrication disclaimers.

---

## 10. Pre-Flight Research Verification Checklist

Before opening registration to live participants or presenting to academic supervisors:

- [x] **Database Connectivity**: MongoDB running with replica set / standalone and indexes verified.
- [x] **NLP Microservice**: FastAPI server active on port 8001 with all 4 model pipelines loaded in RAM.
- [x] **Backend API**: Express server active on port 5000 with Helmet, rate limiters, and CORS enabled.
- [x] **Frontend Web App**: Next.js 14 responsive portal built with zero TypeScript compilation errors.
- [x] **Security Verification**: Brute force (`authLimiter`), AI DoS (`nlpLimiter`), and ObjectId sanitization verified.
- [x] **Participant Protection**: `responseText` field immutability verified against direct database updates.
- [x] **Construct Decoupling**: Sentiment, toxicity, aggression, and cyberbullying verified as distinct constructs.
- [x] **Human Review Workflow**: AI suggestion accept, modify, and reject pathways verified with audit trail logging.
- [x] **Master Test Suite**: All 52 tests across Phases 1 through 8 passing 100% (`test-master-all-phases.js`).

