@echo off
title AI Cyberbullying Research Platform - Launcher
echo ========================================================
echo   AI Cyberbullying Research Platform
echo   Multi-Service Startup Launcher
echo ========================================================
echo.

echo 1. Starting NLP Microservice (FastAPI, Port 8001)...
start "NLP Microservice (Port 8001)" cmd /k "cd nlp-service && chcp 65001 > nul && set PYTHONIOENCODING=utf-8 && call venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8001"

timeout /t 3 /nobreak > nul

echo 2. Starting Express Backend API (Node.js, Port 5000)...
start "Backend API (Port 5000)" cmd /k "cd backend && npm run dev"

timeout /t 2 /nobreak > nul

echo 3. Starting Frontend Web App (Next.js, Port 3000)...
start "Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   All 3 services are launching in dedicated windows:
echo     - Python NLP Service:  http://127.0.0.1:8001
echo     - Express Backend:     http://localhost:5000
echo     - Next.js Frontend:    http://localhost:3000
echo ========================================================
echo.
pause
