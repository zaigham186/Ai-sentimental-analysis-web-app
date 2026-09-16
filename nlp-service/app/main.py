"""
Research NLP Service - Main FastAPI Application

PHASE 2: Real NLP Model Implementation
- Sentiment analysis (XLM-RoBERTa multilingual)
- Toxicity detection (Detoxify multilingual)
- POST /analyze endpoint with real inference
- Models loaded in BACKGROUND THREAD so healthcheck passes immediately
- CPU/CUDA support
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import logging
import sys
import asyncio
import concurrent.futures

# Ensure UTF-8 output encoding for emojis on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Import schemas and services
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    ErrorResponse
)
from app.services.analyzer import UnifiedAnalyzer

# Load environment variables
load_dotenv()

# Application configuration
APP_NAME = os.getenv("APP_NAME", "Research NLP Service")
APP_VERSION = os.getenv("APP_VERSION", "2.0.0")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", 5000))

# Model configuration
SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-xlm-roberta-base-sentiment")
TOXICITY_MODEL = os.getenv("TOXICITY_MODEL", "multilingual")

# Global state
analyzer: UnifiedAnalyzer = None
models_ready = False
models_loading = False
models_error = None

# Thread pool for running blocking model loading
thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)

# Create FastAPI application
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="""
    Isolated Python NLP Microservice for Research Coding System
    Models load in background thread - healthcheck passes immediately.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS - open for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# ROOT ENDPOINT - returns immediately always
# ============================================================================

@app.get("/")
async def root():
    return {
        "success": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "status": "healthy",
        "models_ready": models_ready,
        "models_loading": models_loading
    }


# ============================================================================
# HEALTH CHECK - returns immediately, Railway uses this
# ============================================================================

@app.get("/health")
async def health_check():
    return {
        "success": True,
        "status": "healthy",
        "models_ready": models_ready,
        "models_loading": models_loading,
        "models_error": models_error
    }


# ============================================================================
# MODELS INFO
# ============================================================================

@app.get("/models")
async def get_models_info():
    if analyzer is None:
        return {
            "success": True,
            "status": "loading" if models_loading else "initializing",
            "sentiment": SENTIMENT_MODEL,
            "toxicity": TOXICITY_MODEL,
            "models_ready": models_ready
        }
    return {
        "success": True,
        "status": "loaded" if analyzer.is_ready else "loading",
        "models": analyzer.get_model_status(),
        "models_ready": models_ready
    }


# ============================================================================
# ANALYSIS ENDPOINT
# ============================================================================

@app.post(
    "/analyze",
    response_model=AnalysisResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid input"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
        503: {"model": ErrorResponse, "description": "Models not ready"}
    }
)
def analyze_text(request: AnalysisRequest):
    if not models_ready or analyzer is None or not analyzer.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "success": False,
                "error": "NLP models are still loading. Please wait 2-3 minutes and try again.",
                "models_ready": models_ready,
                "models_loading": models_loading
            }
        )

    try:
        result = analyzer.analyze(
            text=request.text,
            context=request.context.dict() if request.context else None
        )
        return AnalysisResponse(
            success=True,
            request_id=result["request_id"],
            text_metadata=result["text_metadata"],
            sentiment=result["sentiment"],
            toxicity=result["toxicity"],
            aggression=result.get("aggression"),
            cyberbullying=result.get("cyberbullying"),
            metadata=result["metadata"]
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error": str(e)}
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": "Internal server error"}
        )


# ============================================================================
# THIS IS THE ACTUAL BLOCKING FUNCTION - runs in a thread
# ============================================================================

def _load_models_sync():
    """
    This runs in a separate thread via run_in_executor.
    Blocking code here does NOT freeze the event loop.
    Uvicorn finishes startup and opens port while this runs.
    """
    global analyzer, models_ready, models_loading, models_error

    try:
        logger.info("🔄 Thread started - loading NLP models...")

        analyzer_instance = UnifiedAnalyzer(
            sentiment_model=SENTIMENT_MODEL,
            toxicity_model=TOXICITY_MODEL
        )

        logger.info("Downloading models from Hugging Face - takes 3-5 minutes...")
        load_results = analyzer_instance.load_models()

        logger.info("Model Loading Results:")
        for model_name, loaded in load_results.items():
            icon = "✅" if loaded else "❌"
            logger.info(f"  {icon} {model_name}: {'loaded' if loaded else 'failed'}")

        if analyzer_instance.is_ready:
            # Only set global analyzer after fully loaded
            global analyzer
            analyzer = analyzer_instance
            models_ready = True
            models_loading = False
            logger.info("✅ ALL MODELS LOADED - NLP Service fully ready for inference!")
        else:
            models_loading = False
            models_error = "Some models failed to load"
            logger.warning("⚠️ Some models failed to load")

    except Exception as e:
        models_loading = False
        models_error = str(e)
        logger.error(f"❌ Model loading failed: {str(e)}", exc_info=True)


# ============================================================================
# BACKGROUND ASYNC WRAPPER
# ============================================================================

async def load_models_in_background():
    """
    Async wrapper that runs blocking model loading in a thread pool.
    run_in_executor = run blocking code without freezing async event loop.
    This is the correct Python way to do this.
    """
    global models_loading
    models_loading = True

    loop = asyncio.get_event_loop()
    logger.info("🔄 Scheduling model loading in background thread...")

    # THIS IS THE KEY FIX
    # run_in_executor puts _load_models_sync() in a thread
    # event loop is NOT blocked
    # uvicorn finishes startup immediately
    # port opens immediately
    # healthcheck passes immediately
    await loop.run_in_executor(thread_pool, _load_models_sync)


# ============================================================================
# STARTUP EVENT
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Server starts immediately.
    Model loading scheduled in background thread.
    Healthcheck passes right away.
    """
    logger.info("=" * 80)
    logger.info(f"🚀 {APP_NAME} v{APP_VERSION} starting...")
    logger.info(f"📍 Running on http://{HOST}:{PORT}")
    logger.info(f"📚 Swagger docs: http://{HOST}:{PORT}/docs")
    logger.info("✅ Server ready - models loading in background thread")
    logger.info("=" * 80)

    # Schedule background loading
    # create_task returns immediately
    # startup_event completes immediately
    # uvicorn marks startup as complete
    # port opens
    # Railway healthcheck passes
    asyncio.create_task(load_models_in_background())


@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"🛑 {APP_NAME} shutting down...")
    thread_pool.shutdown(wait=False)
    logger.info("✅ Shutdown complete")


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=False
    )