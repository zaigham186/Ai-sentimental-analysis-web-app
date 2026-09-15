# 🚂 Railway Deployment Fix

## Problem
Railway error: "No start command detected" when deploying backend.

## Root Cause
Railway detected a workspace (monorepo) at the root level and couldn't find the start command because it was looking in the wrong directory.

## ✅ Solution Applied

I've fixed the following issues:

### 1. Fixed Duplicate Start Scripts ✅
**File**: `backend/package.json`

**Before** (had duplicate "start"):
```json
"scripts": {
  "dev": "node src/server.js",
  "start": "node src/server.js",       // ❌ Duplicate
  "start": "cross-env NODE_ENV=production node src/server.js", // ❌ Duplicate
}
```

**After**:
```json
"scripts": {
  "dev": "node src/server.js",
  "start": "cross-env NODE_ENV=production node src/server.js", // ✅ Single, correct
  "start:win": "set NODE_ENV=production && node src/server.js"
}
```

### 2. Created nixpacks.toml ✅
**File**: `backend/nixpacks.toml`

This explicitly tells Railway/Nixpacks how to build and start your app:
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm ci --production=false"]

[start]
cmd = "npm start"
```

### 3. Created .railwayignore ✅
**File**: `backend/.railwayignore`

Tells Railway what files to ignore during deployment.

---

## 🚀 Deploy to Railway - Step by Step

### **Step 1: Set Root Directory in Railway Dashboard**

**CRITICAL**: Railway must know to deploy from the `backend` folder, not the root.

1. Go to your Railway project
2. Click on your service
3. Go to **Settings** tab
4. Find **"Root Directory"** or **"Service Settings"**
5. Set it to: `backend`
6. Click **"Save"** or **"Update"**

### **Step 2: Verify Environment Variables**

Make sure these are set in Railway dashboard:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://24pwbcs1261_db_user:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/cyberbullying-research?retryWrites=true&w=majority
JWT_SECRET=<generate-a-strong-64-char-secret>
SESSION_SECRET=<generate-another-strong-64-char-secret>
CORS_ORIGIN=https://your-frontend.vercel.app
NLP_SERVICE_URL=https://your-nlp-service.up.railway.app
```

**Generate secrets**:
```bash
# Run these commands locally and copy the output
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Step 3: Deploy**

Railway should automatically detect the changes and redeploy.

If not:
1. Go to **Deployments** tab
2. Click **"Redeploy"**

### **Step 4: Check Deployment Logs**

Watch the logs for:
```
✓ nixpacks build started
✓ installing packages
✓ starting server
✓ MongoDB connected successfully
✓ Server running on port 5000
```

### **Step 5: Test the Deployment**

Once deployed, test your backend:

```
https://your-backend.up.railway.app/api/health
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

---

## 🔧 Alternative: Deploy Using Railway CLI

If the dashboard method doesn't work:

### Install Railway CLI:
```bash
npm install -g railway
```

### Login:
```bash
railway login
```

### Link Project:
```bash
cd backend
railway link
```

### Deploy:
```bash
railway up
```

---

## ⚠️ Common Issues & Fixes

### Issue 1: "Module not found" errors
**Fix**: Make sure `npm ci` runs with `--production=false` to install devDependencies

### Issue 2: "EADDRINUSE port already in use"
**Fix**: Railway assigns the `PORT` env variable automatically. Your code should use `process.env.PORT`

Check `backend/src/config/index.js`:
```javascript
port: process.env.PORT || 5000  // ✅ Correct
```

### Issue 3: MongoDB connection fails
**Fix**: 
1. Check MongoDB Atlas IP whitelist (should be `0.0.0.0/0`)
2. Verify `MONGODB_URI` in Railway environment variables
3. Check connection string format

### Issue 4: Still showing "workspace detected" error

**Root Cause**: The root `package.json` has this configuration:
```json
{
  "workspaces": ["frontend", "backend"]
}
```

This tells Railway you have a monorepo with 2 packages, which confuses the deployment.

**Fix** (Choose ONE):

**Option 1 (RECOMMENDED)**: Set Root Directory in Railway
1. Go to Railway dashboard → Your service → **Settings**
2. Find **"Root Directory"** field
3. Enter: `backend`
4. Click **Save**
5. Railway will now only look inside the `backend/` folder and ignore the root workspace

**Option 2**: Temporarily rename root package.json (if Option 1 doesn't work)
```bash
# In the root directory
mv package.json package.json.backup
mv package-lock.json package-lock.json.backup
```
Then push to Railway. The root workspace will be ignored.

**⚠️ Warning**: Option 2 will break your local `npm run dev:backend` commands. Use Option 1 instead.

---

## 📁 Required Files Checklist

Make sure these files exist in your `backend/` folder:

- ✅ `package.json` (with correct "start" script)
- ✅ `Procfile` (contains: `web: npm start`)
- ✅ `railway.json` (deployment configuration)
- ✅ `nixpacks.toml` (NEW - build configuration)
- ✅ `.railwayignore` (NEW - ignore unnecessary files)
- ✅ `src/server.js` (main entry point)

---

## 🎯 Quick Checklist Before Deploying

- [ ] Duplicate "start" script removed from package.json
- [ ] `nixpacks.toml` created in backend folder
- [ ] `.railwayignore` created in backend folder
- [ ] Railway Root Directory set to `backend`
- [ ] All environment variables configured in Railway
- [ ] MongoDB URI is correct and accessible
- [ ] JWT_SECRET and SESSION_SECRET are strong (64+ characters)
- [ ] CORS_ORIGIN points to your Vercel frontend URL

---

## ✅ Expected Outcome

After fixing these issues, Railway will:

1. ✅ Detect Node.js project in `backend/` folder
2. ✅ Find `npm start` command
3. ✅ Install dependencies with `npm ci`
4. ✅ Start server with `npm start`
5. ✅ Health check passes at `/api/health`
6. ✅ Deployment succeeds

---

## 🆘 Still Having Issues?

### Check Railway Logs:
1. Go to Railway dashboard
2. Click on your service
3. Go to **"Deployments"** tab
4. Click on the latest deployment
5. Check **"Build Logs"** and **"Deploy Logs"**

### Common Log Messages:

**✅ Success**:
```
✓ Starting server...
✓ MongoDB connected successfully
✓ Server running on port 5000
✓ Deployment successful
```

**❌ Failure**:
```
✗ Module not found: 'cross-env'
```
**Fix**: Run `npm install` locally and commit `package-lock.json`

```
✗ MongoDB connection failed
```
**Fix**: Check MongoDB Atlas IP whitelist and connection string

```
✗ Port already in use
```
**Fix**: This shouldn't happen on Railway. Check your code uses `process.env.PORT`

---

## 🎉 Success!

Once deployed, your backend URL will be:
```
https://your-project-name.up.railway.app
```

Test it:
```bash
curl https://your-project-name.up.railway.app/api/health
```

---

## Next Steps

1. ✅ Backend deployed → Continue to deploy NLP service
2. ✅ NLP service deployed → Deploy frontend to Vercel
3. ✅ Frontend deployed → Update CORS_ORIGIN in backend
4. ✅ All deployed → Test complete workflow

**Your deployment should now work!** 🚀
