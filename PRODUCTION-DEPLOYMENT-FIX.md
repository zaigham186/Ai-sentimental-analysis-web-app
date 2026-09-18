# 🚨 PRODUCTION DEPLOYMENT FIX - "Fail to Fetch" Error

## Problem
Frontend (Vercel) cannot communicate with Backend (Railway). Registration form shows "fail to fetch" error.

## Root Causes Identified

### 1. ❌ Trailing Slash in API URL
**File**: `frontend/.env.production`
```
NEXT_PUBLIC_API_URL=https://ai-sentimental-analysis-web-app-production.up.railway.app/
                                                                                    ^ Remove this
```

### 2. ❌ Wrong Environment Variable Name
**Backend expects**: `FRONTEND_URL`
**You provided**: `CORS_ORIGIN`

### 3. ❌ Cookie Settings Not Production-Ready
Cookies need `sameSite: 'none'` and `secure: true` for cross-domain in production

---

## ✅ FIXES TO APPLY

### FIX 1: Update Frontend Environment Variables

**File**: `frontend/.env.production` (on Vercel)

```env
# Remove trailing slash from API URL
NEXT_PUBLIC_API_URL=https://ai-sentimental-analysis-web-app-production.up.railway.app
NEXT_PUBLIC_SITE_URL=https://your-actual-vercel-url.vercel.app
```

**How to update on Vercel:**
1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Find `NEXT_PUBLIC_API_URL`
4. Remove the trailing `/` from the URL
5. Click **Save**
6. **Redeploy** your frontend

---

### FIX 2: Update Backend Environment Variables

**On Railway Dashboard**, set these environment variables:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://24pwbcs1261_db_user:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/cyberbullying-research?retryWrites=true&w=majority
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
JWT_SECRET=<generate 64-char secret>
SESSION_SECRET=<generate 64-char secret>
NLP_SERVICE_URL=https://your-nlp-service.up.railway.app
```

**Generate secrets** (run locally):
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**CRITICAL**: Use `FRONTEND_URL` not `CORS_ORIGIN` (the backend code uses `FRONTEND_URL`)

---

### FIX 3: Update Backend Config for Production Cookies

The backend needs to handle cross-domain cookies properly.

---

## 🔧 CODE FIXES REQUIRED

### Update 1: Fix backend/src/config/index.js

Change line that reads `CORS_ORIGIN`:
```javascript
// CORS
frontendUrl: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000',
```

This makes it work with either variable name.

### Update 2: Fix Cookie Settings in participantController.js

The cookie configuration needs to be production-ready for cross-domain:

**Current code** (Lines 43-48):
```javascript
const isSecure = (req.secure || req.headers['x-forwarded-proto'] === 'https') && config.nodeEnv === 'production';
res.cookie('pendingConsent', JSON.stringify(consentData), {
  httpOnly: true,
  secure: isSecure,
  sameSite: 'lax',
  maxAge: 30 * 60 * 1000 // 30 minutes
});
```

**Should be**:
```javascript
const isProduction = config.nodeEnv === 'production';
const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

