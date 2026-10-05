@echo off
echo ================================================
echo   PRODUCTION DEPLOYMENT SCRIPT
echo   AI Sentiment Analysis Project
echo ================================================
echo.

echo [1/4] Checking Git status...
git status
echo.

echo [2/4] Adding all changes...
git add .
echo.

echo [3/4] Committing changes...
git commit -m "Production Fix: Delete operations, export authentication, and gender filter - Ready for client"
echo.

echo [4/4] Pushing to GitHub (triggers auto-deployment)...
git push origin main
echo.

echo ================================================
echo   DEPLOYMENT INITIATED SUCCESSFULLY!
echo ================================================
echo.
echo Next steps:
echo 1. Monitor Railway dashboard for backend deployment
echo 2. Monitor Vercel dashboard for frontend deployment
echo 3. Test all features after deployment completes
echo 4. Refer to PRODUCTION-READINESS-CHECKLIST.md
echo.
echo Backend: https://ai-sentimental-analysis-web-app-production.up.railway.app/api/health
echo Frontend: https://ai-sentimental-analysis-web-app-fro.vercel.app
echo.
pause
