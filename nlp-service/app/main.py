"""
Research NLP Service - Main FastAPI Application
Fixed for FastAPI 0.141.1 using modern lifespan pattern
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import logging
import sys
import asyncio
import threading

# UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
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

# Configuration
APP_NAME = os.getenv("APP_NAME", "Research NLP Service")
APP_VERSION = os.getenv("APP_VERSION", "2.0.0")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", 5000))
SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-xlm-roberta-base-sentiment")
TOXICITY_MODEL = os.getenv("TOXICITY_MODEL", "multilingual")

# Global state
analyzer: UnifiedAnalyzer = None
models_ready = False
models_loading = False
models_error = None


# ============================================================================
# BLOCKING MODEL LOADER - runs in a real OS thread
# completely separate from asyncio event loop
# ============================================================================

def load_models_thread():
    """
    Runs in a real OS thread via threading.Thread
    Completely separate from asyncio - cannot block event loop
    Uvicorn starts immediately, port opens, healthcheck passes
    Models load here in parallel
    """
    global analyzer, models_ready, models_loading, models_error

    logger.info("🔄 Model loading thread started...")

    try:
        instance = UnifiedAnalyzer(
            sentiment_model=SENTIMENT_MODEL,
            toxicity_model=TOXICITY_MODEL
        )

        logger.info("📥 Downloading models - this takes 3-5 minutes...")
        load_results = instance.load_models()

        logger.info("Model Loading Results:")
        for name, loaded in load_results.items():
            icon = "✅" if loaded else "❌"
            logger.info(f"  {icon} {name}: {'loaded' if loaded else 'failed'}")

        if instance.is_ready:
            analyzer = instance
            models_ready = True
            models_loading = False
            logger.info("✅ ALL MODELS LOADED - Ready for inference!")
        else:
            models_loading = False
            models_error = "Some models failed to load"
            logger.warning("⚠️ Some models failed to load")

    except Exception as e:
        models_loading = False
        models_error = str(e)
        logger.error(f"❌ Model loading failed: {str(e)}", exc_info=True)


# ============================================================================
# LIFESPAN - correct pattern for FastAPI 0.100+
# This replaces @app.on_event("startup")
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Modern FastAPI lifespan context manager.
    Code before yield = startup
    Code after yield = shutdown
    
    Threading.Thread starts model loading completely outside asyncio.
    Lifespan yields immediately.
    Uvicorn sees startup complete.
    Port opens.
    Healthcheck passes.
    """
    global models_loading

    logger.info("=" * 70)
    logger.info(f"🚀 {APP_NAME} v{APP_VERSION} starting...")
    logger.info(f"📍 Port: {PORT}")
    logger.info(f"📚 Docs: http://{HOST}:{PORT}/docs")
    logger.info("=" * 70)

    # Start model loading in a REAL OS thread
    # This is completely outside asyncio
    # Cannot block event loop under any circumstances
    models_loading = True
    t = threading.Thread(target=load_models_thread, daemon=True)
    t.start()
    logger.info("✅ Model loading thread started - server ready immediately")

    # yield = server is now running
    # everything above runs at startup
    # everything below runs at shutdown
    yield

    # Shutdown
    logger.info(f"🛑 {APP_NAME} shutting down...")
    logger.info("✅ Shutdown complete")


# ============================================================================
# CREATE APP WITH LIFESPAN
# ============================================================================

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    lifespan=lifespan,      # <-- uses new lifespan pattern
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# ENDPOINTS
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


@app.get("/health")
async def health_check():
    # Returns immediately always
    # No waiting for models
    # Railway healthcheck passes instantly
    return {
        "success": True,
        "status": "healthy",
        "models_ready": models_ready,
        "models_loading": models_loading,
        "models_error": models_error
    }


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
                "error": "Models still loading. Wait 3-5 minutes and try again.",
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
        logger.error(f"Error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": "Internal server error"}
        )


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=False)
    