# Research NLP Service

**Isolated Python FastAPI Microservice for Research Coding System**

## Purpose

This is an independent Python microservice that provides NLP-based analysis for the cyberbullying research platform. It processes participant responses through multiple analysis dimensions:

- **Sentiment Analysis** ✅ - Emotional tone classification (XLM-RoBERTa multilingual)
- **Toxicity Detection** ✅ - Harmful content identification (Detoxify multilingual)
- **Sentiment Analysis** ✅ - Emotional tone classification (XLM-RoBERTa multilingual)
- **Toxicity Detection** ✅ - Harmful content identification (Detoxify multilingual)
- **Aggression Scoring** ✅ - Aggression level assessment (Aggression Lexicon Model framework)
- **Cyberbullying Classification** ✅ - Research operational criteria multi-dimensional detection

## Current Status: Phase 3 - Research-Specific Aggression & Cyberbullying NLP

**✅ Phase 1 Completed:**
- Service architecture created
- FastAPI application configured
- Health check endpoints operational
- Swagger documentation available
- Python environment isolated
- Clean package structure established

**✅ Phase 2 Completed:**
- ✅ Sentiment analysis (XLM-RoBERTa multilingual)
- ✅ Toxicity detection (Detoxify multilingual)
- ✅ POST /analyze endpoint with real inference
- ✅ Models loaded once on startup (cached)
- ✅ CPU/CUDA support (auto-detected)
- ✅ Comprehensive test suite

**✅ Phase 3 Completed:**
- ✅ Aggression classification (`app/services/aggression.py`)
- ✅ Cyberbullying multi-dimensional evaluation (`app/services/cyberbullying.py`)
- ✅ Deterministic reason codes and evidence extraction with span offsets
- ✅ Extensible lexicon configuration (`app/resources/aggression/lexicon_config.json`)
- ✅ Ambiguous case flagging with `needs_review: true`
- ✅ Strict conceptual separation: Sentiment ≠ Toxicity ≠ Aggression ≠ Cyberbullying
- ✅ Unit tests (`test_aggression.py`, `test_cyberbullying.py`, `test_analyze.py`)
- ✅ 100% isolation maintained (Express, Next.js, and MongoDB remain untouched)

**⏳ Phase 4 (Future):**
- Express backend HTTP integration
- CodingAIService adapter
- MongoDB persistence for NLP metrics
- Language detection model (Roman Urdu / Urdu / English)

---

## Project Structure

```
nlp-service/
│
├── app/
│   ├── __init__.py              # Package initialization
│   ├── main.py                  # FastAPI application (Phase 2: POST /analyze)
│   │
│   ├── models/                  # Future: Model management
│   │   └── __init__.py
│   │
│   ├── services/                # Analysis services
│   │   ├── __init__.py
│   │   ├── analyzer.py          # ✅ NEW: UnifiedAnalyzer orchestrator
│   │   ├── sentiment.py         # ✅ IMPLEMENTED: XLM-RoBERTa sentiment
│   │   ├── toxicity.py          # ✅ IMPLEMENTED: Detoxify toxicity
│   │   ├── aggression.py        # ⏳ Future: Aggression scoring
│   │   └── cyberbullying.py     # ⏳ Future: Cyberbullying classification
│   │
│   └── schemas/                 # Pydantic models
│       ├── __init__.py
│       └── analysis.py          # ✅ UPDATED: Phase 2 request/response schemas
│
├── tests/                       # Test suite (48+ tests)
│   ├── __init__.py
│   ├── test_health.py          # Health check tests
│   ├── test_sentiment.py       # ✅ IMPLEMENTED: 13 real tests
│   ├── test_toxicity.py        # ✅ IMPLEMENTED: 15 real tests
│   └── test_analyze.py         # ✅ IMPLEMENTED: 20+ integration tests
│
├── venv/                        # Virtual environment (not committed)
├── .env.example                 # Environment template
├── .env                         # Local configuration (not committed)
├── .gitignore                   # Git exclusions
├── requirements.txt             # Python dependencies
├── START-SERVICE.bat            # Windows startup script
├── PHASE-1-VALIDATION-COMPLETE.md  # Phase 1 completion report
├── PHASE-2-IMPLEMENTATION-COMPLETE.md  # Phase 2 completion report
└── README.md                    # This file
```

---

## Local Development Setup

### Prerequisites

- Python 3.8 or higher
- pip package manager
- Virtual environment support

### Installation

1. **Navigate to the NLP service directory:**
   ```bash
   cd nlp-service
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   
   **Windows PowerShell:**
   ```powershell
   venv\Scripts\Activate.ps1
   ```
   
   **Windows CMD:**
   ```cmd
   venv\Scripts\activate.bat
   ```
   
   **Linux/Mac:**
   ```bash
   source venv/bin/activate
   ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment:**
   ```bash
   # Copy example configuration
   copy .env.example .env
   
   # Edit .env if needed (defaults should work for local dev)
   ```

### Running the Service

**Start the FastAPI server:**
```bash
uvicorn app.main:app --reload --port 8001
```

