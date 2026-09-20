# Deploy and Test Now - Quick Action Guide

## ✅ Code Fixes Complete

All cookie-related issues have been fixed. The changes are committed and ready to deploy.

**Commit**: `Fix: Production cookie handling - consistent secure/sameSite settings across all cookie operations`

---

## 🚀 Step 1: Push to GitHub

```bash
git push origin main
```

**What happens**: Railway will automatically detect the push and start deploying the updated backend.

---

## ⏱️ Step 2: Wait for Railway Deployment (2-5 minutes)

1. Open Railway dashboard: https://railway.app/
2. Go to your backend project
3. Watch the deployment progress
4. Wait for status: **"Deployed"** with ✅ green checkmark

**Railway will show**:
```
Building...
Deploying...
✅ Deployed
```

---

## 🔍 Step 3: Verify Railway Deployment Logs

In Railway dashboard, click on your backend service and check the logs. You should see:

```
=================================================
  Cyberbullying Research Platform - Backend API
=================================================
✓ Server running on port 5000
✓ Environment: production
✓ Frontend URL: https://ai-sentimental-analysis-web-app-fro.vercel.app
✓ Health check: https://ai-sentimental-analysis-web-app-production.up.railway.app/api/health
=================================================
```

**If you see errors**, check:
- Environment variables are set correctly
- MongoDB connection string is valid
- All required env vars present: `NODE_ENV`, `FRONTEND_URL`, `MONGODB_URI`, `SESSION_SECRET`, `JWT_SECRET`

---

## 🧪 Step 4: Test Registration Flow

### 4.1 Clear Browser Data
1. Open browser DevTools (F12)
2. Go to **Application** tab → **Cookies**
3. Delete all cookies for both domains:
   - `ai-sentimental-analysis-web-app-fro.vercel.app`
   - `ai-sentimental-analysis-web-app-production.up.railway.app`
4. **OR** Use incognito/private window (easier)

### 4.2 Complete Consent
1. Go to: `https://ai-sentimental-analysis-web-app-fro.vercel.app/consent`
2. Fill consent form with any test data
3. Click "I Consent to Participate"
4. Should redirect to `/register` page

**Check**: Network tab should show:
- `POST /api/participants/consent` → Status: **200 OK**
- Response should have `Set-Cookie: pendingConsent=...`

### 4.3 Complete Registration
1. Fill registration form:
   - Name: Your test name
   - Username: testuser123 (unique each time)
   - Age: 20
   - Gender: Select any
   - University: Test University
   - Department: Computer Science
   - Participation Preference: Select either option
2. Click "Complete Registration"

**Expected**: Should redirect to `/participant` page (participant dashboard)

### 4.4 Verify Success
✅ **If successful**:
- You see participant dashboard with your profile data
- No errors in console
- Cookie `participantSession` visible in DevTools → Application → Cookies
- Cookie has: `SameSite: None`, `Secure: true`, `HttpOnly: true`

❌ **If you see 401 error**:
- Go to Step 5 (Troubleshooting)

---

## 🐛 Step 5: Troubleshooting (Only if Test Failed)

### Check 1: Verify Cookie is Set
1. Open DevTools → **Application** → **Cookies**
2. Check domain: `ai-sentimental-analysis-web-app-production.up.railway.app`
3. Look for cookie: `participantSession`

**If cookie is missing**:
- Check Railway environment variables
- Check Railway logs for errors
- Verify backend is actually deployed (not old version)

**If cookie exists**:
- Check cookie attributes: `SameSite: None`, `Secure: true`
- If attributes wrong, environment variables might be incorrect

### Check 2: Verify Network Requests
1. Open DevTools → **Network** tab
2. Look for request: `GET /api/participants/me`
3. Check request headers: Should have `Cookie: participantSession=...`
4. Check response: Status should be **200 OK**, not **401**

**If 401 Unauthorized**:
- Cookie is set but not being sent → Check `credentials: 'include'` in frontend
- Cookie is sent but invalid → Check backend auth logic

### Check 3: Railway Environment Variables
Verify in Railway dashboard → Settings → Variables:

```
NODE_ENV = production
FRONTEND_URL = https://ai-sentimental-analysis-web-app-fro.vercel.app
MONGODB_URI = mongodb+srv://24pwbcs1261_db_user:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/cyberbullying-research?retryWrites=true&w=majority
SESSION_SECRET = <your-64-character-secret>
JWT_SECRET = <your-64-character-secret>
```

**Common mistakes**:
- `FRONTEND_URL` has trailing slash (remove it)
- `NODE_ENV` is not set to `production`
- `SESSION_SECRET` or `JWT_SECRET` missing

### Check 4: Railway Deployment Version
Make sure Railway deployed the **latest code**:

1. In Railway dashboard, check deployment commit hash
2. Compare with your local: `git log -1 --oneline`
3. Should show: `518f43c Fix: Production cookie handling...`

**If different**:
- Railway might still be deploying
- Manual redeploy: Railway dashboard → Deployments → "Redeploy"

---

## ✅ Success Confirmation

When everything works, you should be able to:

1. ✅ Complete consent form
2. ✅ Complete registration form
3. ✅ See participant dashboard with your profile
4. ✅ Refresh page → Still logged in
5. ✅ Close browser and reopen → Still logged in (within 7 days)
6. ✅ Click "Start Experiment" → Works without errors

---

## 📝 What Changed?

### Summary of Fixes
1. **Consistent cookie options** across all set/clear operations
2. **Proxy detection** for Railway's `x-forwarded-proto` header
3. **Production-ready settings** for cross-domain cookies (SameSite: None + Secure: true)

### Files Modified
- `backend/src/middleware/participantAuth.js` - Added helper, fixed clearCookie calls
- `backend/src/controllers/participantController.js` - Enhanced checkSession, logout, register clearCookie

---

## 🎯 Next Steps After Successful Test

Once registration flow works perfectly:

1. ✅ Mark production deployment as complete
2. ✅ Test experiment flow (video responses)
3. ✅ Test admin dashboard
4. ✅ Share link with real participants

---

## ❓ Need Help?

If issues persist after following all steps:

1. Share Railway deployment logs (last 50 lines)
2. Share browser console errors (screenshot)
3. Share Network tab for `/api/participants/me` request (headers + response)
4. Confirm Railway environment variables are set exactly as shown above

---

## 📚 Related Documentation

- **Detailed Technical Analysis**: `COOKIE-FIX-DETAILED.md`
- **Original Fix Document**: `PRODUCTION-DEPLOYMENT-FIX.md`
- **Railway Deployment Guide**: `RAILWAY-DEPLOYMENT-FIX.md`
- **Environment Setup**: `DEPLOY-NOW-CHECKLIST.md`