res.cookie('pendingConsent', JSON.stringify(consentData), {
  httpOnly: true,
  secure: isProduction ? true : isSecure,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 30 * 60 * 1000 // 30 minutes
});
```

**Same fix needed** in:
- Line 131-137 (participantSession cookie)
- Line 144 (clearCookie calls)

### Update 3: Fix CORS Configuration in server.js

**Current CORS config** allows only specific origins. Need to ensure your Vercel URL is included:

```javascript
// CORS configuration
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.warn(`CORS rejected origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 📋 STEP-BY-STEP FIX PROCEDURE

### Step 1: Update Backend Code (Do this locally)

I'll provide the fixed files for you to commit and push.

### Step 2: Update Railway Environment Variables

1. Go to Railway dashboard
2. Click your backend service
3. Go to **Variables** tab
4. Set these:
   ```
   FRONTEND_URL=https://your-vercel-url.vercel.app
   JWT_SECRET=<64-char-secret>
   SESSION_SECRET=<64-char-secret>
   ```
5. Click **Deploy**

### Step 3: Update Vercel Environment Variables

1. Go to Vercel dashboard
2. Click your frontend project
3. Go to **Settings** → **Environment Variables**
4. Update:
   ```
   NEXT_PUBLIC_API_URL=https://ai-sentimental-analysis-web-app-production.up.railway.app
   ```
   (Remove trailing slash!)
5. **Redeploy**

### Step 4: Test

1. Open your Vercel URL
2. Go to registration page
3. Fill the form
4. Submit
5. Should redirect to `/participant` page

---

## 🔍 HOW TO DEBUG

### Check Railway Logs

1. Go to Railway dashboard
2. Click your service
3. Go to **Deployments** → Click latest deployment
4. Check logs for:
   ```
   CORS rejected origin: https://your-frontend.vercel.app
   ```

If you see this, it means `FRONTEND_URL` is not set correctly.

### Check Browser Console

1. Open your Vercel frontend
2. Open DevTools (F12)
3. Go to **Console** tab
4. Try to submit registration
5. Look for errors:
   - `CORS policy: No 'Access-Control-Allow-Origin' header` → Backend CORS issue
   - `Failed to fetch` → Backend is down or URL is wrong
   - `Network error` → Check Railway logs

### Check Browser Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Submit registration form
4. Look for the POST request to `/api/participants/register`
5. Check:
   - **Request URL**: Should be `https://...railway.app/api/participants/register` (no double slashes)
   - **Status Code**: 
     - `200` = Success ✅
     - `400` = Validation error (check request payload)
     - `500` = Backend error (check Railway logs)
     - `0` or no response = CORS/network issue

---

## 🆘 STILL NOT WORKING?

### Common Issues

**Issue 1: CORS Error in Browser Console**
```
Access to fetch at 'https://...railway.app/api/participants/register' from origin 
'https://...vercel.app' has been blocked by CORS policy
```

**Fix**: 
- Check `FRONTEND_URL` is set correctly on Railway
- Check it matches your Vercel URL **exactly** (including `https://` and no trailing slash)
- Redeploy backend after changing environment variable

---

**Issue 2: Cookies Not Being Set**
```
Registration succeeds but redirect fails
```

**Fix**:
- Check browser DevTools → Application → Cookies
- If no `participantSession` cookie, the backend cookie settings are wrong
- Make sure `sameSite: 'none'` and `secure: true` in production
- Requires code changes (see Fix 3 above)

---

**Issue 3: Double Slash in URL**
```
Request URL: https://...railway.app//api/participants/register
                                    ^^ Notice double slash
```

**Fix**:
- Remove trailing `/` from `NEXT_PUBLIC_API_URL` in Vercel
- Redeploy frontend

---

## ✅ VERIFICATION CHECKLIST

Before testing, verify:

- [ ] `NEXT_PUBLIC_API_URL` has NO trailing slash on Vercel
- [ ] `FRONTEND_URL` is set on Railway (not `CORS_ORIGIN`)
- [ ] `FRONTEND_URL` matches your Vercel URL exactly
- [ ] `JWT_SECRET` and `SESSION_SECRET` are set on Railway (64+ chars)
- [ ] Backend code updated for cross-domain cookies
- [ ] Both frontend and backend redeployed after changes
- [ ] Railway backend is running (check deployment logs)
- [ ] MongoDB Atlas IP whitelist includes `0.0.0.0/0`

---

## 🎯 EXPECTED OUTCOME

After fixing:

1. ✅ User fills registration form on Vercel
2. ✅ Frontend calls `https://...railway.app/api/participants/register`
3. ✅ Backend receives request and validates data
4. ✅ Backend creates participant in MongoDB
5. ✅ Backend sets `participantSession` cookie
6. ✅ Frontend receives success response
7. ✅ Frontend redirects to `/participant` page
8. ✅ Participant page loads with user data

---

## 🔥 QUICK FIX SUMMARY

**3 Things to Change RIGHT NOW:**

1. **Vercel**: Remove trailing `/` from `NEXT_PUBLIC_API_URL`
2. **Railway**: Add `FRONTEND_URL=https://your-vercel-url.vercel.app`
3. **Code**: Update cookie settings to `sameSite: 'none'` in production

Then redeploy both frontend and backend.

---

**Need the updated code files? I'll create them for you in the next step.**
