# Consent Button Fix - Troubleshooting Guide

## Issue
The "I Agree - Proceed to Registration" button is not working on the consent page.

## Root Causes Fixed

### 1. **Missing Environment Files** ✅ FIXED
- Created `frontend/.env.local` with API URL
- Created `backend/.env` with configuration
- Both servers can now communicate

### 2. **Port Conflict** ✅ FIXED
- Killed process using port 5000
- Backend now starts successfully

### 3. **Mongoose Duplicate Index Warning** ✅ FIXED
- Removed duplicate index from QuestionnaireResponse model

## How to Test

### Step 1: Ensure Both Servers Are Running

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
You should see:
```
✓ MongoDB connected successfully
✓ Server running on port 5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
You should see:
```
✓ Ready on http://localhost:3000
```

### Step 2: Test the Consent Flow

1. Open browser to: `http://localhost:3000/consent`
2. Open browser console (F12 → Console tab)
3. Check all three checkboxes
4. Type your name in the "Electronic Signature" field
5. Click "I Agree - Proceed to Registration"
6. Watch the console for debug messages:
   - "Consent form submitted: {data}"
   - "Sending consent to API..."
   - "Consent API response: {response}"
   - "Navigating to registration..."

### Step 3: Expected Behavior

✅ **Success:**
- Button shows "Submitting..." for a moment
- Page redirects to `/register`
- No error messages appear

❌ **If Still Not Working:**

**Check Console for Errors:**

1. **CORS Error:**
   ```
   Access to fetch at 'http://localhost:5000/api/participants/consent' 
   from origin 'http://localhost:3000' has been blocked by CORS policy
   ```
   
   **Fix:** Backend CORS is already configured. Make sure backend is running.

2. **Network Error:**
   ```
   Failed to fetch
   ```
   
   **Fix:** Backend is not running. Start it with `npm run dev`

3. **API URL Undefined:**
   ```
   TypeError: Cannot read property 'participant' of undefined
   ```
   
   **Fix:** Restart frontend dev server to load .env.local file

4. **Cookie Not Set:**
   - Check in DevTools → Application → Cookies
   - Should see `pendingConsent` cookie after submission

## Quick Commands

### Kill Port 5000 (if needed):
```bash
# Find process
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /F /PID <PID>
```

### Restart Everything:
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

## API Test (Direct)

Test backend directly with curl:
```bash
curl -X POST http://localhost:5000/api/participants/consent ^
  -H "Content-Type: application/json" ^
  -d "{\"consentGiven\":true,\"agreedToDataUse\":true,\"agreedToWithdrawalTerms\":true,\"electronicSignature\":\"Test Name\"}"
```

Expected response:
```json
{
  "success": true,
  "message": "Consent recorded. Please proceed to registration.",
  "data": {
    "consentVersion": "1.0"
  }
}
```

## Next Steps After Consent Works

1. **Registration Page** - Create participant account
2. **Condition Assignment** - Get assigned to anonymous or identifiable
3. **Experiment** - Complete 10 video responses
4. **Completion** - View completion page

## Files Modified

- ✅ `frontend/.env.local` - Created with API URL
- ✅ `backend/.env` - Created with configuration
- ✅ `frontend/app/consent/page.tsx` - Added debug logging
- ✅ `backend/src/models/QuestionnaireResponse.js` - Fixed duplicate index

## Status: READY FOR TESTING

All fixes have been applied. The consent button should now work correctly.
