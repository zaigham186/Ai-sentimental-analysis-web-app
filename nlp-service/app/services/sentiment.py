"""
Sentiment Analysis Service - PHASE 2 IMPLEMENTATION

Uses: cardiffnlp/twitter-xlm-roberta-base-sentiment
- XLM-RoBERTa multilingual sentiment model
- Trained on ~198M tweets in 30+ languages
- Outputs: negative, neutral, positive

Research considerations:
- Sentiment ≠ cyberbullying
- Negative sentiment can be:
  * Critical but valid feedback
  * Frustration without aggression
  * Disagreement without toxicity
  * Expression of negative emotion (legitimate)

Performance validation:
- Must be tested on actual research dataset
- Accuracy for multilingual text needs verification
- Roman Urdu/Urdu performance must be empirically evaluated
- Do not claim model confidence = research accuracy
"""

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """
    Sentiment Analysis using XLM-RoBERTa multilingual model
    
    Model loads ONCE on initialization and is reused for all requests.
    Supports CPU and CUDA (GPU).
    """
    
    def __init__(self, model_name: str = "cardiffnlp/twitter-xlm-roberta-base-sentiment"):
        """
        Initialize sentiment analyzer with specified model.
        
        Args:
            model_name: HuggingFace model identifier
        """
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.tokenizer = None
        self._loaded = False
        
        logger.info(f"SentimentAnalyzer initialized with model: {model_name}")
        logger.info(f"Device: {self.device}")
    
    def load(self) -> bool:
        """
        Load the sentiment model and tokenizer.
        
        Returns:
            bool: True if loading succeeded, False otherwise
        """
        try:
            logger.info(f"Loading sentiment model: {self.model_name}")
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            # Load model
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()  # Set to evaluation mode
            
            self._loaded = True
            logger.info(f"✅ Sentiment model loaded successfully on {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load sentiment model: {str(e)}")
            self._loaded = False
            return False
    
    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded and ready"""
        return self._loaded and self.model is not None and self.tokenizer is not None
    
    def analyze(self, text: str) -> Dict:
        """
        Analyze sentiment of input text.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dict with keys:
                - label: str (negative, neutral, positive)
                - score: float (confidence for predicted label)
                - probabilities: Dict[str, float] (all class probabilities)
                
        Raises:
            RuntimeError: If model not loaded
            ValueError: If text is empty or invalid
        """
        if not self.is_loaded:
            raise RuntimeError("Sentiment model not loaded. Call load() first.")
        
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty")
        
        try:
            # Tokenize input
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Get model predictions
            with torch.inference_mode():
                outputs = self.model(**inputs)
                logits = outputs.logits
                
            # Convert logits to probabilities
            probs = torch.softmax(logits, dim=-1)[0]
            probs_dict = {}
            
            # Get label mapping from model config
            id2label = self.model.config.id2label
            
            # Build probabilities dictionary
            for idx, prob in enumerate(probs.tolist()):
                label = id2label[idx]
                probs_dict[label] = float(prob)
            
            # Get predicted label and score
            predicted_idx = torch.argmax(probs).item()
            predicted_label = id2label[predicted_idx]
            predicted_score = float(probs[predicted_idx].item())
            
            return {
                "label": predicted_label,
                "score": predicted_score,
                "probabilities": probs_dict
            }
            
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {str(e)}")
            raise RuntimeError(f"Sentiment analysis failed: {str(e)}")
