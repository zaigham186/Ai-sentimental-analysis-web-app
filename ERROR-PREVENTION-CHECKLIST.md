# Error Prevention Checklist
## Pre-Launch Verification

---

## ✅ Before Starting the Application

### Backend Setup
- [ ] `.env` file created from `.env.example`
- [ ] `MONGODB_URI` configured correctly
- [ ] `SESSION_SECRET` is strong (min 32 characters)
- [ ] `PORT` set (default 5000)
- [ ] `NODE_ENV` set (development/production)
- [ ] All dependencies installed (`npm install`)
- [ ] MongoDB service is running
- [ ] Port 5000 is available

### Frontend Setup
- [ ] `.env.local` file created from `.env.example`
- [ ] `NEXT_PUBLIC_API_URL` points to backend (http://localhost:5000)
- [ ] All dependencies installed (`npm install`)
- [ ] Port 3000 is available

### Database Setup
- [ ] MongoDB is accessible
- [ ] Database `cyberbullying-research` exists (will be created automatically)
- [ ] At least 10 approved active videos exist (use test script)
- [ ] StudySettings configured

---

## ✅ Health Check Script

Run this before starting to verify everything:

```bash
cd backend
node health-check.js
```

This will check:
- ✓ Environment variables
- ✓ MongoDB connection
- ✓ Required collections
- ✓ Test videos
- ✓ Dependencies
- ✓ Port availability
- ✓ Directory structure
- ✓ Critical files

---

## ✅ Starting the Application

### Step 1: Start MongoDB
```bash
# Windows
net start MongoDB

# Or use MongoDB Compass
```

### Step 2: Start Backend
```bash
cd backend
npm run dev
```

**Expected Output:**
```
✓ MongoDB connected successfully
Database: cyberbullying-research
Host: localhost
✓ Server running on port 5000
Environment: development
```

### Step 3: Start Frontend
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

### Step 4: Verify Health Endpoint
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "...",
  "environment": "development",
  "database": "connected"
}
```

---

## ✅ Common Pre-Launch Issues

### Issue: "Cannot find module"
**Fix:**
```bash
cd backend
npm install

cd frontend
npm install
```

### Issue: "Port already in use"
**Fix:**
```bash
cd backend
kill-port-5000.bat
```

### Issue: "MongoDB connection failed"
**Fix:**
1. Start MongoDB service
2. Check connection string in `.env`
3. Try MongoDB Compass to verify connection

### Issue: "No approved videos available"
**Fix:**
```bash
cd backend
node src/tests/test-experiment.js
```

---

## ✅ Testing Phases 1-5

### Phase 1: Foundation
- [ ] Navigate to `http://localhost:3000`
- [ ] Home page loads
- [ ] No console errors

### Phase 2: Database
- [ ] Models loaded without errors
- [ ] No Mongoose warnings
- [ ] Collections created in MongoDB

### Phase 3: Participant Entry
- [ ] Study info page loads
- [ ] Consent form works
- [ ] Registration works
- [ ] Session persists
- [ ] Dashboard loads

### Phase 4: Random Assignment
- [ ] Condition assigned after registration
- [ ] View condition page works
- [ ] Anonymous shows "Unknown User"
- [ ] Identifiable shows actual name
- [ ] Cannot change condition

### Phase 5: Video Experiment
- [ ] Start experiment page loads
- [ ] Can start experiment
- [ ] First video loads
- [ ] Video player works
- [ ] Can submit response
- [ ] Advances to next video
- [ ] Progress updates
- [ ] Can complete all 10 videos
- [ ] Completion page shows

---

## ✅ Browser Console Check

Open DevTools (F12) and check:

### Console Tab
- [ ] No red error messages
- [ ] No failed network requests
- [ ] No TypeScript errors

### Network Tab
- [ ] API calls succeed (200 status)
- [ ] Cookies are set
- [ ] CORS working

### Application Tab
- [ ] Cookies exist:
  - `participantSession` (after registration)
  - `pendingConsent` (during consent)

---

## ✅ Database Verification

Use MongoDB Compass or Shell:

```javascript
// Switch to database
use cyberbullying-research

// Check collections exist
show collections

// Verify videos
db.videos.find({ active: true, validationStatus: 'approved' }).count()
// Should be >= 10

// Check study settings
db.studysettings.findOne()
// Should have targets: 60/30/30

// Verify participants can be created
db.participants.findOne()

// Check indexes
db.participants.getIndexes()
db.videos.getIndexes()
db.videoresponses.getIndexes()
```

