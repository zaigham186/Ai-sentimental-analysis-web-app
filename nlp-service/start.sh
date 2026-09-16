#!/bin/bash
echo "Pre-downloading NLP models..."
python -c "
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

model_name = os.getenv('SENTIMENT_MODEL', 'cardiffnlp/twitter-xlm-roberta-base-sentiment')
cache_dir = os.getenv('TRANSFORMERS_CACHE', '/tmp/transformers_cache')

print(f'Downloading {model_name}...')
AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
AutoModelForSequenceClassification.from_pretrained(model_name, cache_dir=cache_dir)
print('Models downloaded successfully!')
"
echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT --timeout-keep-alive 300