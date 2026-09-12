"""
Unified Analysis Orchestrator - PHASE 3 IMPLEMENTATION

Coordinates sentiment, toxicity, aggression, and cyberbullying analysis.
Generates request IDs, measures processing time, and combines results.

PHASE 3 SCOPE:
- Sentiment analysis (XLM-RoBERTa)
- Toxicity analysis (Detoxify)
- Aggression classification (Aggression Lexicon Model framework)
- Cyberbullying multi-dimensional assessment (Operational definition)
"""

import uuid
import time
from typing import Dict, Optional
import logging

from .sentiment import SentimentAnalyzer
from .toxicity import ToxicityAnalyzer
from .aggression import AggressionAnalyzer
from .cyberbullying import CyberbullyingAnalyzer

logger = logging.getLogger(__name__)


class UnifiedAnalyzer:
    """
    Unified NLP Analysis Orchestrator
    
    Combines sentiment, toxicity, aggression, and cyberbullying analysis.
    Models and resources are loaded once on startup and reused across requests.
    """
    
    def __init__(
        self,
        sentiment_model: str = "cardiffnlp/twitter-xlm-roberta-base-sentiment",
        toxicity_model: str = "multilingual",
        toxicity_threshold: float = 0.5
    ):
        """
        Initialize unified analyzer.
        
        Args:
            sentiment_model: HuggingFace sentiment model identifier
            toxicity_model: Detoxify model type
            toxicity_threshold: Toxicity classification threshold
        """
        self.sentiment_analyzer = SentimentAnalyzer(model_name=sentiment_model)
        self.toxicity_analyzer = ToxicityAnalyzer(
            model_name=toxicity_model,
            threshold=toxicity_threshold
        )
        self.aggression_analyzer = AggressionAnalyzer()
        self.cyberbullying_analyzer = CyberbullyingAnalyzer()
        
        self._models_loaded = False
        
        logger.info("UnifiedAnalyzer initialized for Phase 3")
    
    def load_models(self) -> Dict[str, bool]:
        """
        Load all NLP models and resources.
        
        Returns:
            Dict with loading status for each analyzer component
        """
        logger.info("Loading all NLP models and resources...")
        start_time = time.time()
        
        results = {
            "sentiment": self.sentiment_analyzer.load(),
            "toxicity": self.toxicity_analyzer.load(),
            "aggression": self.aggression_analyzer.load(),
            "cyberbullying": True  # Deterministic multi-dimensional evaluation engine
        }
        
        elapsed = time.time() - start_time
        
        self._models_loaded = all(results.values())
        
        if self._models_loaded:
            logger.info(f"✅ All models and resources loaded successfully in {elapsed:.2f}s")
        else:
            logger.warning(f"⚠️ Some models/resources failed to load: {results}")
        
        return results
    
    @property
    def is_ready(self) -> bool:
        """Check if all models and resources are loaded and ready"""
        return (
            self._models_loaded and
            self.sentiment_analyzer.is_loaded and
            self.toxicity_analyzer.is_loaded and
            self.aggression_analyzer.is_loaded
        )
    
    def get_model_status(self) -> Dict:
        """
        Get current status of all models and analytical components.
        
        Returns:
            Dict with status for each dimension
        """
        return {
            "sentiment": {
                "loaded": self.sentiment_analyzer.is_loaded,
                "model": self.sentiment_analyzer.model_name,
                "device": getattr(self.sentiment_analyzer, "device", "unknown")
            },
            "toxicity": {
                "loaded": self.toxicity_analyzer.is_loaded,
                "model": self.toxicity_analyzer.model_name
            },
            "aggression": {
                "loaded": self.aggression_analyzer.is_loaded,
                "model": self.aggression_analyzer.method_name
            },
            "cyberbullying": {
                "loaded": True,
                "model": self.cyberbullying_analyzer.method_name
            }
        }
    
    def analyze(
        self,
        text: str,
        request_id: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Perform comprehensive NLP analysis on input text.
        
        Pipeline:
            text -> sentiment -> toxicity -> aggression -> cyberbullying -> evidence
            
        Args:
            text: Input text to analyze
            request_id: Optional request identifier (generated if not provided)
            context: Optional context information (e.g. videoTopic, condition)
            
        Returns:
            Dict containing:
                - request_id: str
                - text_metadata: Dict (character count, word count, language)
                - sentiment: Dict (sentiment analysis results)
                - toxicity: Dict (toxicity analysis results)
                - aggression: Dict (aggression analysis results)
                - cyberbullying: Dict (cyberbullying analysis results)
                - metadata: Dict (processing time, models used, device, timestamp)
                
        Raises:
            RuntimeError: If models not loaded
            ValueError: If text is empty or invalid
        """
        if not self.is_ready:
            raise RuntimeError(
                "Models not ready. Call load_models() first. "
                f"Status: {self.get_model_status()}"
            )
        
        # Generate request ID if not provided
        if request_id is None:
            request_id = str(uuid.uuid4())
        
        # Validate input
        if not text or not isinstance(text, str):
            raise ValueError("Input text must be a non-empty string")
        
        text_stripped = text.strip()
        if not text_stripped:
            raise ValueError("Input text cannot be empty or whitespace only")
        
        # Log request (DO NOT log raw participant text for privacy)
        logger.info(f"Analysis request {request_id}: {len(text_stripped)} characters")
        
        start_time = time.time()
        
        try:
            # 1. Sentiment analysis (XLM-RoBERTa)
            sentiment_result = self.sentiment_analyzer.analyze(text_stripped)
            
            # 2. Toxicity analysis (Detoxify)
            toxicity_result = self.toxicity_analyzer.analyze(text_stripped)
            
            # 3. Aggression analysis (Aggression Lexicon Model framework)
            aggression_result = self.aggression_analyzer.analyze(text_stripped)
            
            # 4. Cyberbullying assessment (Multi-dimensional operational criteria)
            cyberbullying_result = self.cyberbullying_analyzer.analyze(
                text=text_stripped,
                sentiment=sentiment_result,
                toxicity=toxicity_result,
                aggression=aggression_result,
                context=context
            )
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Build text metadata (basic statistics)
            text_metadata = {
                "character_count": len(text_stripped),
                "word_count": len(text_stripped.split()),
                "language": "unknown"
            }
            
            # Build analysis metadata
            analysis_metadata = {
                "request_id": request_id,
                "processing_time_ms": round(processing_time * 1000, 2),
                "models": {
                    "sentiment": self.sentiment_analyzer.model_name,
                    "toxicity": f"detoxify-{self.toxicity_analyzer.model_name}",
                    "aggression": "aggression-lexicon-xu-2020",
                    "cyberbullying": "research-operational-definition"
                },
                "device": self.sentiment_analyzer.device,
                "timestamp": time.time()
            }
            
            # Combine results cleanly preserving backward compatibility
            result = {
                "request_id": request_id,
                "text_metadata": text_metadata,
                "sentiment": sentiment_result,
                "toxicity": toxicity_result,
                "aggression": aggression_result,
                "cyberbullying": cyberbullying_result,
                "metadata": analysis_metadata
            }
            
            logger.info(
                f"Analysis {request_id} completed in {processing_time*1000:.2f}ms"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Analysis {request_id} failed: {str(e)}")
            raise RuntimeError(f"Analysis failed: {str(e)}")
