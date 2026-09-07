@echo off
echo Checking for processes using port 5000...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo Found process: %%a
    echo Killing process %%a...
    taskkill /F /PID %%a
    echo.
)

echo Done!
pause
