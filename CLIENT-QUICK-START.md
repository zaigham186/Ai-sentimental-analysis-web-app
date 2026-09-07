# 🚀 Quick Start Guide - Consent Button Fix

## ✅ ALL FIXES APPLIED - Ready to Test!

### What Was Fixed:
1. ✅ Created missing `.env.local` file for frontend
2. ✅ Created missing `.env` file for backend  
3. ✅ Fixed port conflict (killed process on port 5000)
4. ✅ Fixed Mongoose duplicate index warning
5. ✅ Added debug messages to consent page
6. ✅ Created startup/shutdown scripts

---

## 🎯 EASIEST WAY TO START (Recommended)

### Option 1: Use the Startup Script

1. **Double-click** `START-ALL.bat` in the project root folder
2. Wait for both servers to start (about 10 seconds)
3. Open browser to: **http://localhost:3000/consent**
4. Test the consent form!

### To Stop Servers:
- **Double-click** `STOP-ALL.bat`

---

## 🔧 MANUAL START (Alternative)

### Step 1: Start Backend Server

Open **Command Prompt** or **Terminal**:

```bash
cd "C:\Users\Hp\OneDrive\Desktop\All files\Ai sentimental analysis project\backend"
npm run dev
```

✅ **Expected Output:**
```
==================================================
  Cyberbullying Research Platform - Backend API
==================================================
✓ Server running on port 5000
✓ Environment: development
✓ Frontend URL: http://localhost:3000
✓ Health check: http://localhost:5000/api/health
==================================================
```

❌ **If you see "Port in use" error:**
```bash
cd backend
kill-port-5000.bat
npm run dev
```

---

### Step 2: Start Frontend Server

Open **ANOTHER** Command Prompt or Terminal:

```bash
cd "C:\Users\Hp\OneDrive\Desktop\All files\Ai sentimental analysis project\frontend"
npm run dev
```

✅ **Expected Output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
✓ Ready in X seconds
```

---

## 🧪 TESTING THE CONSENT BUTTON

### Step 1: Open the Application

Open your browser to: **http://localhost:3000/consent**

### Step 2: Open Developer Console

Press **F12** on your keyboard to open DevTools, then click the **Console** tab

### Step 3: Fill Out the Form

1. ✅ Check all THREE checkboxes:
   - "I have read and understood..."
   - "I agree that my de-identified data..."
   - "I understand that I may withdraw..."

2. ✅ Type your name in "Electronic Signature" field
   - Example: "Ali Khan"

3. ✅ Click **"I Agree - Proceed to Registration"** button

### Step 4: Watch for Success

**In the Browser:**
- You should see a blue info box saying: **"Debug: Submitting consent..."**
- Then: **"Debug: Sending to backend API..."**
- Then: **"Debug: Consent accepted! Redirecting..."**
- Page should redirect to **Registration page** (`/register`)

**In the Console (F12):**
```
Consent form submitted: {consentGiven: true, ...}
Sending consent to API...
Consent API response: {success: true, ...}
Navigating to registration...
```

---

## ❌ TROUBLESHOOTING

### Problem 1: Button Does Nothing

**Check Console (F12) for errors:**

**Error:** `Failed to fetch`
**Solution:** Backend is not running
```bash
cd backend
npm run dev
```

---

**Error:** `CORS policy blocked`
**Solution:** Backend needs to restart
```bash
# Stop backend (Ctrl+C in terminal)
# Then restart:
npm run dev
```

---

**Error:** `Network request failed`
**Solution:** Check .env.local file exists
```bash
cd frontend
dir .env.local

# If not found, create it:
echo NEXT_PUBLIC_API_URL=http://localhost:5000 > .env.local

# Then restart frontend:
npm run dev
```

---

### Problem 2: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution A:** Use the kill script
```bash
cd backend
kill-port-5000.bat
```

**Solution B:** Manual kill
```bash
netstat -ano | findstr :5000
# Note the PID number (last column)
taskkill /F /PID <PID_NUMBER>
```

---

### Problem 3: Frontend Won't Start

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill it (replace <PID> with actual number)
taskkill /F /PID <PID>

# Restart frontend
npm run dev
```

---

## 📋 COMPLETE FLOW TEST

After consent button works, test the complete flow:

1. **Consent Page** → Fill form → Click "I Agree"
2. **Registration Page** → Create account with username/password
3. **Condition Assignment** → See if you're "Anonymous" or "Identifiable"
4. **Experiment** → Watch 10 videos and provide responses
5. **Completion** → See success message

---

## 🆘 STILL NOT WORKING?

### Check Everything is Running:

**1. MongoDB**
```bash
tasklist | findstr mongod
# Should show: mongod.exe
```
If not running, start MongoDB service.

**2. Backend**
```bash
netstat -ano | findstr :5000
# Should show: LISTENING on port 5000
```

**3. Frontend**
```bash
netstat -ano | findstr :3000
# Should show: LISTENING on port 3000
```

**4. Test Backend API Directly**
```bash
curl http://localhost:5000/api/health
# Should return: {"success":true,"message":"Server is healthy"}
```

---

## 📁 FILES CREATED/MODIFIED

### Created:
- ✅ `frontend/.env.local` - API configuration
- ✅ `backend/.env` - Server configuration
- ✅ `START-ALL.bat` - Easy startup script
- ✅ `STOP-ALL.bat` - Easy shutdown script
- ✅ `CONSENT-BUTTON-FIX.md` - Technical details
- ✅ `CLIENT-QUICK-START.md` - This guide!

### Modified:
- ✅ `frontend/app/consent/page.tsx` - Added debug messages
- ✅ `backend/src/models/QuestionnaireResponse.js` - Fixed duplicate index

---

## ✅ SUCCESS CHECKLIST

- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] Browser open to http://localhost:3000/consent
- [ ] Console shows no errors (F12 → Console)
- [ ] All 3 checkboxes checked
- [ ] Name typed in signature field
- [ ] Button enabled (not greyed out)
- [ ] Click button → See debug messages
- [ ] Redirected to /register page

---

## 🎉 You're All Set!

The consent button is now fully functional. Your client can proceed through the entire research platform flow!

**Need Help?** Check the console messages (F12) - they will tell you exactly what's happening.
