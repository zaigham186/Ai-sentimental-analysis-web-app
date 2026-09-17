from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import logging
import sys
import threading

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    ErrorResponse
)
from app.services.analyzer import UnifiedAnalyzer

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "Research NLP Service")
APP_VERSION = os.getenv("APP_VERSION", "2.0.0")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", 5000))
SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-xlm-roberta-base-sentiment")
TOXICITY_MODEL = os.getenv("TOXICITY_MODEL", "multilingual")

analyzer = None
models_ready = False
models_loading = False
models_error = None


def load_models_thread():
    global analyzer, models_ready, models_loading, models_error
    logger.info("Thread started - loading NLP models...")
    try:
        instance = UnifiedAnalyzer(
            sentiment_model=SENTIMENT_MODEL,
            toxicity_model=TOXICITY_MODEL
        )
        logger.info("Downloading models - takes 3-5 minutes...")
        load_results = instance.load_models()
        for name, loaded in load_results.items():
            logger.info(f"  {'OK' if loaded else 'FAIL'} {name}")
        if instance.is_ready:
            analyzer = instance
            models_ready = True
            models_loading = False
            logger.info("ALL MODELS LOADED - Ready!")
        else:
            models_loading = False
            models_error = "Some models failed"
    except Exception as e:
        models_loading = False
        models_error = str(e)
        logger.error(f"Model loading failed: {str(e)}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global models_loading
    logger.info(f"STARTING {APP_NAME} v{APP_VERSION} on port {PORT}")
    models_loading = True
    t = threading.Thread(target=load_models_thread, daemon=True)
    t.start()
    logger.info("Thread started - server ready NOW")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    lifespan=lifespan,
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


@app.get("/")
async def root():
    return {
        "success": True,
        "service": APP_NAME,
        "status": "healthy",
        "models_ready": models_ready,
        "models_loading": models_loading
    }


@app.get("/health")
async def health_check():
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
            "models_ready": models_ready
        }
    return {
        "success": True,
        "status": "loaded" if analyzer.is_ready else "loading",
        "models": analyzer.get_model_status(),
        "models_ready": models_ready
    }


@app.post("/analyze", response_model=AnalysisResponse)
def analyze_text(request: AnalysisRequest):
    if not models_ready or analyzer is None or not analyzer.is_ready:
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "error": "Models still loading. Wait 3-5 minutes.",
                "models_ready": models_ready
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
        raise HTTPException(status_code=400, detail={"success": False, "error": str(e)})
    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"success": False, "error": "Internal server error"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=False)