The service will be available at:
- **API:** http://127.0.0.1:8001
- **Swagger Docs:** http://127.0.0.1:8001/docs
- **ReDoc:** http://127.0.0.1:8001/redoc
- **OpenAPI Schema:** http://127.0.0.1:8001/openapi.json

---

## Current API Endpoints

### GET /
Returns service information
```json
{
  "success": true,
  "service": "Research NLP Service",
  "version": "1.0.0"
}
```

### GET /health
Health check endpoint
```json
{
  "success": true,
  "status": "healthy"
}
```

### GET /models
Model configuration information
```json
{
  "success": true,
  "sentiment": "cardiffnlp/twitter-xlm-roberta-base-sentiment",
  "toxicity": "multilingual",
  "aggression": "research-methodology",
  "cyberbullying": "research-framework"
}
```

### GET /docs
Interactive Swagger API documentation (HTML UI)

---

## Testing

**Run the test suite:**
```bash
pytest
```

**Run with verbose output:**
```bash
pytest -v
```

**Run specific test file:**
```bash
pytest tests/test_health.py
```

**Current test coverage:**
- ✅ Health endpoint validation
- ✅ Root endpoint validation
- ✅ Models endpoint validation
- ✅ Swagger documentation availability
- ⏳ NLP functionality tests (coming in Phase 2)

---

## Configuration

Environment variables (`.env` file):

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Service name | `Research NLP Service` |
| `APP_VERSION` | Service version | `1.0.0` |
| `HOST` | Server host | `127.0.0.1` |
| `PORT` | Server port | `8001` |
| `SENTIMENT_MODEL` | HuggingFace sentiment model | `cardiffnlp/twitter-xlm-roberta-base-sentiment` |
| `TOXICITY_MODEL` | Detoxify model variant | `multilingual` |
| `MAX_TEXT_LENGTH` | Maximum text length | `5000` |
| `LOG_LEVEL` | Logging level | `INFO` |

---

## Architecture Overview

### Isolation Principle

This service is **completely independent** from the existing Node.js backend:

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
               │ (Future integration)
               ↓
