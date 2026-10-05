# Fix Database Sync Issue

## Problem Identified

Your **localhost shows 30 participants** but **production shows 67 participants** even though they're connecting to the **same MongoDB database**.

This means:
- ❌ Localhost frontend is showing OLD/CACHED data
- ✅ Production frontend is showing CORRECT data

## Root Cause

The localhost frontend might be:
1. Using cached API responses
2. Using old browser cache
3. Backend not restarting properly
4. Frontend not rebuilding properly

## Solution: Force Complete Refresh

### Step 1: Check Database Reality

Run this to see what's actually in the database:

```bash
cd backend
node check-database-sync.js
```

This will show you the REAL participant count in MongoDB.

### Step 2: Clear Everything in Localhost

#### A. Clear Backend:
```bash
# Stop backend if running (Ctrl+C)
cd backend
npm run dev
```

#### B. Clear Frontend Cache:
```bash
# Stop frontend if running (Ctrl+C)
cd frontend

# Delete .next folder (build cache)
rmdir /s /q .next

# Delete node_modules/.cache if exists
rmdir /s /q node_modules\.cache

# Restart
npm run dev
```

#### C. Clear Browser:
1. Open Chrome DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. OR Press: Ctrl+Shift+Delete → Clear all data

### Step 3: Verify Fix

1. **Open localhost in incognito mode**: http://localhost:3000
2. **Login as admin**
3. **Go to Participants page**
4. **Check count** - should now show 67 (same as production)

---

## Quick Fix Script

Run this to clear everything:

### Windows (CMD):
```batch
@echo off
echo Stopping services...
taskkill /F /IM node.exe

echo Clearing frontend cache...
cd frontend
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Clearing backend cache...
cd ..\backend

echo Restarting backend...
start cmd /k "npm run dev"

echo Restarting frontend...
cd ..\frontend
start cmd /k "npm run dev"

echo Done! Wait 10 seconds then open http://localhost:3000 in incognito mode
pause
```

---

## Permanent Solution

To avoid this issue:

### Option 1: Use Production Database Check Query

Update the participant count query to always force fresh data (no cache).

### Option 2: Add Cache-Control Headers

Update API responses to prevent caching.

### Option 3: Always Use Incognito for Testing

When testing locally, always use incognito mode to avoid cache issues.

---

## Verification Checklist

- [ ] Run `node backend/check-database-sync.js`
- [ ] Note the REAL participant count from database
- [ ] Stop all Node processes
- [ ] Delete frontend `.next` folder
- [ ] Restart backend: `npm run dev`
- [ ] Restart frontend: `npm run dev`
- [ ] Open localhost in incognito mode
- [ ] Clear browser cache (Ctrl+Shift+F5)
- [ ] Login as admin
- [ ] Check Participants page
- [ ] Verify count matches database reality

---

## Expected Result

After following these steps:
- ✅ Localhost shows: 67 participants (same as production)
- ✅ Production shows: 67 participants
- ✅ Both connect to same database
- ✅ Both show same data
- ✅ Delete works properly (no "not found" errors)

---

## Why This Happens

1. **Next.js Caching**: Next.js caches API responses aggressively
2. **Browser Caching**: Browser caches data between reloads
3. **React State**: React might be holding old state
4. **Hot Reload**: Hot reload doesn't always refresh everything

## How to Prevent

Always:
1. Use incognito mode for testing
2. Hard refresh (Ctrl+Shift+F5) after code changes
3. Restart both frontend and backend after changes
4. Clear .next folder when in doubt

---

**Follow these steps and your localhost will match production!**
