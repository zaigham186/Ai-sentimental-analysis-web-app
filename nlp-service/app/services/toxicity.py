"""
Toxicity Analysis Service - PHASE 2 IMPLEMENTATION

Uses: Detoxify (multilingual)
- Pre-trained toxic comment classifier
- Detects: toxicity, severe_toxicity, obscene, threat, insult, identity_attack
- Multilingual support (though empirical validation needed per language)

Research considerations:
- Toxicity ≠ cyberbullying
- Toxic language can occur without targeted harassment
- Context matters:
  * Insult in general vs. directed at individual
  * Threat as expression vs. actual threatening behavior
  * Cultural and linguistic differences

Performance validation:
- Test on actual research data
- Validate threshold selection
- Consider false positive/negative rates
- Multilingual performance needs empirical validation
"""

from detoxify import Detoxify
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class ToxicityAnalyzer:
    """
    Toxicity Analysis using Detoxify multilingual model
    
    Model loads ONCE on initialization and is reused for all requests.
    Supports CPU and CUDA (GPU).
    """
    
    def __init__(self, model_name: str = "multilingual", threshold: float = 0.5):
        """
        Initialize toxicity analyzer with specified model.
        
        Args:
            model_name: Detoxify model type (multilingual, original, unbiased)
            threshold: Classification threshold (default 0.5)
        """
        self.model_name = model_name
        self.threshold = threshold
        self.model = None
        self._loaded = False
        
        logger.info(f"ToxicityAnalyzer initialized with model: {model_name}")
        logger.info(f"Classification threshold: {threshold}")
    
    def load(self) -> bool:
        """
        Load the toxicity detection model.
        
        Returns:
            bool: True if loading succeeded, False otherwise
        """
        try:
            logger.info(f"Loading toxicity model: {self.model_name}")
            
            # Load Detoxify model
            self.model = Detoxify(self.model_name)
            
            self._loaded = True
            logger.info(f"✅ Toxicity model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load toxicity model: {str(e)}")
            self._loaded = False
            return False
    
    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded and ready"""
        return self._loaded and self.model is not None
    
    def analyze(self, text: str) -> Dict:
        """
        Analyze toxicity of input text.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dict with keys:
                - overall_score: float (maximum toxicity score across categories)
                - is_toxic: bool (whether any category exceeds threshold)
                - categories: Dict[str, float] (all toxicity dimension scores)
                - threshold: float (classification threshold used)
                
        Raises:
            RuntimeError: If model not loaded
            ValueError: If text is empty or invalid
        """
        if not self.is_loaded:
            raise RuntimeError("Toxicity model not loaded. Call load() first.")
        
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty")
        
        try:
            # Get toxicity predictions
            results = self.model.predict(text)
            
            # Convert numpy types to native Python types
            categories = {}
            max_score = 0.0
            
            for key, value in results.items():
                score = float(value)
                categories[key] = score
                max_score = max(max_score, score)
            
            # Determine if toxic based on threshold
            is_toxic = max_score >= self.threshold
            
            return {
                "overall_score": max_score,
                "is_toxic": is_toxic,
                "categories": categories,
                "threshold": self.threshold
            }
            
        except Exception as e:
            logger.error(f"Error during toxicity analysis: {str(e)}")
            raise RuntimeError(f"Toxicity analysis failed: {str(e)}")
