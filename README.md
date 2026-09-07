# Anonymity in Cyberbullying Perpetration Research Platform

## Research Purpose

An Experimental Investigation of Anonymity in Cyberbullying Perpetration and Its Relationship with Moral Disengagement, Empathy, and Pessimistic Thinking.

**Research Institution:** Shaheed Benazir Bhutto Women University (SBBWU), Peshawar  
**Recruitment Sites:** SBBWU and University of Peshawar

## Project Overview

This platform supports academic research examining how anonymity affects cyberbullying behavior and its psychological correlates. Participants complete an experimental task followed by validated psychological questionnaires.

## High-Level Workflow

1. Participant visits the platform
2. Reviews study information and provides informed consent
3. Registers and receives random assignment to experimental condition
4. Completes video-based experimental task
5. Completes psychological questionnaires
6. Views debriefing information
7. Admin reviews responses, codes aggression, and exports data

## Technology Stack

### Frontend
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts (reserved for analytics)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** JavaScript
- **ODM:** Mongoose

### Database
- **Development:** MongoDB (local)
- **Production:** MongoDB Atlas

### Authentication
- HTTP-only cookies
- Server-side session management

### Deployment
- **Frontend:** Vercel
- **Backend:** Production Node hosting
- **Database:** MongoDB Atlas

## Repository Structure

```
anonymity-cyberbullying-research/
├── frontend/           # Next.js application
│   ├── app/           # App Router pages
│   ├── components/    # Reusable components
│   ├── lib/           # Utilities and API client
│   ├── types/         # TypeScript definitions
│   └── public/        # Static assets
├── backend/           # Express API
│   └── src/
│       ├── config/    # Configuration
│       ├── models/    # Mongoose models
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       ├── validators/
│       ├── services/
│       ├── utils/
│       └── server.js
├── scripts/           # Utility scripts
└── docs/             # Documentation
```

## Local Setup

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas connection string)
- npm or yarn

### Environment Variables

#### Backend (.env)
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cyberbullying-research
SESSION_SECRET=your-secure-secret-here
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

#### Frontend (.env.local)
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

#### Start Backend
```bash
cd backend
npm run dev
```
Backend runs on http://localhost:5000

#### Start Frontend
```bash
cd frontend
npm run dev
```
Frontend runs on http://localhost:3000

### Database Setup

For local development:
```bash
# Ensure MongoDB is running locally
mongod
```

For MongoDB Atlas:
1. Create a cluster at mongodb.com/atlas
2. Create a database user
3. Whitelist your IP
4. Copy connection string to MONGODB_URI

## Development Notes

### Current Phase: Phase 5 - Video Response Experiment ✅ COMPLETE
✅ Project structure established  
✅ Frontend and backend initialized  
✅ Database connection configured  
✅ Basic security middleware implemented  
✅ Documentation created  
✅ **All 9 database models implemented**  
✅ **Model validation and testing complete**  
✅ **Unique constraints enforced**  
✅ **References configured**  
✅ **Consent form with validation**  
✅ **Registration form with validation**  
✅ **Secure participant sessions (HTTP-only cookies)**  
✅ **Participant authentication middleware**  
✅ **Participant isolation enforced**  
✅ **Computerized random allocation system**  
✅ **Balanced assignment (30 anonymous / 30 identifiable)**  
✅ **Server-side condition control**  
✅ **Assignment persistence and immutability**  
✅ **Anonymous identity display ("Unknown User")**  
✅ **Identifiable identity display (actual name)**  
✅ **Condition UI and participant dashboard**  
✅ **Comprehensive assignment tests**  
✅ **Complete video experiment system**  
✅ **Sequential video completion (10 videos)**  
✅ **Response collection and validation**  
✅ **Duplicate response prevention**  
✅ **Video eligibility filtering (approved/active only)**  
✅ **Progress tracking and state management**  
✅ **Refresh/recovery handling**  
✅ **Identity-based display throughout experiment**

### Upcoming Phases
- **Phase 6:** Psychological questionnaires
- **Phase 7:** Admin dashboard and coding interface
- **Phase 8:** Data export and analytics
- **Phase 9:** Production deployment

### Code Standards
- TypeScript strict mode for frontend
- ESLint for code quality
- Consistent error handling
- Secure-by-default practices
- No hardcoded secrets
- Comprehensive comments for research logic

### Testing
```bash
# Frontend
cd frontend
npm run lint
npm run build

# Backend
cd backend
npm run lint
npm test
```

## Security Notes

- Never commit `.env` files
- Use HTTP-only cookies for sessions
- All user input is validated
- Rate limiting on all endpoints
- Security headers via Helmet
- CORS properly configured

## Research Compliance

- All research procedures follow institutional ethics approval
- Participant data is confidential and encrypted
- Test and production data are strictly separated
- Data export includes only de-identified information

## Support

For technical issues, contact the development team.  
For research questions, contact the principal investigator.

---

**Development Status:** Phase 5 Complete - Video Response Experiment Implemented

**Phase 1:** ✅ Foundation Established  
**Phase 2:** ✅ Database Models & Schemas Complete  
**Phase 3:** ✅ Participant Entry System Complete  
**Phase 4:** ✅ Random Assignment & Condition System Complete  
**Phase 5:** ✅ Video Response Experiment Complete  
**Phase 6-9:** Pending

---

## Phase 5 Documentation

Phase 5 implemented the complete video-based experiment system with the following features:

- **Experiment Controller:** Start, current video, submit response, progress, complete
- **Sequential Enforcement:** Backend controls video order, prevents skipping
- **Response Collection:** Text responses with validation (10-5000 chars)
- **Duplicate Prevention:** Idempotent operations, unique indexes
- **Video Eligibility:** Only approved active videos shown
- **State Management:** Tracks progress, handles refresh/recovery
- **Identity Display:** Correct display based on condition (anonymous/identifiable)
- **Progress Tracking:** Real-time progress bar and completion percentage
- **Error Handling:** Graceful handling of video errors, network issues

**Documentation Files:**
- `PHASE-5-SUMMARY.md` - Complete implementation details
- `PHASE-5-QUICK-START.md` - Testing and setup guide

**Test Suite:** `backend/src/tests/test-experiment.js`

---

## Phase 4 Documentation

Phase 4 implemented the computerized random allocation system with the following features:

- **Assignment Service:** Balanced randomization algorithm (30/30 split)
- **Server-Side Control:** Assignment happens exclusively on backend
- **Immutability:** Condition cannot be changed after assignment
- **Anonymous Condition:** Displays "Unknown User", hides real name
- **Identifiable Condition:** Displays actual participant name
- **Security:** Client cannot manipulate assignment
- **Audit Trail:** All assignments logged
- **Comprehensive Tests:** 9 test cases covering all scenarios

**Documentation Files:**
- `PHASE-4-SUMMARY.md` - Complete implementation details
- `PHASE-4-QUICK-START.md` - Testing and setup guide
- `PHASE-4-CHECKLIST.md` - Acceptance criteria verification
- `PHASE-4-FLOW.md` - Visual flow diagrams

**Test Suite:** `backend/src/tests/test-assignment.js`

