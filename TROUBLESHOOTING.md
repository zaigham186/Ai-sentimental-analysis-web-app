# Troubleshooting Guide
## Common Issues and Solutions

---

## Backend Issues

### Issue 1: Port 5000 Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Option 1: Use the helper script
cd backend
kill-port-5000.bat

# Option 2: Manual
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Then restart
npm run dev
```

---

### Issue 2: MongoDB Connection Failed
**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Causes:**
- MongoDB not running
- Wrong connection string
- Network issues

**Solutions:**
```bash
# Check if MongoDB is running
# Windows: Open Services, look for MongoDB

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/cyberbullying-research

# Start MongoDB (if installed locally)
net start MongoDB

# Or use MongoDB Compass to start
```

---

### Issue 3: Missing Environment Variables
**Error:** `Cannot read property 'X' of undefined`

**Solution:**
Create `backend/.env` from `backend/.env.example`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cyberbullying-research
SESSION_SECRET=your-secure-random-secret-here-min-32-chars
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

---

### Issue 4: Mongoose Duplicate Index Warnings
**Warning:** `Duplicate schema index on {"username":1}`

**Solution:** Already fixed in models, but if you see it:
- Clear your database indexes
- Restart the server
- Indexes will be recreated correctly

---

### Issue 5: "No approved videos available"
**Error in experiment:** `No approved videos available. Please contact the research team.`

**Solution:**
```javascript
// MongoDB Shell or Compass
use cyberbullying-research

// Create test videos
for (let i = 1; i <= 10; i++) {
  db.videos.insertOne({
    title: `Test Scenario ${i}`,
    topic: `Topic ${i}`,
    description: `Test video ${i}`,
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
```

---

## Frontend Issues

### Issue 6: Frontend Won't Start
**Error:** `Error: Cannot find module 'next'`

**Solution:**
```bash
cd frontend
npm install
npm run dev
```

---

### Issue 7: API Connection Failed
**Error:** `Network error occurred` or `Failed to fetch`

**Causes:**
- Backend not running
- Wrong API URL
- CORS issues

**Solutions:**
```bash
# 1. Check backend is running
# Visit: http://localhost:5000/api/health

# 2. Check frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000

# 3. Check CORS in backend (already configured)
# frontend\\.env.local should match backend URL
```

---

### Issue 8: "Authentication required" Loop
**Error:** Redirects to /consent repeatedly

**Causes:**
- Cookie not being set
- Session expired
- Browser blocking cookies

**Solutions:**
```bash
# 1. Clear browser cookies
# Chrome: Settings > Privacy > Clear browsing data > Cookies

# 2. Check browser console for cookie errors

# 3. Try in incognito mode

# 4. Check backend session secret is set in .env
```

---

### Issue 9: Video Won't Play
**Error:** "Video Unavailable" or black screen

**Causes:**
- Invalid video URL
- Video format not supported
- CORS issues with video host

**Solutions:**
```javascript
// 1. Use valid test video URL
db.videos.updateMany(
  {},
  {
    $set: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    }
  }
)

// 2. Ensure video format is MP4

// 3. Check browser console for CORS errors
```

---

### Issue 10: Form Submits on Enter Key
**Issue:** Consent form submits when typing name

**Solution:** Already fixed! The Enter key is now prevented in the signature field.

If you still see it:
```tsx
// Check frontend/app/consent/page.tsx has:
onKeyDown={(e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
  }
}}
```

---

### Issue 11: Select Dropdown Error
**Error:** `TypeError: Cannot read properties of undefined (reading 'map')`

**Solution:** Already fixed! The Select component now supports both props and children.

If you still see it, update:
```tsx
// frontend/components/ui/Select.tsx should have:
children ? children : (
  options && options.map(...)
)
```

---

## Database Issues

### Issue 12: Participant Not Found After Registration
**Error:** Session exists but participant data missing

**Solution:**
```javascript
// Check in MongoDB
db.participants.findOne({ username: "your_username" })

// If exists, session cookie might be wrong
// Clear browser cookies and re-register
```

---

### Issue 13: Duplicate Username Error
**Error:** `Username already taken`

**Cause:** Username exists in database

**Solutions:**
```javascript
// Option 1: Use different username

// Option 2: Delete test participant (ONLY IN DEVELOPMENT)
db.participants.deleteOne({ username: "test_username" })

// Option 3: Check if it's your own account
// Try logging in instead of registering
```

---

### Issue 14: Cannot Submit Response - "Already submitted"
**Issue:** Message says response already submitted but you don't see it

**Cause:** Response exists in database

**Solution:**
```javascript
// Check existing responses
db.videoresponses.find({
  participant: ObjectId("your_participant_id"),
  video: ObjectId("current_video_id")
})

// This is actually correct behavior (prevents duplicates)
// Refresh the page to move to next video
```

---

## Experiment Flow Issues

### Issue 15: Stuck on Same Video After Refresh
**Issue:** Refreshing doesn't advance to next video

**Solution:**
This is correct behavior! Submit your response to advance.

If you already submitted:
```javascript
// Check backend logs for errors
// Check MongoDB to verify response was saved
db.videoresponses.find({ participant: ObjectId("...") })

// If response exists, refresh should load next video
```

---

### Issue 16: "Condition not yet assigned"
**Error:** Cannot start experiment

**Cause:** Participant doesn't have condition assigned

**Solution:**
```javascript
// Check participant condition
db.participants.findOne(
  { username: "your_username" },
  { condition: 1, conditionAssigned: 1 }
)

// If not assigned, run assignment service
// Or re-register as new participant
```

---

### Issue 17: Progress Shows Wrong Number
**Issue:** Progress bar doesn't match completed videos

**Solution:**
```javascript
// Verify in database
db.participants.findOne(
  { username: "your_username" },
  { completedVideos: 1 }
)

// Count should match number of responses
db.videoresponses.countDocuments({
  participant: ObjectId("...")
})

// If mismatch, might be state sync issue
// Complete experiment and start new test
```

---

## Testing Issues

### Issue 18: Test Script Fails
**Error:** Running `test-experiment.js` or `test-assignment.js` fails

**Solutions:**
```bash
# 1. Ensure MongoDB is running

# 2. Check MONGODB_URI in .env

# 3. Install dependencies
cd backend
npm install

# 4. Run with full path
node src/tests/test-experiment.js

# 5. Check for permission issues
# Run terminal as administrator if needed
```

---

## Production Issues

### Issue 19: Environment Mismatch
**Issue:** Development works but production doesn't

**Checklist:**
```env
# backend/.env (production)
NODE_ENV=production
MONGODB_URI=<atlas_connection_string>
SESSION_SECRET=<strong_random_secret>
FRONTEND_URL=<production_url>

# frontend/.env.local (production)
NEXT_PUBLIC_API_URL=<production_api_url>
```

---

### Issue 20: CORS Errors in Production
**Error:** `Access-Control-Allow-Origin` errors

**Solution:**
Check `backend/src/middleware/security.js`:
```javascript
// Ensure FRONTEND_URL matches production URL
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true
};
```

---

## General Debugging Steps

### Step 1: Check All Services Running
```bash
# Backend
curl http://localhost:5000/api/health
# Should return: {"success":true,"message":"API is healthy",...}

