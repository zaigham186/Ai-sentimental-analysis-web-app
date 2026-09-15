# Deployment Guide - Online Behavior Experiment Platform

Complete guide to deploy your application with:
- **Frontend**: Vercel
- **Backend**: Railway
- **NLP Service**: Railway
- **Database**: MongoDB Atlas

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Frontend (Vercel)                                         │
│  https://your-app.vercel.app                               │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├──► Backend API (Railway)
                   │    https://your-backend.up.railway.app
                   │    
                   └──► NLP Service (Railway)
                        https://your-nlp.up.railway.app
                        
                        ↓
                   MongoDB Atlas
                   (Cloud Database)
```

---

## Prerequisites

1. **GitHub Account** (to connect repositories)
2. **Vercel Account** (free tier available)
3. **Railway Account** (free tier available)
4. **MongoDB Atlas Account** (free tier available)

---

## Part 1: MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Cluster

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Click **"Build a Database"**
4. Choose **"FREE" (M0)** tier
5. Select a cloud provider (AWS recommended) and region closest to you
6. Name your cluster (e.g., `online-behavior-experiment`)
7. Click **"Create"**

### Step 2: Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **Password** authentication
4. Username: `admin` (or your choice)
5. Generate a secure password **SAVE THIS PASSWORD**
6. Set role: **"Read and write to any database"**
7. Click **"Add User"**

### Step 3: Whitelist IP Addresses

1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - This allows Railway and Vercel to connect
4. Click **"Confirm"**

### Step 4: Get Connection String

1. Go to **Database** → Click **"Connect"**
2. Choose **"Connect your application"**
3. Copy the connection string:
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add database name after `.net/`: 
   ```
   mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/online-behavior-experiment?retryWrites=true&w=majority
   ```

---

## Part 2: Backend Deployment (Railway)

### Step 1: Prepare Backend for Railway

Create `railway.json` in the `backend` folder:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100
  }
}
```

Create `Procfile` in the `backend` folder:

```
web: npm start
```

### Step 2: Update Package.json

Ensure your `backend/package.json` has:

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "start": "cross-env NODE_ENV=production node src/server.js"
  }
}
```

### Step 3: Deploy to Railway

1. Go to https://railway.app
2. Sign up / Log in with GitHub
3. Click **"New Project"**
4. Choose **"Deploy from GitHub repo"**
5. Select your repository
6. Choose **"Add Variables"**

### Step 4: Set Environment Variables

Add these variables in Railway dashboard:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/online-behavior-experiment?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
SESSION_SECRET=your-super-secret-session-key-also-change-this-min-32-chars
CORS_ORIGIN=https://your-frontend-app.vercel.app
NLP_SERVICE_URL=https://your-nlp-service.up.railway.app
```

### Step 5: Set Root Directory

1. In Railway project settings
2. Go to **"Settings"** tab
3. Set **"Root Directory"** to `backend`
4. Click **"Save"**

### Step 6: Deploy

1. Railway will automatically deploy
2. Wait for build to complete
3. Copy your backend URL: `https://your-backend.up.railway.app`

### Step 7: Test Backend

Visit: `https://your-backend.up.railway.app/api/health`

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-xx-xx..."
}
```

---

## Part 3: NLP Service Deployment (Railway)

### Step 1: Prepare NLP Service

Create `railway.json` in the `nlp-service` folder:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

Create `Procfile` in the `nlp-service` folder:

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Create `runtime.txt` in the `nlp-service` folder:

```
python-3.10.12
```

### Step 2: Update Requirements

Ensure `nlp-service/requirements.txt` includes:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
transformers==4.35.0
torch==2.1.0
detoxify==0.5.2
sentencepiece==0.1.99
protobuf==4.25.0
```

### Step 3: Deploy NLP Service to Railway

1. In Railway, click **"New Project"** (or add to existing project)
2. Choose **"Deploy from GitHub repo"**
3. Select your repository
4. Set **Root Directory** to `nlp-service`
5. Add environment variables:

```
PORT=8000
FASTMCP_LOG_LEVEL=ERROR
TRANSFORMERS_CACHE=/tmp/transformers_cache
```

### Step 4: Wait for Deployment

- **Important**: NLP service takes 5-10 minutes to deploy (downloads AI models)
- Railway will show build logs
- Wait for "Deployment successful" message

### Step 5: Test NLP Service

Visit: `https://your-nlp-service.up.railway.app/health`

Should return:
```json
{
  "status": "healthy"
}
```

### Step 6: Update Backend Environment

Go back to your **Backend Railway project** and update:

```
NLP_SERVICE_URL=https://your-nlp-service.up.railway.app
```

Click **"Deploy"** to restart backend with new URL.

---

## Part 4: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

