#!/bin/bash
set -e

echo "=========================================="
echo "Starting Research NLP Service..."
echo "=========================================="

cache_dir="${TRANSFORMERS_CACHE:-/app/cache/transformers}"
mkdir -p "$cache_dir" "${TORCH_HOME:-/app/cache/torch}"

echo "Checking model cache in $cache_dir..."
python -c "
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

model_name = os.getenv('SENTIMENT_MODEL', 'cardiffnlp/twitter-xlm-roberta-base-sentiment')
print(f'Checking {model_name}...')
AutoTokenizer.from_pretrained(model_name)
AutoModelForSequenceClassification.from_pretrained(model_name)
try:
    from detoxify import Detoxify
    print('Checking Detoxify multilingual...')
    Detoxify('multilingual')
except Exception as e:
    print(f'Detoxify cache notice: {e}')
print('Model cache verification complete.')
"

echo "Starting Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --timeout-keep-alive 120