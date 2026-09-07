# Bug Fix: Port in Use and Duplicate Indexes

## Issues Fixed

### Issue 1: Port 5000 Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`

**Root Cause:** A previous instance of the backend server didn't terminate properly and is still holding port 5000.

**Solution:**
1. Find the process using port 5000:
   ```cmd
   netstat -ano | findstr :5000
   ```

2. Kill the process (replace PID with the actual process ID):
   ```cmd
   taskkill /PID <PID> /F
   ```

**Quick Fix Script:** Created `backend/kill-port-5000.bat` - Double-click to automatically kill any process using port 5000.

**How to Use:**
```cmd
cd backend
kill-port-5000.bat
```

Then start your server again:
```cmd
npm run dev
```

---

### Issue 2: Duplicate Mongoose Index Warnings

**Warnings:**
```
Warning: Duplicate schema index on {"username":1} found.
Warning: Duplicate schema index on {"questionnaireId":1} found.
Warning: Duplicate schema index on {"email":1} found.
```

**Root Cause:** Fields with `unique: true` automatically create an index. Explicitly calling `schema.index()` on the same field creates a duplicate.

**Fix:** Removed duplicate `.index()` calls for fields that already have `unique: true`.

---

## Files Modified

### 1. Participant.js
**Before:**
```javascript
username: {
  type: String,
  unique: true,  // ← Creates index automatically
  // ...
}

// Later in file:
participantSchema.index({ username: 1 }, { unique: true }); // ← Duplicate!
```

**After:**
```javascript
username: {
  type: String,
  unique: true,  // ← Creates index automatically
  // ...
}

// Later in file:
// Note: username index created automatically by unique: true
```

---

### 2. Admin.js
**Before:**
```javascript
username: {
  unique: true  // ← Creates index automatically
}
email: {
  unique: true  // ← Creates index automatically
}

// Later:
adminSchema.index({ username: 1 }, { unique: true }); // ← Duplicate!
adminSchema.index({ email: 1 }, { unique: true }); // ← Duplicate!
```

**After:**
```javascript
// Indexes
// Note: username and email indexes created automatically by unique: true
adminSchema.index({ active: 1 });
adminSchema.index({ role: 1 });
```

---

### 3. QuestionnaireResponse.js
**Before:**
```javascript
questionnaireResponseSchema.index({ participantId: 1, questionnaireId: 1 });
questionnaireResponseSchema.index({ questionnaireId: 1 }); // ← Redundant
```

**After:**
```javascript
questionnaireResponseSchema.index({ participantId: 1, questionnaireId: 1 });
// Note: questionnaireId is indexed as part of the compound index above
```

---

## Testing

### 1. Verify Port is Free
```cmd
netstat -ano | findstr :5000
```
Should return nothing if port is free.

### 2. Start Server
```cmd
cd backend
npm run dev
```

### 3. Expected Output
```
✓ MongoDB connected successfully
Database: cyberbullying-research
Host: localhost
✓ Server running on port 5000
Environment: development
Press Ctrl+C to stop
```

### 4. No Warnings
The Mongoose duplicate index warnings should be gone.

---

## Prevention

### To Avoid Port Issues:
1. Always properly stop the server with `Ctrl+C`
2. If server doesn't stop, use the `kill-port-5000.bat` script
3. Check for running processes before starting:
   ```cmd
   netstat -ano | findstr :5000
   ```

### To Avoid Duplicate Indexes:
When creating Mongoose schemas:
- ✅ **DO:** Use `unique: true` in field definition
- ❌ **DON'T:** Also call `.index({ field: 1 }, { unique: true })`
- ✅ **DO:** Only use `.index()` for non-unique indexes or compound indexes

---

## Status

✅ **Fixed:** Port 5000 process killed  
✅ **Fixed:** Participant model duplicate username index  
✅ **Fixed:** Admin model duplicate username index  
✅ **Fixed:** Admin model duplicate email index  
✅ **Fixed:** QuestionnaireResponse duplicate questionnaireId index  
✅ **Created:** Helper script `kill-port-5000.bat`  
✅ **Tested:** Server starts without warnings

---

## Quick Reference

### Common Port Commands (Windows)

**Find process using a port:**
```cmd
netstat -ano | findstr :PORT_NUMBER
```

**Kill a process:**
```cmd
taskkill /PID <PID> /F
```

**Kill all Node processes:**
```cmd
taskkill /F /IM node.exe
```

**Check if server is running:**
```cmd
curl http://localhost:5000/api/health
```

---

## Notes

- The duplicate index warnings don't break the application but do indicate inefficiency
- Removing duplicate indexes improves database performance slightly
- The compound index `{participantId: 1, questionnaireId: 1}` can be used for queries on just `participantId` (leftmost prefix), so we don't need a separate index on that field
- Always check `netstat` before starting the server to avoid port conflicts
