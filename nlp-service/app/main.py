"""
Research NLP Service - Main FastAPI Application

PHASE 2: Real NLP Model Implementation
- Sentiment analysis (XLM-RoBERTa multilingual)
- Toxicity detection (Detoxify multilingual)
- POST /analyze endpoint with real inference
- Models loaded in BACKGROUND so healthcheck passes immediately
- CPU/CUDA support
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import logging
import sys
import asyncio

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

# Global analyzer instance (loaded in background on startup)
analyzer: UnifiedAnalyzer = None

# ============================================================================
# THIS IS THE KEY FIX
# models_ready = False means healthcheck passes immediately
# even before models finish downloading
# ============================================================================
models_ready = False
models_loading = False
models_error = None

# Create FastAPI application
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="""
    Isolated Python NLP Microservice for Research Coding System

    **Phase 2: Real NLP Model Implementation**

    This service provides sentiment and toxicity analysis using:
    - **Sentiment**: cardiffnlp/twitter-xlm-roberta-base-sentiment (XLM-RoBERTa multilingual)
    - **Toxicity**: Detoxify multilingual

    Models are loaded once on startup and cached for fast inference.
    Supports CPU (CUDA optional if available).

    **Current endpoints:**
    - GET / - Service information
    - GET /health - Health check with model status
    - GET /models - Model configuration and loading status
    - POST /analyze - Comprehensive NLP analysis
    - GET /docs - This Swagger UI
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS configuration - updated for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/")
async def root():
    """Service information endpoint"""
    return {
        "success": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "status": "healthy",
        "models_ready": models_ready,
        "models_loading": models_loading
    }


# ============================================================================
# HEALTH CHECK ENDPOINT
# THIS NOW RETURNS IMMEDIATELY - DOES NOT WAIT FOR MODELS
# ============================================================================

@app.get("/health")
async def health_check():
    """
    Health check endpoint - returns immediately regardless of model status.
    Railway uses this to check if service is alive.
    models_ready tells you if models finished loading.
    """
    return {
        "success": True,
        "status": "healthy",
        "models_ready": models_ready,
        "models_loading": models_loading,
        "models_error": models_error
    }


# ============================================================================
# MODELS INFORMATION ENDPOINT
# ============================================================================

@app.get("/models")
async def get_models_info():
    """Model configuration and loading status"""
    if analyzer is None:
        return {
            "success": True,
            "status": "loading" if models_loading else "initializing",
            "sentiment": SENTIMENT_MODEL,
            "toxicity": TOXICITY_MODEL,
            "aggression": "aggression-lexicon-xu-2020",
            "cyberbullying": "research-operational-definition",
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
    """Comprehensive NLP Analysis"""

    # Check if models are loaded
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
            detail={
                "success": False,
                "error": str(e),
                "details": {"error_type": "ValidationError"}
            }
        )

    except RuntimeError as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Analysis failed",
                "details": {"error_message": str(e)}
            }
        )

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "details": {"error_type": type(e).__name__}
            }
        )


# ============================================================================
# BACKGROUND MODEL LOADING FUNCTION
# THIS IS THE KEY FIX - models load in background
# healthcheck passes immediately while this runs
# ============================================================================

async def load_models_in_background():
    """
    Load NLP models in background.
    This runs AFTER the server starts and healthcheck passes.
    Railway will see the service as healthy immediately.
    Models finish loading 2-3 minutes later in background.
    """
    global analyzer, models_ready, models_loading, models_error

    models_loading = True
    logger.info("=" * 80)
    logger.info("🔄 Loading NLP models in background...")
    logger.info("✅ Server is already healthy - models loading in background")
    logger.info("=" * 80)

    try:
        # Initialize analyzer
        logger.info("Initializing UnifiedAnalyzer...")
        analyzer = UnifiedAnalyzer(
            sentiment_model=SENTIMENT_MODEL,
            toxicity_model=TOXICITY_MODEL
        )

        # Load models - this is the slow part (downloads XLM-R)
        logger.info("Downloading and loading models - this takes 2-5 minutes...")
        load_results = analyzer.load_models()

        logger.info("=" * 80)
        logger.info("Model Loading Results:")
        for model_name, loaded in load_results.items():
            status_icon = "✅" if loaded else "❌"
            logger.info(f"  {status_icon} {model_name}: {'loaded' if loaded else 'failed'}")
        logger.info("=" * 80)

        if analyzer.is_ready:
            models_ready = True
            models_loading = False
            logger.info("✅ ALL MODELS LOADED - NLP Service fully ready for inference!")
        else:
            models_loading = False
            models_error = "Some models failed to load"
            logger.warning("⚠️ Some models failed to load. Service has limited functionality.")

    except Exception as e:
        models_loading = False
        models_error = str(e)
        logger.error(f"❌ Failed to load models: {str(e)}", exc_info=True)
        logger.warning("⚠️ Service is running but analysis endpoints will not work.")


# ============================================================================
# STARTUP EVENT - NOW JUST TRIGGERS BACKGROUND LOADING
# Server starts immediately, models load in background
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Startup - triggers background model loading.
    Server starts immediately.
    Models load in background over next 2-5 minutes.
    Healthcheck passes right away.
    """
    logger.info("=" * 80)
    logger.info(f"🚀 {APP_NAME} v{APP_VERSION} starting...")
    logger.info(f"📍 Running on http://{HOST}:{PORT}")
    logger.info(f"📚 Swagger docs: http://{HOST}:{PORT}/docs")
    logger.info("✅ Server starting - models will load in background")
    logger.info("=" * 80)

    # THIS IS THE FIX:
    # asyncio.create_task runs model loading in background
    # startup_event returns immediately
    # Railway healthcheck passes right away
    asyncio.create_task(load_models_in_background())


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info(f"🛑 {APP_NAME} shutting down...")
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