# Frontend
# Visit: http://localhost:3000
# Should load home page

# MongoDB
# Use MongoDB Compass or:
mongosh
use cyberbullying-research
db.stats()
```

---

### Step 2: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Check Network tab for failed requests

---

### Step 3: Check Backend Logs
```bash
# Backend terminal should show:
✓ MongoDB connected successfully
✓ Server running on port 5000

# Any errors will appear in red
```

---

### Step 4: Check Database State
```javascript
// MongoDB Shell or Compass

// Count participants
db.participants.countDocuments()

// Count videos
db.videos.countDocuments({ active: true, validationStatus: 'approved' })

// Count responses
db.videoresponses.countDocuments()

// Check study settings
db.studysettings.findOne()
```

---

### Step 5: Clear Everything and Start Fresh
```bash
# 1. Stop all servers (Ctrl+C)

# 2. Clear browser data
# Chrome: Settings > Privacy > Clear browsing data
# Select: Cookies, Cached images

# 3. Restart MongoDB
net stop MongoDB
net start MongoDB

# 4. Restart backend
cd backend
npm run dev

# 5. Restart frontend
cd frontend  
npm run dev

# 6. Try again in new incognito window
```

---

## Getting Help

### Information to Provide When Asking for Help

1. **Error Message:** Full error text from console/terminal
2. **Steps to Reproduce:** What you did before error occurred
3. **Environment:**
   - Node version: `node --version`
   - npm version: `npm --version`
   - MongoDB version: `mongod --version`
4. **Screenshots:** Browser console and terminal output
5. **Recent Changes:** What you changed before error started

---

### Useful Commands for Debugging

```bash
# Check Node/npm versions
node --version
npm --version

# Check running processes
netstat -ano | findstr :5000
netstat -ano | findstr :3000

# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
cd frontend
npx tsc --noEmit

# Check for linting errors  
npm run lint
```

---

## Quick Fixes Checklist

When something goes wrong, try these in order:

- [ ] Refresh browser page (F5)
- [ ] Clear browser cookies
- [ ] Check backend is running
- [ ] Check MongoDB is running
- [ ] Check .env files exist and are correct
- [ ] Restart backend server
- [ ] Restart frontend server
- [ ] Check backend terminal for errors
- [ ] Check browser console for errors
- [ ] Try in incognito window
- [ ] Reinstall dependencies (`npm install`)
- [ ] Clear browser cache completely
- [ ] Restart computer (if all else fails)

---

**Last Updated:** Phase 5 Implementation  
**Status:** Comprehensive troubleshooting guide complete
