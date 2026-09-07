# Deployment Guide

## Overview
Deployment architecture for the Cyberbullying Research Platform.

## Deployment Architecture

```
Frontend (Vercel)  ─────>  Backend (Node Host)  ─────>  MongoDB Atlas
     HTTPS                      HTTPS                    TLS/SSL
```

## Prerequisites

### Required Accounts
1. **GitHub** - Code repository
2. **Vercel** - Frontend hosting
3. **MongoDB Atlas** - Database hosting
4. **Node Hosting Service** - Backend API (Railway, Render, DigitalOcean, etc.)

### Required Tools
- Git
- Node.js 18+
- MongoDB Compass (for database management)

---

## Database Deployment (MongoDB Atlas)

### Setup Steps

1. **Create MongoDB Atlas Account**
   - Visit https://www.mongodb.com/cloud/atlas
   - Sign up for free tier

2. **Create Cluster**
   - Choose provider (AWS recommended)
   - Select region (closest to target users)
   - Choose tier: M0 (free) for testing, M10+ for production
   - Name: `cyberbullying-research-prod`

3. **Create Database User**
   - Go to Database Access
   - Add new database user
   - Username: `research_api_user`
   - Password: Generate secure password (save securely)
   - Role: Read and write to any database

4. **Configure Network Access**
   - Go to Network Access
   - Add IP address
   - For development: Add your current IP
   - For production: Add backend server IPs (or 0.0.0.0/0 temporarily)

5. **Get Connection String**
   - Click "Connect" on cluster
   - Choose "Connect your application"
   - Copy connection string
   - Format: `mongodb+srv://research_api_user:<password>@cluster.mongodb.net/cyberbullying-research?retryWrites=true&w=majority`

6. **Create Database**
   - Use MongoDB Compass or Atlas UI
   - Database name: `cyberbullying-research`

---

## Backend Deployment

### Option 1: Railway

1. **Create Railway Account**
   - Visit https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select `backend` directory as root

3. **Configure Environment Variables**
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://research_api_user:<password>@cluster.mongodb.net/cyberbullying-research
   SESSION_SECRET=<generate-32-char-random-string>
   FRONTEND_URL=https://your-frontend.vercel.app
   NODE_ENV=production
   ```

4. **Deploy**
   - Railway auto-deploys on push to main branch
   - Note the deployment URL (e.g., `https://your-app.railway.app`)

### Option 2: Render

1. **Create Render Account**
   - Visit https://render.com
   - Sign up with GitHub

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repository
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`

3. **Configure Environment Variables**
   Same as Railway above

4. **Deploy**
   - Click "Create Web Service"
   - Note the deployment URL

### Option 3: DigitalOcean App Platform

1. **Create DigitalOcean Account**
2. **Create App**
   - Apps → Create App
   - Choose GitHub repository
   - Select backend directory
3. **Configure Environment**
   Same environment variables as above
4. **Deploy**

---

## Frontend Deployment (Vercel)

### Setup Steps

1. **Create Vercel Account**
   - Visit https://vercel.com
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Framework preset: Next.js (auto-detected)
   - Root directory: `frontend`

3. **Configure Build Settings**
   - Build command: `npm run build` (default)
   - Output directory: `.next` (default)
   - Install command: `npm install` (default)

4. **Configure Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Note the deployment URL (e.g., `https://your-app.vercel.app`)

6. **Configure Custom Domain (Optional)**
   - Go to project settings
   - Domains → Add domain
   - Follow DNS configuration instructions

---

## Post-Deployment Configuration

### 1. Update Backend CORS
Update `FRONTEND_URL` environment variable in backend:
```
FRONTEND_URL=https://your-actual-frontend.vercel.app
```

### 2. Update Frontend API URL
Update `NEXT_PUBLIC_API_URL` in Vercel:
```
NEXT_PUBLIC_API_URL=https://your-actual-backend.railway.app
```

### 3. Test Connection
- Visit frontend URL
- Check that homepage loads
- Verify API health check works

### 4. Configure MongoDB IP Whitelist
- If using specific IPs, update MongoDB Atlas network access
- Add backend server IP address
- Remove 0.0.0.0/0 if used temporarily

