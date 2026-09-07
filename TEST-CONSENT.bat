@echo off
echo ========================================
echo  Testing Consent API
echo ========================================
echo.
echo Testing backend health...
curl http://localhost:5000/api/health
echo.
echo.
echo Testing consent submission...
curl -X POST http://localhost:5000/api/participants/consent -H "Content-Type: application/json" -d "{\"consentGiven\":true,\"agreedToDataUse\":true,\"agreedToWithdrawalTerms\":true,\"electronicSignature\":\"Test User\"}"
echo.
echo.
echo ========================================
echo If you see success messages above,
echo the backend API is working correctly!
echo ========================================
pause
