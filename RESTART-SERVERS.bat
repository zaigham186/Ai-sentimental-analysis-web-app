@echo off
echo ============================================
echo   Quick Server Restart Script
echo ============================================
echo.
echo This will help fix the registration loading issue
echo.
echo STEP 1: Open TWO terminal windows
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   npm start
echo.
echo Terminal 2 - Frontend:
echo   cd frontend
echo   npm run dev
echo.
echo STEP 2: After both servers start, clear browser cache:
echo   - Open Developer Tools (F12)
echo   - Right-click Refresh button
echo   - Select "Empty Cache and Hard Reload"
echo.
echo STEP 3: Test registration at:
echo   http://localhost:3000/consent
echo.
echo ============================================
echo.
pause