---

## Environment Variables Reference

### Backend (.env)
```bash
# Required
PORT=5000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
SESSION_SECRET=minimum-32-character-random-string
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production

# Optional (future phases)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASSWORD=email-password
```

### Frontend (Vercel)
```bash
# Required
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Optional (future phases)
NEXT_PUBLIC_ANALYTICS_ID=analytics-id
```

---

## Continuous Deployment

### Automatic Deployment
Both Vercel and Railway support automatic deployment:
- Push to `main` branch → Auto-deploy to production
- Push to other branches → Deploy preview (Vercel) or separate environment

### Deployment Pipeline
```
1. Developer pushes to GitHub
2. Vercel/Railway detects push
3. Run build process
4. Run tests (if configured)
5. Deploy if successful
6. Notify deployment status
```

---

## Monitoring and Maintenance

### Application Monitoring
- **Vercel:** Built-in analytics and logs
- **Railway/Render:** Built-in logs and metrics
- **MongoDB Atlas:** Performance monitoring, alerts

### Log Access
- **Backend:** Railway/Render dashboard → Logs
- **Frontend:** Vercel dashboard → Logs
- **Database:** MongoDB Atlas → Metrics

### Backups
- **MongoDB Atlas:** Automatic daily backups (free tier: 2-day retention)
- **Code:** GitHub repository (version controlled)

### Health Checks
Monitor these endpoints:
- `https://your-frontend.vercel.app` - Frontend health
- `https://your-backend.railway.app/api/health` - Backend health

---

## Rollback Procedure

### Frontend Rollback (Vercel)
1. Go to Vercel dashboard
2. Deployments tab
3. Find previous successful deployment
4. Click "..." → "Promote to Production"

### Backend Rollback (Railway/Render)
1. Go to Railway/Render dashboard
2. Deployments tab
3. Find previous deployment
4. Redeploy previous version

### Database Rollback
1. Go to MongoDB Atlas
2. Backup tab
3. Restore from point-in-time backup

---

## Security Checklist

Before going live:
- [ ] All environment variables set correctly
- [ ] MongoDB IP whitelist configured
- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] SESSION_SECRET is strong and unique
- [ ] Default credentials changed
- [ ] Rate limiting configured
- [ ] CORS restricted to frontend domain
- [ ] Error messages don't expose sensitive info
- [ ] Monitoring and alerts configured

---

## Troubleshooting

### Frontend Can't Connect to Backend
- Check `NEXT_PUBLIC_API_URL` in Vercel
- Verify backend is running
- Check CORS configuration in backend
- Check browser console for errors

### Backend Can't Connect to Database
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist
- Verify database user credentials
- Check MongoDB Atlas cluster status

### Build Failures
- Check build logs in Vercel/Railway
- Verify all dependencies in package.json
- Check Node.js version compatibility
- Verify environment variables are set

### Performance Issues
- Monitor database queries (MongoDB Atlas)
- Check response times (Vercel Analytics)
- Review rate limiting settings
- Consider upgrading hosting tier

---

## Cost Estimates

### Free Tier (Development/Testing)
- **Vercel:** Free (hobby plan)
- **Railway:** $5/month credit (free tier)
- **MongoDB Atlas:** Free (M0 cluster)
- **Total:** ~$0-5/month

### Production (Low Traffic)
- **Vercel:** Free - $20/month
- **Railway/Render:** $7-10/month
- **MongoDB Atlas:** $9-57/month (M10 cluster)
- **Total:** ~$16-87/month

### Production (High Traffic)
- Scale based on actual usage
- Monitor costs in each platform dashboard

---

## Next Steps

After Phase 1 deployment:
1. Monitor logs for errors
2. Test all functionality
3. Set up uptime monitoring (e.g., UptimeRobot)
4. Configure backup alerts
5. Document any deployment issues
6. Prepare for Phase 2 deployment

---

**Document Version:** 1.0  
**Phase:** 1 (Foundation deployment ready)  
**Last Updated:** Phase 1
