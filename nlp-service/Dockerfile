# ==============================================================================
# Production Dockerfile for Research NLP Service
# Multi-stage / optimized for CPU inference with low memory footprint
# ==============================================================================

FROM python:3.10-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    TRANSFORMERS_CACHE=/tmp/transformers_cache \
    TORCH_HOME=/tmp/torch_cache \
    PORT=8000

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

# Copy source code and resources
COPY app/ app/

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    mkdir -p /tmp/transformers_cache /tmp/torch_cache && \
    chown -R appuser:appuser /app /tmp/transformers_cache /tmp/torch_cache

USER appuser

EXPOSE 8000

# Health check using FastAPI /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start FastAPI application using Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
