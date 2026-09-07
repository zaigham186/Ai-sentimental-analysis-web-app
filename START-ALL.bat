@echo off
echo ========================================
echo  Starting Cyberbullying Research Platform
echo ========================================
echo.

echo Checking port 5000...
netstat -ano | findstr :5000 > nul
if %errorlevel%==0 (
    echo WARNING: Port 5000 is already in use!
    echo Run kill-port-5000.bat first or close existing backend server.
    pause
    exit /b 1
)

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo  Both servers are starting!
echo ========================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Open your browser to: http://localhost:3000/consent
echo.
echo Press any key to close this window...
pause > nul