┌─────────────────────────────────────────┐
│    FastAPI NLP Service (NEW)            │
│    - Sentiment Analysis                 │
│    - Toxicity Detection                 │
│    - Aggression Scoring                 │
│    - Cyberbullying Classification       │
└─────────────────────────────────────────┘
```

**Current state:**
- NLP service runs independently on port 8001
- No communication with Express backend yet
- No database dependencies
- No authentication required (local only)

**Future integration:**
- Express will call NLP service via HTTP
- Results will flow back to CodingAI Service
- Integration will be added in later phases

---

## Research Methodology

This service implements scientifically validated methodologies:

### Sentiment Analysis
- Model: Cardiff NLP Twitter XLM-RoBERTa
- Multilingual support
- Three classes: positive, negative, neutral

### Toxicity Detection
- Library: Detoxify (Unitary)
- Multilingual model
- Dimensions: toxicity, severe_toxicity, obscene, threat, insult, identity_attack

### Aggression Analysis
- Framework: Aggression Lexicon Model (Xu et al., 2020) operational framework
- Implementation: `app/services/aggression.py`
- Lexicon Resource: `app/resources/aggression/lexicon_config.json`
- Categories: hostile, insult, threat, demeaning
- Scale: 0–10 research-aligned scale (0-2: None, 3-4: Mild, 5-7: Moderate, 8-10: Severe)
- Personal Targeting distinction: Identifies whether abusive language attacks an individual vs. critiques video content or abstract ideas.
- Output: Exact character offset positions (`start`, `end`) for every matched term.

### Cyberbullying Classification
- Framework: Multi-dimensional assessment based on the approved research operational definition (`docs/coding-methodology.md`).
- Implementation: `app/services/cyberbullying.py`
- Operational Criteria:
  1. Personal Targeting (directed at an individual/group)
  2. Harmful Intent / High Severity (threats, severe harassment, persistent humiliation)
- Classifications: `cyberbullying`, `not_cyberbullying`, `needs_review`, `insufficient_evidence`
- Deterministic Reason Codes:
  - `NO_AGGRESSION_INDICATORS`, `AGGRESSION_INDICATOR_DETECTED`
  - `INSULT_INDICATOR`, `THREAT_INDICATOR`, `SEVERE_TOXICITY_INDICATOR`
  - `DEMEANING_LANGUAGE`, `PERSONAL_TARGETING_DETECTED`
  - `CONTENT_CRITIQUE_NOT_PERSONAL`, `NEGATIVE_SENTIMENT_WITHOUT_ABUSE`
  - `AMBIGUOUS_CASE`, `INSUFFICIENT_CONTEXT`, `REQUIRES_HUMAN_REVIEW`
- No generative LLMs used: 100% reproducible, deterministic, and auditable.

---

## 🔬 Research Limitations & Integrity Statement

1. **Model Confidence ≠ Research Accuracy**:
   - Numeric confidence scores represent the statistical softmax / heuristic probability of the specific model.
   - True empirical accuracy, precision, recall, and F1-scores require validation against human expert ground-truth annotations.
2. **Negative Sentiment ≠ Cyberbullying**:
   - Negative emotional feedback or disagreement (e.g., "I did not like this video, it was boring") is legitimate discourse, not cyberbullying.
3. **Toxicity ≠ Cyberbullying**:
   - Toxic, vulgar, or obscene words without personal targeting or persistent harassment pattern do not meet cyberbullying criteria.
4. **Aggression ≠ Cyberbullying**:
   - Severe critique or heated debate of ideas is distinct from targeted cyberbullying attacks against individuals.
5. **Operational Lexicon Status**:
   - The aggression analyzer uses a transparent baseline lexicon in `app/resources/aggression/lexicon_config.json`.
   - The full empirical research lexicon can be updated in `lexicon_config.json` as research data is coded.
6. **Multilingual & Roman Urdu Limitation**:
   - While the sentiment and toxicity models support multilingual tokens, performance on colloquial Roman Urdu, code-switching, and cultural slang requires empirical testing.
7. **Human-in-the-Loop Requirement**:
   - Single comments cannot verify longitudinal repetition or interpersonal power dynamics.
   - All AI suggestions serve as coding aids; human researcher review remains required for definitive classification.

---

## Development Guidelines

### DO NOT:
- ❌ Modify the existing Next.js frontend
- ❌ Modify the existing Express backend
- ❌ Change MongoDB schemas
- ❌ Alter existing authentication/authorization
- ❌ Remove or replace RuleBasedProvider
- ❌ Invent arbitrary research methodologies or scientific weights
- ❌ Create unsupported classification thresholds
- ❌ Commit `.env` or model cache files

### DO:
- ✅ Keep service isolated and independent
- ✅ Follow validated research frameworks
- ✅ Document all assumptions and limitations
- ✅ Test thoroughly before integration
- ✅ Use proper error handling
- ✅ Log important events without logging participant text
- ✅ Write clear, maintainable code

---

## Future Phases

### Phase 1: Infrastructure ✅ Complete
- FastAPI framework, health check, swagger docs, isolated virtualenv.

### Phase 2: Core NLP Models ✅ Complete
- Sentiment (XLM-RoBERTa multilingual) and Toxicity (Detoxify multilingual) running at runtime.

### Phase 3: Research Aggression & Cyberbullying ✅ Complete
- Aggression Lexicon Model implementation (`aggression.py`).
- Cyberbullying multi-dimensional assessment (`cyberbullying.py`).
- Unified 5-stage pipeline (`analyzer.py`) and Pydantic schemas (`analysis.py`).
- Unit and regression test suites (`test_aggression.py`, `test_cyberbullying.py`, `test_analyze.py`).

### Phase 4: Integration (Future)
- Connect to Express backend via HTTP client.
- Integrate results into `CodingAIService`.
- Add MongoDB storage for multi-dimensional NLP metrics.
- End-to-end integration testing.

### Phase 5: Validation (Future)
- Benchmark against human-annotated research dataset.
- Calculate Cohen's kappa, precision, recall, and F1.
- Accuracy validation
- Inter-rater reliability
- Model fine-tuning
- Research publication support

---

## Dependencies

Key packages:
- **fastapi** - Modern web framework
- **uvicorn** - ASGI server
- **pydantic** - Data validation
- **transformers** - HuggingFace models
- **detoxify** - Toxicity detection
- **torch** - PyTorch backend
- **pytest** - Testing framework

See `requirements.txt` for complete list.

---

## Security

**Current:**
- Service runs locally (127.0.0.1)
- No authentication required
- CORS configured for local development
- `.env` excluded from version control

**Future:**
- API key authentication
- Rate limiting
- Input sanitization
- Request validation
- Secure inter-service communication

---

## Troubleshooting

### Service won't start
```bash
# Check Python version
python --version

# Verify virtual environment is activated
which python  # Linux/Mac
where python  # Windows

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Import errors
```bash
# Ensure you're in the correct directory
cd nlp-service

# Activate virtual environment
venv\Scripts\activate

# Run from nlp-service root
uvicorn app.main:app --reload --port 8001
```

### Port already in use
```bash
# Use different port
uvicorn app.main:app --reload --port 8002

# Or kill process on port 8001 (Windows)
netstat -ano | findstr :8001
taskkill /PID <PID> /F
```

---

## Contributing

When adding new features:

1. Follow existing code structure
2. Add type hints
3. Write docstrings
4. Create tests
5. Update this README
6. Document research methodology
7. Validate against research requirements

---

## License

This is research software for academic use at Shaheed Benazir Bhutto Women University (SBBWU).

---

## Contact

For questions about:
- **Research methodology:** Contact research supervisor
- **Technical implementation:** Refer to main project documentation
- **Service integration:** See integration phase documentation (future)

---

## Version History

**v1.0.0 - Phase 1 (Current)**
- Initial service infrastructure
- Health check endpoints
- Swagger documentation
- Independent validation milestone

**Future versions will add:**
- v1.1.0 - Model loading
- v1.2.0 - Analysis endpoints
- v2.0.0 - Backend integration
- v2.1.0 - Production deployment

---

**Status:** ✅ Infrastructure Complete - Ready for Phase 2 Model Implementation
