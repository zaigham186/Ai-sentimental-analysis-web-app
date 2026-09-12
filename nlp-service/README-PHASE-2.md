# Research NLP Service - Phase 2

**Isolated Python FastAPI Microservice for Research Coding System**

**Version**: 2.0.0  
**Status**: Phase 2 Complete - Real NLP Models Implemented

---

## 🎯 Purpose

This is an independent Python microservice that provides NLP-based analysis for the cyberbullying research platform. It processes participant responses through multiple analysis dimensions:

- **Sentiment Analysis** ✅ - Emotional tone classification (XLM-RoBERTa multilingual)
- **Toxicity Detection** ✅ - Harmful content identification (Detoxify multilingual)
- **Aggression Scoring** ⏳ - Aggression level assessment (Phase 3)
- **Cyberbullying Classification** ⏳ - Research-validated cyberbullying detection (Phase 3)

---

## 📊 Current Status

### ✅ Phase 1 Completed
- Service architecture created
- FastAPI application configured
- Health check endpoints operational
- Swagger documentation available
- Python environment isolated
- Clean package structure established

### ✅ Phase 2 Completed (Current)
- ✅ **Sentiment analysis** using XLM-RoBERTa multilingual model
- ✅ **Toxicity detection** using Detoxify multilingual model
- ✅ **POST /analyze endpoint** with real inference
- ✅ **Models loaded once on startup** (cached for performance)
- ✅ **CPU/CUDA support** (auto-detected)
- ✅ **Request ID generation** & processing time measurement
- ✅ **Input validation** & comprehensive error handling
- ✅ **Privacy protection** (participant text NOT logged)
- ✅ **Comprehensive test suite** (48+ tests)
- ✅ **Complete isolation** from frontend/backend maintained

### ⏳ Phase 3 (Future)
- Aggression classification
- Cyberbullying detection
- Integration with Express backend
- Language detection (Urdu/Roman Urdu/English)

---

## 🚀 Quick Start

### Option 1: Windows Batch Script (Easiest)
```bash
cd nlp-service
START-SERVICE.bat
```

### Option 2: Manual Activation
```bash
cd nlp-service
venv\Scripts\activate
python app/main.py
```

### First Run Notes:
- **Models will download automatically** (~500MB-1GB)
- Downloaded to `~/.cache/huggingface/`
- Subsequent runs load from cache (much faster)
- Wait for "✅ NLP Service ready for inference!" message

### Access Points:
- **Service**: http://127.0.0.1:8001
- **Swagger UI**: http://127.0.0.1:8001/docs
- **Health Check**: http://127.0.0.1:8001/health
- **ReDoc**: http://127.0.0.1:8001/redoc

---

## 📋 API Endpoints

### GET /
Returns service information

**Response:**
```json
{
  "success": true,
  "service": "Research NLP Service",
  "version": "2.0.0",
  "phase": "Phase 2 - Real NLP Models",
  "models_loaded": true
}
```