Create `vercel.json` in the `frontend` folder:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend.up.railway.app/api/:path*"
    }
  ]
}
```

### Step 2: Update Frontend Environment

Update `frontend/.env.local` → Create `frontend/.env.production`:

```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_SITE_URL=https://your-frontend.vercel.app
```

### Step 3: Deploy to Vercel

1. Go to https://vercel.com
2. Sign up / Log in with GitHub
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 4: Set Environment Variables

Add in Vercel dashboard:

```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_SITE_URL=https://your-frontend.vercel.app
```

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Your site will be live at `https://your-project.vercel.app`

### Step 6: Update CORS in Backend

Go back to **Railway Backend** environment variables and update:

```
CORS_ORIGIN=https://your-project.vercel.app
```

Redeploy backend.

---

## Part 5: Final Configuration & Testing

### Step 1: Test Frontend Connection

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Check browser console for errors
3. Try registering a participant
4. Try admin login

### Step 2: Create Admin User

SSH into Railway backend or use Railway CLI:

```bash
railway run node backend/create-admin.js
```

Or manually add admin to MongoDB Atlas.

### Step 3: Test Full Workflow

1. ✅ Frontend loads
2. ✅ Participant registration works
3. ✅ Admin login works
4. ✅ Video responses work
5. ✅ AI coding works (NLP service)
6. ✅ Data saves to MongoDB

---

## Environment Variables Summary

### Backend (Railway)
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
SESSION_SECRET=...
CORS_ORIGIN=https://your-frontend.vercel.app
NLP_SERVICE_URL=https://your-nlp-service.up.railway.app
```

### NLP Service (Railway)
```
PORT=8000
TRANSFORMERS_CACHE=/tmp/transformers_cache
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_SITE_URL=https://your-frontend.vercel.app
```

---

## Troubleshooting

### Frontend can't connect to backend
- Check CORS_ORIGIN in backend matches your Vercel URL
- Check NEXT_PUBLIC_API_URL is correct
- Check Railway backend is running

### NLP Service not working
- Check NLP_SERVICE_URL in backend environment
- Wait 10 minutes for models to download
- Check Railway logs for errors

### Database connection errors
- Check MongoDB Atlas IP whitelist (0.0.0.0/0)
- Check MONGODB_URI is correct
- Check database user has permissions

### 502 Bad Gateway
- Railway service might be sleeping (free tier)
- Wait 30 seconds and retry
- Check Railway logs

---

## Cost Estimate

### Free Tier Limits

**Vercel (Free)**
- ✅ 100 GB bandwidth/month
- ✅ Unlimited sites
- ✅ Automatic HTTPS

**Railway (Free Trial)**
- ✅ $5 free credit/month
- ⚠️ Might need paid plan for production

**MongoDB Atlas (Free)**
- ✅ 512 MB storage
- ✅ Shared cluster
- ⚠️ Upgrade if >100 participants

### Recommended Paid Plans

**Railway** (~$10-20/month)
- Backend: $5-10/month
- NLP Service: $5-10/month

**MongoDB Atlas** (~$9/month)
- M2 tier (2GB RAM)
- Better for 100+ participants

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET and SESSION_SECRET
- [ ] Set correct CORS_ORIGIN
- [ ] Enable MongoDB IP whitelist properly
- [ ] Use HTTPS everywhere
- [ ] Don't commit .env files to Git
- [ ] Enable Railway/Vercel deployment protection

---

## Monitoring

### Railway Monitoring
- View logs in Railway dashboard
- Set up error notifications
- Monitor memory usage

### Vercel Monitoring
- View deployment logs
- Check Analytics tab
- Monitor response times

### MongoDB Atlas Monitoring
- Check Performance tab
- Monitor connection count
- Set up alerts for storage

---

## Backup Strategy

### Database Backup
1. MongoDB Atlas automatic backups (free tier: daily)
2. Manual export via mongodump
3. Download data via Export feature

### Code Backup
- GitHub repository (already done)
- Tag releases for versions

---

## Next Steps After Deployment

1. Test with real participants
2. Monitor performance
3. Set up error tracking (Sentry)
4. Configure custom domain (optional)
5. Set up analytics (Google Analytics)
6. Create backup schedule
7. Document admin procedures

---

## Support

For deployment issues:
- **Vercel**: https://vercel.com/docs
- **Railway**: https://docs.railway.app
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/

---

**Deployment Complete!** 🎉

Your application is now live and accessible worldwide.
MONGO_URI=mongodb+srv://24pwbcs1261_db_user:8MHlDFpV32MkzZ5g@cluster0.kbgbegk.mongodb.net/?appName=Cluster0
24pwbcs1261_db_user
FLNtaLd2IYSZnFr0
mongodb+srv://<db_username>:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/?appName=Cluster1
mongodb+srv://<db_username>:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/?appName=Cluster1
mongodb+srv://24pwbcs1261_db_user:FLNtaLd2IYSZnFr0@cluster1.cy0uc3w.mongodb.net/?appName=Cluster1