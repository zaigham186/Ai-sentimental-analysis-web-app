@echo off
echo ============================================
echo   Restarting All Servers
echo ============================================
echo.

echo Step 1: Killing processes on ports 3000, 3001, and 5000...
echo.

echo Killing port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo Killing port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo Killing port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo.
echo ✓ Ports cleared!
echo.
echo ============================================
echo   NOW START SERVERS IN SEPARATE TERMINALS
echo ============================================
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   npm start
echo.
echo Terminal 2 - Frontend:
echo   cd frontend
echo   npm run dev
echo.
echo ============================================
pause
