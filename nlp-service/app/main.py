"""
Research NLP Service - Main FastAPI Application

PHASE 2: Real NLP Model Implementation
- Sentiment analysis (XLM-RoBERTa multilingual)
- Toxicity detection (Detoxify multilingual)
- POST /analyze endpoint with real inference
- Models loaded once on startup
- CPU/CUDA support

Future phases will add:
- Aggression classification
- Cyberbullying detection
- Integration with Express backend
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import logging
import sys

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
APP_VERSION = os.getenv("APP_VERSION", "2.0.0")  # Phase 2
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8001))
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", 5000))

# Model configuration
SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-xlm-roberta-base-sentiment")
TOXICITY_MODEL = os.getenv("TOXICITY_MODEL", "multilingual")

# Global analyzer instance (loaded on startup)
analyzer: UnifiedAnalyzer = None

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
    
    **Future phases:**
    - Aggression classification
    - Cyberbullying detection
    - Integration with Express backend
    
    **Research Integrity:**
    - Sentiment ≠ Toxicity ≠ Aggression ≠ Cyberbullying
    - Model confidence ≠ Scientific accuracy
    - Multilingual performance requires empirical validation
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS configuration (restricted during integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/")
async def root():
    """
    Service information endpoint
    
    Returns basic information about the NLP service.
    """
    return {
        "success": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "phase": "Phase 2 - Real NLP Models",
        "models_loaded": analyzer.is_ready if analyzer else False
    }


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    
    Returns service health status including model loading status.
    """
    if analyzer is None:
        return {
            "success": True,
            "status": "starting",
            "models_ready": False
        }
    
    return {
        "success": True,
        "status": "healthy",
        "models_ready": analyzer.is_ready,
        "models": analyzer.get_model_status()
    }


# ============================================================================
# MODELS INFORMATION ENDPOINT
# ============================================================================

@app.get("/models")
async def get_models_info():
    """
    Model configuration and loading status
    
    Returns detailed information about configured models and their status.
    """
    if analyzer is None:
        return {
            "success": True,
            "status": "initializing",
            "sentiment": SENTIMENT_MODEL,
            "toxicity": TOXICITY_MODEL,
            "aggression": "aggression-lexicon-xu-2020",
            "cyberbullying": "research-operational-definition"
        }
    
    return {
        "success": True,
        "status": "loaded" if analyzer.is_ready else "loading",
        "models": analyzer.get_model_status()
    }


# ============================================================================
# ANALYSIS ENDPOINT - PHASE 3
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
    """
    Comprehensive NLP Analysis - Phase 3
    
    Analyzes input text for sentiment, toxicity, aggression, and cyberbullying.
    
    **Input Validation:**
    - Text must be non-empty
    - Text must not be only whitespace
    - Text length must be ≤ 5000 characters
    
    **Returns:**
    - Sentiment analysis (label, score, probabilities)
    - Toxicity analysis (overall score, categories, classification)
    - Aggression analysis (score 0-10, level, matched indicators, evidence with positions)
    - Cyberbullying assessment (classification, type, severity, evidence, reason codes)
    - Text metadata (character count, word count)
    - Processing metadata (request ID, processing time, models used)
    
    **Privacy:**
    - Request ID is logged, but participant text is NOT logged
    
    **Research Note:**
    - Sentiment ≠ Toxicity ≠ Aggression ≠ Cyberbullying
    - These are component analyses, not final classifications
    """
    # Check if models are loaded
    if analyzer is None or not analyzer.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "success": False,
                "error": "NLP models not ready. Service is still initializing.",
                "details": {
                    "models_status": analyzer.get_model_status() if analyzer else "analyzer_not_initialized"
                }
            }
        )
    
    try:
        # Perform analysis
        result = analyzer.analyze(
            text=request.text,
            context=request.context.dict() if request.context else None
        )
        
        # Return structured response
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
        # Validation errors (empty text, etc.)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": str(e),
                "details": {"error_type": "ValidationError"}
            }
        )
    
    except RuntimeError as e:
        # Analysis errors
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
        # Unexpected errors
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
# STARTUP/SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Startup tasks - PHASE 2
    
    Loads NLP models into memory on service startup.
    Models are loaded once and reused for all requests.
    """
    global analyzer
    
    logger.info("=" * 80)
    logger.info(f"🚀 {APP_NAME} v{APP_VERSION} starting...")
    logger.info(f"📍 Running on http://{HOST}:{PORT}")
    logger.info(f"📚 Swagger docs: http://{HOST}:{PORT}/docs")
    logger.info("=" * 80)
    
    # Initialize analyzer
    logger.info("Initializing UnifiedAnalyzer...")
    analyzer = UnifiedAnalyzer(
        sentiment_model=SENTIMENT_MODEL,
        toxicity_model=TOXICITY_MODEL
    )
    
    # Load models
    logger.info("Loading NLP models (this may take a minute)...")
    try:
        load_results = analyzer.load_models()
        
        logger.info("=" * 80)
        logger.info("Model Loading Results:")
        for model_name, loaded in load_results.items():
            status_icon = "✅" if loaded else "❌"
            logger.info(f"  {status_icon} {model_name}: {'loaded' if loaded else 'failed'}")
        logger.info("=" * 80)
        
        if analyzer.is_ready:
            logger.info("✅ NLP Service ready for inference!")
        else:
            logger.warning("⚠️ Some models failed to load. Service may have limited functionality.")
        
    except Exception as e:
        logger.error(f"❌ Failed to load models: {str(e)}", exc_info=True)
        logger.warning("⚠️ Service will start but analysis endpoints will not work.")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Shutdown tasks
    
    Clean up resources on service shutdown.
    """
    logger.info(f"🛑 {APP_NAME} shutting down...")
    logger.info("Cleaning up resources...")
    
    # Future: Explicitly unload models if needed
    # For now, Python garbage collection handles this
    
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
        reload=False  # Disable reload in production
    )
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
        reload=False  # Disable reload in production
    )
