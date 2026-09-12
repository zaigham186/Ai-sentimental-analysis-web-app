# NLP Service - Quick Start Guide

## Current Status: Phase 1 Complete ✅

The NLP service infrastructure is **fully operational** and ready for Phase 2 development.

---

## Start the Service

### Windows
```bash
cd nlp-service
START-SERVICE.bat
```

### Manual Start
```bash
cd nlp-service
venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

---

## Test the Service

### Quick Endpoint Tests
```bash
# Root endpoint
curl http://127.0.0.1:8001/

# Health check
curl http://127.0.0.1:8001/health

# Models info
curl http://127.0.0.1:8001/models
```

### Run Test Suite
```bash
cd nlp-service
venv\Scripts\activate
pytest -v
```

---

## Access Documentation

- **Swagger UI:** http://127.0.0.1:8001/docs
- **ReDoc:** http://127.0.0.1:8001/redoc
- **OpenAPI:** http://127.0.0.1:8001/openapi.json

---

## Expected Output

When the service starts, you should see:
```
✅ Research NLP Service v1.0.0 starting...
📍 Running on http://127.0.0.1:8001
📚 Swagger docs: http://127.0.0.1:8001/docs
⚠️  Phase 1: Infrastructure only - No NLP models loaded
INFO: Application startup complete.
```

---

## Phase 1 Features

✅ Working:
- Health check endpoint
- Service info endpoint
- Models configuration endpoint
- Swagger documentation
- OpenAPI specification
- Test framework

⏸️ Not Implemented Yet (Phase 2):
- NLP model loading
- Sentiment analysis
- Toxicity detection
- Aggression scoring
- Cyberbullying classification
- /analyze endpoints

---

## Troubleshooting

### Service Won't Start
```bash
# Check if port 8001 is available
netstat -ano | findstr :8001

# If occupied, kill the process or change port in .env
```

### Import Errors
```bash
# Reinstall dependencies
cd nlp-service
venv\Scripts\activate
pip install -r requirements.txt
```

### Tests Failing
```bash
# Ensure service is NOT running when testing
# Tests start their own test server
```

---

## Next Steps

**Ready for Phase 2:** ✅ YES

See `NLP-SERVICE-IMPLEMENTATION-REPORT.md` and `PHASE-1-VALIDATION-COMPLETE.md` for details.

---

## Support

- **Full Documentation:** See `README.md`
- **Implementation Report:** See `NLP-SERVICE-IMPLEMENTATION-REPORT.md`
- **Validation Report:** See `PHASE-1-VALIDATION-COMPLETE.md`
