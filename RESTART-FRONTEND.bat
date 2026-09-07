@echo off
echo ========================================
echo  Restarting Frontend Server
echo ========================================
echo.

echo Killing frontend on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)

echo Waiting 2 seconds...
timeout /t 2 /nobreak > nul

echo Starting frontend...
cd frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Frontend is restarting!
echo Wait 10 seconds, then go to: http://localhost:3000/consent
echo.
pause
