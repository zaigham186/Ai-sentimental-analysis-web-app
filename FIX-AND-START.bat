@echo off
cls
echo ========================================
echo  FIX EVERYTHING AND START
echo ========================================
echo.

echo [1/5] Killing port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul >nul
)
echo     Done!

echo [2/5] Killing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul >nul
)
echo     Done!

echo [3/5] Fixing MongoDB indexes...
cd backend
node fix-indexes.js
cd ..
echo     Done!

echo [4/5] Starting backend...
start "Backend (Port 5000)" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak >nul
echo     Done!

echo [5/5] Starting frontend...
start "Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"
echo     Done!

echo.
echo ========================================
echo  ALL DONE!
echo ========================================
echo.
echo Two new windows opened:
echo   1. Backend (Port 5000)
echo   2. Frontend (Port 3000)
echo.
echo Wait 10 seconds, then open browser:
echo   http://localhost:3000/test-api
echo.
echo Test all 3 buttons, then go to:
echo   http://localhost:3000/consent
echo.
pause
