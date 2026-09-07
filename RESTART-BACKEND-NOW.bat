@echo off
echo ========================================
echo  Restarting Backend (Rate Limit Fixed)
echo ========================================
echo.

echo Killing backend on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

echo Waiting 2 seconds...
timeout /t 2 /nobreak > nul

echo Starting backend with increased rate limit...
cd backend
start "Backend Server - Testing Mode" cmd /k "npm run dev"

echo.
echo ========================================
echo Backend is restarting!
echo ========================================
echo.
echo Wait 5 seconds, then test consent page again.
echo The rate limit is now 1000 requests instead of 5.
echo.
pause
