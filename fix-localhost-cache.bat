@echo off
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║     FIX LOCALHOST CACHE - Force Fresh Data                  ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [Step 1/5] Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
echo    ✓ Stopped
echo.

echo [Step 2/5] Clearing frontend build cache...
cd frontend
if exist .next (
    rmdir /s /q .next
    echo    ✓ Deleted .next folder
) else (
    echo    ℹ .next folder not found (already clean)
)

if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo    ✓ Deleted node_modules cache
) else (
    echo    ℹ node_modules cache not found (already clean)
)
cd ..
echo.

echo [Step 3/5] Starting backend...
cd backend
start "Backend Server" cmd /k "echo Backend starting... & npm run dev"
cd ..
timeout /t 3 >nul
echo    ✓ Backend started
echo.

echo [Step 4/5] Starting frontend...
cd frontend
start "Frontend Server" cmd /k "echo Frontend starting... & npm run dev"
cd ..
timeout /t 3 >nul
echo    ✓ Frontend started
echo.

echo [Step 5/5] Instructions
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  IMPORTANT: Follow these steps NOW:                         ║
echo ║                                                              ║
echo ║  1. Wait 10 seconds for servers to start completely         ║
echo ║  2. Open Chrome in INCOGNITO mode (Ctrl+Shift+N)            ║
echo ║  3. Go to: http://localhost:3000                            ║
echo ║  4. Login as admin                                          ║
echo ║  5. Go to Participants page                                 ║
echo ║  6. Check if count matches production (67)                  ║
echo ║                                                              ║
echo ║  If still wrong:                                             ║
echo ║  - Press F12 (DevTools)                                     ║
echo ║  - Right-click refresh button                               ║
echo ║  - Select "Empty Cache and Hard Reload"                     ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo ✅ Cache cleared! Servers restarted!
echo.
pause
