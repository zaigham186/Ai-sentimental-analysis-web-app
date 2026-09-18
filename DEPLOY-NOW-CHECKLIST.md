# 🚀 DEPLOY NOW - Quick Checklist

## ✅ STEP 1: Replace Backend File (CRITICAL)

**Replace this file:**
```
backend/src/controllers/participantController.js
```

**With this file:**
```
backend/src/controllers/participantController-PRODUCTION-FIX.js
```

**How to do it:**
```bash
# In your project root
cd backend/src/controllers
cp participantController-PRODUCTION-FIX.js participantController.js
```

Or manually:
1. Open `participantController-PRODUCTION-FIX.js`
2. Copy all content
3. Open `participantController.js`
4. Replace ALL content
5. Save

---

## ✅ STEP 2: Commit and Push Changes

```bash
git add .
git commit -m "Fix: Production cookie and CORS configuration for cross-domain deployment"
git push origin main
```

This will automatically redeploy:
- ✅ Backend on Railway (if connected to GitHub)
- ✅ Frontend on Vercel (if connected to GitHub)

---

## ✅ STEP 3: Update Railway Environment Variables

Go to Railway dashboard → Your backend service → **Variables** tab

**Set these variables:**

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://24pwbcs1261_db_user:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/cyberbullying-research?retryWrites=true&w=majority
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
JWT_SECRET=<paste-generated-secret-here>
SESSION_SECRET=<paste-generated-secret-here>
```

**Generate secrets** (run locally):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy each output and paste as JWT_SECRET and SESSION_SECRET.

**IMPORTANT:** Replace `https://your-actual-vercel-url.vercel.app` with your REAL Vercel URL!

---

## ✅ STEP 4: Update Vercel Environment Variables

Go to Vercel dashboard → Your frontend project → **Settings** → **Environment Variables**

**Update these:**

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://ai-sentimental-analysis-web-app-production.up.railway.app` | Production |
| `NEXT_PUBLIC_SITE_URL` | `https://your-actual-vercel-url.vercel.app` | Production |

**CRITICAL:** 
- ❌ Remove trailing `/` from API URL
- ✅ No slash at the end: `.../up.railway.app`
- ❌ Wrong: `.../up.railway.app/`

After updating, click **Redeploy** in Vercel dashboard.

---

## ✅ STEP 5: Verify Deployment

### Check Railway Backend

1. Go to Railway dashboard
2. Click your backend service
3. Go to **Deployments** tab
4. Click latest deployment
5. Check logs for:
   ```
   ✓ MongoDB connected successfully
   ✓ Server running on port 5000
   ✓ Frontend URL: https://your-vercel-url.vercel.app
   ```

6. Test health endpoint:
   ```
   https://ai-sentimental-analysis-web-app-production.up.railway.app/api/health
   ```
   Should return:
   ```json
   {
     "success": true,
     "message": "Research API is running",
     "environment": "production",
     "database": "connected"
   }
   ```

### Check Vercel Frontend

1. Go to Vercel dashboard
2. Click your frontend project
3. Go to **Deployments** tab
4. Check latest deployment status: ✅ Ready

5. Open your site:
   ```
   https://your-actual-vercel-url.vercel.app
   ```

---

## ✅ STEP 6: Test Registration Flow

1. Open your Vercel URL in browser
2. Click **Participate** or go to `/register`
3. Fill in the registration form:
   - Name: Test User
   - Username: testuser123
   - Age: 25
   - Gender: Any
   - University: SBBWU
   - Department: Computer Science
   - Condition: Anonymous

4. Click **Complete Registration**

5. **Expected result:**
   - ✅ Form submits without errors
   - ✅ Redirects to `/participant` page
   - ✅ Shows participant dashboard

6. **If it fails:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for errors
   - Go to Network tab
   - Check the POST request to `/api/participants/register`
   - Check status code and response

---

## 🔍 DEBUGGING CHECKLIST

If registration still fails, check:

### ❌ Problem: "Failed to fetch" error

**Check:**
- [ ] Is Railway backend running? (check Railway dashboard)
- [ ] Does health endpoint work? (`/api/health`)
- [ ] Is `NEXT_PUBLIC_API_URL` correct on Vercel?
- [ ] Did you remove trailing `/` from API URL?

**Fix:**
- Update `NEXT_PUBLIC_API_URL` on Vercel
- Remove trailing slash
- Redeploy frontend

---

### ❌ Problem: CORS Error in Console

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Check:**
- [ ] Is `FRONTEND_URL` set on Railway?
- [ ] Does `FRONTEND_URL` match your Vercel URL exactly?
- [ ] Did you redeploy backend after setting `FRONTEND_URL`?

**Fix:**
- Set `FRONTEND_URL` on Railway
- Must match Vercel URL exactly (including `https://`)
- Redeploy backend

---

### ❌ Problem: Cookies Not Being Set

**Check:**
- [ ] Did you replace `participantController.js` with the fixed version?
- [ ] Browser DevTools → Application → Cookies
- [ ] Is `participantSession` cookie present?

**Fix:**
- Replace participantController.js with PRODUCTION-FIX version
- Commit and push
- Redeploy backend

---

### ❌ Problem: MongoDB Connection Failed

**Check Railway logs:**
```
✗ MongoDB connection failed
```

**Fix:**
- Check `MONGODB_URI` is correct on Railway
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Go to MongoDB Atlas → Network Access → Add IP Address → Allow from anywhere

---

## ✅ SUCCESS INDICATORS

You'll know it's working when:

1. ✅ Railway logs show:
   ```
   ✓ MongoDB connected successfully
   ✓ Server running on port 5000
   ✓ CORS configured for: https://your-vercel-url.vercel.app
   ```

2. ✅ Registration form submits successfully

3. ✅ Browser DevTools → Network shows:
   - POST `/api/participants/register` → Status 201
   - Response contains `{success: true, message: "Registration successful"}`

4. ✅ Redirects to `/participant` page

5. ✅ Participant dashboard loads with user data

6. ✅ Browser DevTools → Application → Cookies shows:
   - `participantSession` cookie is set
   - Domain: `.railway.app`
   - Secure: ✓
   - SameSite: None

---

## 📝 FILES CHANGED SUMMARY

| File | Change | Why |
|------|--------|-----|
| `backend/src/controllers/participantController.js` | Fixed cookie settings | Cross-domain cookies need `sameSite: 'none'` |
| `backend/src/config/index.js` | Support both FRONTEND_URL and CORS_ORIGIN | Backwards compatibility |
| `frontend/.env.production` | Removed trailing `/` from API URL | Prevents double slashes in requests |

---

## 🎉 DONE!

After completing all steps, your production deployment should work perfectly!

**Your URLs:**
- Frontend: `https://your-actual-vercel-url.vercel.app`
- Backend: `https://ai-sentimental-analysis-web-app-production.up.railway.app`
- Health Check: `https://ai-sentimental-analysis-web-app-production.up.railway.app/api/health`

---

## 🆘 STILL NEED HELP?

Share these details:

1. Railway deployment logs (last 50 lines)
2. Browser console errors (screenshot)
3. Network tab request/response (screenshot)
4. Your Vercel URL
5. Railway backend URL

I can help diagnose the specific issue!
