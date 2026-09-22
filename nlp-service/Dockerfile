# ==============================================================================
# Production Dockerfile for Research NLP Service
# Optimized for Railway Hobby Plan ($5/mo - 8GB RAM, 8 vCPU)
# Pre-caches all 5 NLP models at build time for instant zero-wait startup
# ==============================================================================

FROM python:3.10-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000 \
    TRANSFORMERS_CACHE=/app/cache/transformers \
    TORCH_HOME=/app/cache/torch \
    HF_HOME=/app/cache/huggingface

# Install minimal OS runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN pip install --upgrade pip

# Install CPU-only PyTorch first (drastically reduces image size & build time)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy and install application dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create cache directories
RUN mkdir -p /app/cache/transformers /app/cache/torch /app/cache/huggingface

# Pre-download sentiment model (CardiffNLP XLM-RoBERTa) and Detoxify multilingual model into cache
# This bakes the models directly into the Docker image so Railway doesn't download on boot!
RUN python -c "\
from transformers import AutoTokenizer, AutoModelForSequenceClassification;\
print('Pre-downloading CardiffNLP XLM-RoBERTa sentiment model into build cache...');\
AutoTokenizer.from_pretrained('cardiffnlp/twitter-xlm-roberta-base-sentiment');\
AutoModelForSequenceClassification.from_pretrained('cardiffnlp/twitter-xlm-roberta-base-sentiment');\
from detoxify import Detoxify;\
print('Pre-downloading Detoxify multilingual model into build cache...');\
Detoxify('multilingual');\
print('✅ All deep learning models pre-cached successfully!')\
"

# Copy source code and resources
COPY app/ app/

# Create non-root user for security and permissions
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Health check using FastAPI /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start FastAPI application using Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