### GET /health
Health check with model loading status

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "models_ready": true,
  "models": {
    "sentiment": {
      "loaded": true,
      "model": "cardiffnlp/twitter-xlm-roberta-base-sentiment",
      "device": "cpu"
    },
    "toxicity": {
      "loaded": true,
      "model": "multilingual"
    },
    "aggression": {
      "loaded": false,
      "status": "not_implemented"
    },
    "cyberbullying": {
      "loaded": false,
      "status": "not_implemented"
    }
  }
}
```

### POST /analyze ⭐ NEW IN PHASE 2

Comprehensive NLP analysis endpoint - performs sentiment and toxicity analysis on input text.

**Request:**
```json
{
  "text": "Text to analyze (1-5000 characters)",
  "context": {
    "videoTopic": "optional",
    "videoOrder": 1,
    "condition": "optional"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "text_metadata": {
    "character_count": 42,
    "word_count": 8,
    "language": "unknown"
  },
  "sentiment": {
    "label": "negative",
    "score": 0.85,
    "probabilities": {
      "negative": 0.85,
      "neutral": 0.10,
      "positive": 0.05
    }
  },
  "toxicity": {
    "overall_score": 0.15,
    "is_toxic": false,
    "categories": {
      "toxicity": 0.15,
      "severe_toxicity": 0.02,
      "obscene": 0.01,
      "threat": 0.01,
      "insult": 0.08,
      "identity_attack": 0.01
    },
    "threshold": 0.5
  },
  "metadata": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "processing_time_ms": 234.56,
    "models": {
      "sentiment": "cardiffnlp/twitter-xlm-roberta-base-sentiment",
      "toxicity": "detoxify-multilingual"
    },
    "device": "cpu",
    "timestamp": 1699564800.0
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input (empty text, whitespace only, too long)
- `503 Service Unavailable` - Models not ready (service still starting)
- `500 Internal Server Error` - Analysis failed

**Example cURL:**
```bash
curl -X POST http://127.0.0.1:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test message for analysis"}'
```

---

## 🧬 NLP Models

### 1. Sentiment Analysis (XLM-RoBERTa)
- **Model**: `cardiffnlp/twitter-xlm-roberta-base-sentiment`
- **Architecture**: XLM-RoBERTa (Cross-lingual Language Model)
- **Training**: ~198M tweets in 30+ languages
- **Output**: negative, neutral, positive
- **Features**: Multilingual, social media optimized
- **⚠️ Research Note**: Sentiment ≠ Cyberbullying

### 2. Toxicity Detection (Detoxify)
- **Model**: Detoxify `multilingual`
- **Architecture**: XLM-RoBERTa based toxic comment classifier
- **Categories**: 
  - toxicity
  - severe_toxicity
  - obscene
  - threat
  - insult
  - identity_attack
- **Features**: Multilingual, multi-dimensional scoring
- **⚠️ Research Note**: Toxicity ≠ Cyberbullying

---

## 🧪 Testing

### Run All Tests
```bash
pytest
```

### Run with Verbose Output
```bash
pytest -v
```

### Run Specific Test Files
```bash
pytest tests/test_sentiment.py -v
pytest tests/test_toxicity.py -v
pytest tests/test_analyze.py -v
```

### Test Coverage
```bash
pytest --cov=app tests/
```

### Test Summary
- ✅ **Sentiment analyzer** - 13 tests
- ✅ **Toxicity analyzer** - 15 tests
- ✅ **POST /analyze integration** - 20+ tests
- ✅ **Edge cases** (empty, whitespace, long text)
- ✅ **Error handling** (400, 500, 503)
- **Total: 48+ tests**

---

## 📁 Project Structure

```
nlp-service/
│
├── app/
│   ├── __init__.py              # Package initialization
│   ├── main.py                  # FastAPI app (POST /analyze)
│   │
│   ├── models/                  # Future: Model management
│   │   └── __init__.py
│   │
│   ├── services/                # Analysis services
│   │   ├── __init__.py
│   │   ├── analyzer.py          # ✅ NEW: UnifiedAnalyzer
│   │   ├── sentiment.py         # ✅ XLM-RoBERTa sentiment
│   │   ├── toxicity.py          # ✅ Detoxify toxicity
│   │   ├── aggression.py        # ⏳ Phase 3
│   │   └── cyberbullying.py     # ⏳ Phase 3
│   │
│   └── schemas/                 # Pydantic models
│       ├── __init__.py
│       └── analysis.py          # ✅ Phase 2 schemas
│
├── tests/                       # Test suite (48+ tests)
│   ├── __init__.py
│   ├── test_health.py          # Health tests
│   ├── test_sentiment.py       # ✅ 13 tests
│   ├── test_toxicity.py        # ✅ 15 tests
│   └── test_analyze.py         # ✅ 20+ tests
│
├── venv/                        # Virtual environment
├── .env                         # Configuration
├── .gitignore                   # Git exclusions
├── requirements.txt             # Dependencies
├── START-SERVICE.bat            # Windows startup script
├── PHASE-1-VALIDATION-COMPLETE.md
├── PHASE-2-IMPLEMENTATION-COMPLETE.md
└── README.md                    # Main documentation
```

---

## ⚙️ Configuration

Environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Service name | `Research NLP Service` |
| `APP_VERSION` | Service version | `2.0.0` |
| `HOST` | Server host | `127.0.0.1` |
| `PORT` | Server port | `8001` |
| `SENTIMENT_MODEL` | HuggingFace model | `cardiffnlp/twitter-xlm-roberta-base-sentiment` |
| `TOXICITY_MODEL` | Detoxify variant | `multilingual` |
| `MAX_TEXT_LENGTH` | Max text length | `5000` |
| `LOG_LEVEL` | Logging level | `INFO` |

---

## 🏗️ Architecture

### System Isolation

```
┌─────────────────────────────────────────┐
│    Next.js Frontend (Unchanged)         │
│    - Admin Portal                       │
│    - Participant Interface              │
└──────────────┬──────────────────────────┘
               │ HTTP/REST
               ↓
┌─────────────────────────────────────────┐
│    Express Backend (Unchanged)          │
│    - Authentication                     │
│    - Database (MongoDB)                 │
│    - Existing CodingAI Service         │
└──────────────┬──────────────────────────┘
               │ 
               │ (Phase 3: Integration)
               ↓
┌─────────────────────────────────────────┐
│    FastAPI NLP Service (Phase 2 ✅)     │
│    - ✅ Sentiment (XLM-RoBERTa)         │
│    - ✅ Toxicity (Detoxify)             │
│    - ⏳ Aggression (Phase 3)            │
│    - ⏳ Cyberbullying (Phase 3)         │
└─────────────────────────────────────────┘
```

**Current State:**
- ✅ NLP service runs independently on port 8001
- ✅ Real sentiment & toxicity models loaded
- ✅ POST /analyze endpoint functional
- ❌ No communication with Express (isolated)
- ❌ No database dependencies
- ❌ No authentication (local only)

**Future (Phase 3):**
- Express will call NLP service via HTTP
- Results flow to CodingAI Service
- Aggression & cyberbullying analysis added

---

## ⚠️ Important Notes

### Research Integrity
- **Sentiment ≠ Toxicity ≠ Aggression ≠ Cyberbullying**
- Model confidence ≠ Scientific accuracy
- Negative sentiment ≠ Cyberbullying
- Toxicity ≠ Cyberbullying
- These are **component analyses**, not final classifications

### Multilingual Performance
- Models claim multilingual support
- **Urdu/Roman Urdu performance NOT validated**
- Empirical testing required on actual research data
- May need language-specific models

### Privacy
- Request IDs are logged
- **Participant text is NOT logged** (privacy)
- Logs show character count, not content
- Follows research ethics guidelines

### Model Caching
- Models download to `~/.cache/huggingface/` on first run
- Total size: ~500MB-1GB
- **DO NOT commit models to git** (.gitignore configured)
- Subsequent runs load from cache (fast)

### Device Support
- Service auto-detects CPU/CUDA
- Works on CPU (slower but functional)
- If CUDA available, uses GPU automatically (faster)
- No code changes needed for GPU support

---

## 🔒 Isolation Verification

### Modified Files: ONLY in nlp-service/
✅ All changes isolated to `nlp-service/` directory  
✅ NO changes to `frontend/`  
✅ NO changes to `backend/`  
✅ NO changes to MongoDB schemas  
✅ NO changes to Express routes  
✅ NO changes to frontend components  

### Verify with Git:
```bash
git status
# Should show ONLY nlp-service/ files
```

---

## 📚 Documentation

- **README.md** - Main documentation (this file)
- **PHASE-1-VALIDATION-COMPLETE.md** - Phase 1 completion report
- **PHASE-2-IMPLEMENTATION-COMPLETE.md** - Phase 2 completion report
- **Swagger UI** - http://127.0.0.1:8001/docs
- **ReDoc** - http://127.0.0.1:8001/redoc

---

## 🎓 Dependencies

See `requirements.txt` for full list. Key dependencies:

- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **torch** - PyTorch (models)
- **transformers** - HuggingFace transformers
- **detoxify** - Toxicity detection
- **pydantic** - Data validation
- **pytest** - Testing framework

---

## 🚀 Next Steps

1. **Start the service** - `START-SERVICE.bat` or manual activation
2. **Wait for models to load** - Watch console output
3. **Test manually** - Try http://127.0.0.1:8001/docs
4. **Run tests** - `pytest -v`
5. **Try POST /analyze** - Send sample text
6. **Verify results** - Check sentiment & toxicity output
7. **Proceed to Phase 3** - Once validated

---

## 📞 Support

For questions or issues:
1. Check Swagger UI for API documentation
2. Review test files for usage examples
3. Check PHASE-2-IMPLEMENTATION-COMPLETE.md for details
4. Ensure models downloaded successfully (~1GB)

---

**Phase 2 Complete** ✅  
**Version**: 2.0.0  
**Ready for validation and Phase 3**
