@echo off
echo ========================================
echo  QUICK FIX - Kill Port and Fix Indexes
echo ========================================
echo.

echo Step 1: Killing process on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /F /PID %%a 2>nul
    echo ✓ Killed PID %%a
)

echo.
echo Step 2: Fixing MongoDB indexes...
cd backend
node fix-indexes.js

echo.
echo Step 3: Starting backend server...
start "Backend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo  Done! Backend is starting...
echo ========================================
echo.
echo Check the "Backend Server" window.
echo Should see: "Server running on port 5000"
echo.
pause
