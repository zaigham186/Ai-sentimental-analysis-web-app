@echo off
echo ========================================
echo  Stopping All Servers
echo ========================================
echo.

echo Killing processes on port 5000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /F /PID %%a 2>nul
)

echo Killing processes on port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo All servers stopped!
echo.
pause
