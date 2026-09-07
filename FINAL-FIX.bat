@echo off
cls
echo ============================================
echo   FINAL FIX - ONE CLICK SOLUTION
echo ============================================
echo.
echo Stopping everything...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
timeout /t 3 /nobreak >nul

echo Starting backend...
cd backend
start "BACKEND - Port 5000" cmd /k "npm run dev"
cd ..
timeout /t 8 /nobreak >nul

echo Starting frontend...
cd frontend  
start "FRONTEND - Port 3000" cmd /k "npm run dev"
cd ..

echo.
echo ============================================
echo   DONE! Wait 10 seconds then test:
echo ============================================
echo.
echo   http://localhost:3000/consent
echo.
echo Fill form, click button, should work!
echo.
pause