---

## ✅ Security Verification

### Backend Security
- [ ] HTTP-only cookies used
- [ ] CORS configured correctly
- [ ] Helmet middleware active
- [ ] Rate limiting on registration
- [ ] Session secret is strong
- [ ] No MongoDB _id exposed to participants
- [ ] Passwords hashed (for admin, Phase 7)

### Frontend Security
- [ ] No localStorage for authentication
- [ ] Cookies marked as secure in production
- [ ] Input validation on all forms
- [ ] Backend validation independent of frontend
- [ ] No client-side condition manipulation

---

## ✅ Performance Check

### Backend
- [ ] Health endpoint responds < 100ms
- [ ] Database queries optimized
- [ ] Indexes created
- [ ] No N+1 queries
- [ ] Appropriate error handling

### Frontend
- [ ] Pages load < 2 seconds
- [ ] No unnecessary re-renders
- [ ] Images optimized
- [ ] API calls minimized
- [ ] Loading states shown

---

## ✅ Pre-Production Checklist

### Environment
- [ ] `NODE_ENV=production` set
- [ ] Strong `SESSION_SECRET` (min 64 chars for production)
- [ ] MongoDB Atlas connection string configured
- [ ] Frontend URL updated to production domain
- [ ] CORS allows production domain

### Security
- [ ] All `.env` files in `.gitignore`
- [ ] No secrets in code
- [ ] HTTPS enabled
- [ ] Secure cookies enabled
- [ ] Rate limiting configured appropriately

### Data
- [ ] Backup strategy in place
- [ ] MongoDB Atlas configured
- [ ] Test data removed
- [ ] Real video URLs configured
- [ ] Consent text approved by ethics board
- [ ] Contact information updated

### Testing
- [ ] All automated tests pass
- [ ] Manual testing complete
- [ ] Security testing done
- [ ] Load testing if needed
- [ ] Cross-browser testing

---

## ✅ Monitoring

### What to Monitor
- [ ] Server uptime
- [ ] MongoDB connection status
- [ ] API response times
- [ ] Error rates
- [ ] Participant registration rates
- [ ] Experiment completion rates

### Logs to Keep
- [ ] Server errors
- [ ] Database errors
- [ ] Failed authentication attempts
- [ ] Audit log entries
- [ ] Participant actions

---

## ✅ Backup & Recovery

### Regular Backups
- [ ] MongoDB daily backups
- [ ] Code repository backed up
- [ ] Environment configuration documented
- [ ] Recovery procedure documented

### What to Backup
- [ ] All participant data
- [ ] All video responses
- [ ] Audit logs
- [ ] Study settings
- [ ] Video metadata

---

## ✅ Quick Reference Commands

### Development
```bash
# Start everything
cd backend && npm run dev
cd frontend && npm run dev

# Run tests
cd backend
node src/tests/test-assignment.js
node src/tests/test-experiment.js
node src/tests/test-models.js

# Health check
cd backend
node health-check.js

# Kill port
cd backend
kill-port-5000.bat
```

### Database
```bash
# MongoDB Shell
mongosh

# Use database
use cyberbullying-research

# Count documents
db.participants.countDocuments()
db.videos.countDocuments()
db.videoresponses.countDocuments()

# Create test videos
node src/tests/test-experiment.js
```

### Troubleshooting
```bash
# Check logs
# Backend: Terminal output
# Frontend: Browser console (F12)

# Restart services
# Ctrl+C to stop
# npm run dev to start

# Clear cache
# Browser: Ctrl+Shift+Delete
# Clear cookies and cache
```

---

## 📞 Support Resources

### Documentation
- `README.md` - Project overview
- `PHASE-1-SUMMARY.md` through `PHASE-5-SUMMARY.md` - Implementation details
- `PHASE-X-QUICK-START.md` - Testing guides
- `TROUBLESHOOTING.md` - Common issues and solutions
- This file - Error prevention

### Scripts
- `backend/health-check.js` - System health verification
- `backend/kill-port-5000.bat` - Port cleanup
- `backend/src/tests/test-*.js` - Automated tests

### Community
- GitHub Issues (if repository is public)
- Research team contact (as configured)
- Technical support (as configured)

---

**Remember:** Prevention is better than cure!

Run the health check before every session:
```bash
cd backend && node health-check.js
```

✅ All green = Ready to go!  
⚠️ Any warnings = Fix before starting!

---

**Last Updated:** Phase 5 Implementation  
**Status:** Ready for deployment
