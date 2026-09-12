# 🚀 QUICK START - Phase 2 Validation

**Ready to test the NLP service with real models!**

---

## ⚡ Quick Validation (5 Steps)

### Step 1: Start the Service
```bash
cd nlp-service
START-SERVICE.bat
```

**Expected Output:**
```
✅ Research NLP Service v2.0.0 starting...
📍 Running on http://127.0.0.1:8001
📚 Swagger docs: http://127.0.0.1:8001/docs
Initializing UnifiedAnalyzer...
Loading NLP models (this may take a minute)...
Loading sentiment model: cardiffnlp/twitter-xlm-roberta-base-sentiment
Loading toxicity model: multilingual
✅ Sentiment model loaded successfully on cpu
✅ Toxicity model loaded successfully
✅ NLP Service ready for inference!
```

**First Run**: Models download (~500MB-1GB, takes 2-5 minutes)  
**Subsequent Runs**: Load from cache (30-60 seconds)

---

### Step 2: Test Health Check
```bash
curl http://127.0.0.1:8001/health
```

**Expected Response:**
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
    }
  }
}
```

✅ **Pass if**: `models_ready: true` and both models show `loaded: true`

---

### Step 3: Test POST /analyze
```bash
curl -X POST http://127.0.0.1:8001/analyze \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"This is a wonderful day!\"}"
```

**Expected Response Structure:**
```json
{
  "success": true,
  "request_id": "unique-uuid",
  "text_metadata": {
    "character_count": 23,
    "word_count": 5
  },
  "sentiment": {
    "label": "positive",
    "score": 0.XX,
    "probabilities": {...}
  },
  "toxicity": {
    "overall_score": 0.XX,
    "is_toxic": false,
    "categories": {...}
  },
  "metadata": {
    "processing_time_ms": 234.56,
    "models": {...},
    "device": "cpu"
  }
}
```

✅ **Pass if**: 
- Response has all required fields
- `sentiment.label` is one of: negative, neutral, positive
- `toxicity.is_toxic` is true or false
- `processing_time_ms` is reasonable (< 10000ms)

---

### Step 4: Test Swagger UI
1. Open browser: http://127.0.0.1:8001/docs
2. Find **POST /analyze** endpoint
3. Click "Try it out"
4. Enter test text: "I love this product!"
5. Click "Execute"
6. Verify response structure

✅ **Pass if**: Swagger UI loads and POST /analyze works interactively

---

### Step 5: Run Automated Tests
```bash
cd nlp-service
venv\Scripts\activate
pytest tests/ -v
```

**Expected Output:**
```
tests/test_sentiment.py::test_sentiment_analyzer_initialization PASSED
tests/test_sentiment.py::test_sentiment_model_loading PASSED
tests/test_sentiment.py::test_sentiment_positive PASSED
... (13 sentiment tests)

tests/test_toxicity.py::test_toxicity_analyzer_initialization PASSED
tests/test_toxicity.py::test_toxicity_model_loading PASSED
tests/test_toxicity.py::test_toxicity_non_toxic_text PASSED
... (15 toxicity tests)

tests/test_analyze.py::test_root_endpoint PASSED
tests/test_analyze.py::test_health_endpoint PASSED
tests/test_analyze.py::test_analyze_valid_request PASSED
... (20+ integration tests)

========== 48 passed in XX.XXs ==========
```

✅ **Pass if**: All tests pass (48+)

---

## ✅ SUCCESS CRITERIA

| Check | Status |
|-------|--------|
| Service starts without errors | ⬜ |
| Models load successfully | ⬜ |
| GET /health shows models_ready: true | ⬜ |
| POST /analyze returns valid response | ⬜ |
| Swagger UI accessible | ⬜ |
| All tests pass (48+) | ⬜ |
| frontend/ unchanged | ⬜ |
| backend/ unchanged | ⬜ |

**If all checkboxes pass: Phase 2 VALIDATED ✅**

---

## 🐛 Troubleshooting

### Problem: Models not loading
**Solution**: 
- Check internet connection (first run needs download)
- Check disk space (~1GB needed)
- Check `~/.cache/huggingface/` permissions

### Problem: "ModuleNotFoundError"
**Solution**:
```bash
cd nlp-service
venv\Scripts\activate
pip install -r requirements.txt
```

### Problem: Port 8001 already in use
**Solution**:
- Change PORT in `.env` to different value (e.g., 8002)
- Or kill existing process on port 8001

### Problem: Tests fail with "models not ready"
**Solution**:
- Wait longer for models to load
- Check service logs for errors
- Verify GET /health shows models_ready: true

### Problem: Slow inference (> 5 seconds)
**Expected**: First inference takes longer (model warmup)
- Subsequent inferences should be faster
- CPU is slower than GPU (normal)

---

## 📊 Sample Test Cases

### Test 1: Positive Sentiment
```json
{"text": "I absolutely love this! Amazing work!"}
```
Expected: `sentiment.label = "positive"`

### Test 2: Negative Sentiment
```json
{"text": "This is terrible! I hate it."}
```
Expected: `sentiment.label = "negative"`

### Test 3: Neutral Text
```json
{"text": "The meeting is at 3 PM tomorrow."}
```
Expected: `sentiment.label = "neutral"`

### Test 4: Toxic Text
```json
{"text": "You're stupid and I hate you!"}
```
Expected: `toxicity.is_toxic = true`

### Test 5: Non-Toxic Text
```json
{"text": "Have a great day!"}
```
Expected: `toxicity.is_toxic = false`

### Test 6: Empty Text (Error)
```json
{"text": ""}
```
Expected: `400 Bad Request` with validation error

### Test 7: Too Long Text (Error)
```json
{"text": "a" * 5001}
```
Expected: `422 Unprocessable Entity` with validation error

---

## 🎯 Next Steps After Validation

Once all checks pass:

1. ✅ **Phase 2 Complete** - Mark as validated
2. 📝 **Document any issues** - Note performance, accuracy
3. 🔬 **Test on real data** - Try with actual participant responses
4. 🌍 **Test multilingual** - Try Urdu/Roman Urdu if applicable
5. 🚀 **Proceed to Phase 3** - Aggression & cyberbullying (future)

---

## 📚 Documentation

- **README-PHASE-2.md** - Comprehensive guide
- **PHASE-2-IMPLEMENTATION-COMPLETE.md** - Technical details
- **NLP-PHASE-2-COMPLETE-SUMMARY.md** - Implementation summary
- **Swagger UI** - http://127.0.0.1:8001/docs

---

## ⚠️ Remember

- **Sentiment ≠ Cyberbullying**
- **Toxicity ≠ Cyberbullying**
- These are component analyses
- Model confidence ≠ scientific accuracy
- Urdu/Roman Urdu needs empirical validation

---

**Ready? Let's validate Phase 2!** 🚀

```bash
cd nlp-service
START-SERVICE.bat
```
