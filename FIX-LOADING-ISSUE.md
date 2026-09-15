# Fix: Registration Loading Issue

## Problem
After clicking "Complete Registration", the page redirects to `/participant` and shows "Loading..." forever.

## Root Cause
The backend is working correctly (confirmed by test), so the issue is on the frontend:
- Frontend might not be properly sending cookies
- Frontend development server might need restart
- Browser might have cached old code

## Solution

### Step 1: Restart Frontend Development Server

```bash
# Stop the frontend if it's running (Ctrl+C in the terminal)
cd frontend
npm run dev
```

**IMPORTANT**: Environment variables (`.env.local`) are only loaded when the Next.js development server starts. If you changed the `.env.local` file while the server was running, you MUST restart it.

### Step 2: Clear Browser Cache and Cookies

1. Open your browser's Developer Tools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Clear all cookies for `localhost:3000` and `localhost:5000`
4. Hard refresh the page (Ctrl + Shift + R)

### Step 3: Check Browser Console

1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Look for any red error messages
4. Common errors:
   - CORS errors → Backend CORS issue
   - Network errors → Backend not running
   - 401/403 errors → Session/authentication issue

### Step 4: Test Registration Again

1. Go to `http://localhost:3000/consent`
2. Complete consent form
3. Fill registration form with valid data:
   - **Name**: Only letters, spaces, hyphens, apostrophes (NO NUMBERS!)
   - **Username**: Lowercase letters, numbers, hyphens, underscores only
   - **Age**: 18-100
4. Click "Complete Registration"
5. Should redirect to participant dashboard

### Step 5: If Still Not Working

#### Check Network Tab in Browser
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by "Fetch/XHR"
4. Try registration again
5. Look for the `/api/participants/register` request:
   - **Status**: Should be 201
   - **Response**: Check if it contains success message
6. Look for the `/api/participants/me` request:
   - **Status**: Should be 200
   - **Cookies**: Should include `participantSession` cookie

#### Common Issues:

**Issue 1: No `participantSession` cookie**
- Check backend CORS settings
- Ensure `credentials: 'include'` is set in frontend API calls (already done in api.ts)
- Check if `sameSite` cookie setting is blocking

**Issue 2: 401 Unauthorized on `/api/participants/me`**
- Session cookie not being sent
- Cookie expired
- Browser blocking third-party cookies

**Issue 3: Network request fails completely**
- Backend not running on port 5000
- Firewall blocking requests
- Wrong API_URL in `.env.local`

### Verify Backend is Running

```bash
# Test backend health
node test-backend.js

# Should show:
# ✓ Backend is running!
# Status: 200
```

### Verify Registration Flow Works

```bash
# Test complete registration flow
node test-registration-flow.js

# Should show:
# ✓ Registration successful!
# ✓ Session cookie received
# ✓ Profile retrieved successfully!
# ✓ ALL TESTS PASSED!
```

## Quick Fix Commands

```bash
# Terminal 1: Restart Backend
cd backend
npm start

# Terminal 2: Restart Frontend
cd frontend
npm run dev
```

Then clear browser cache and try again.

## Still Not Working?

Check these files:
- `frontend/.env.local` - Should have `NEXT_PUBLIC_API_URL=http://localhost:5000`
- `frontend/lib/api.ts` - Should have `credentials: 'include'` (line 25)
- `backend/src/server.js` - Check CORS configuration

Share the **browser console errors** and **network tab screenshots** for further help.
