"""
Pydantic Schemas for Analysis API - PHASE 3 IMPLEMENTATION

Request/response models for NLP analysis endpoints.
Supports Sentiment, Toxicity, Aggression, and Cyberbullying dimensions.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, List, Any

# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class AnalysisContext(BaseModel):
    """
    Optional context information for analysis
    """
    videoTopic: Optional[str] = Field(None, description="Topic of the video")
    videoOrder: Optional[int] = Field(None, description="Order/sequence of video")
    condition: Optional[str] = Field(None, description="Experimental condition")


class AnalysisRequest(BaseModel):
    """
    Request for comprehensive NLP analysis
    
    Endpoint: POST /analyze
    """
    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Text to analyze (1-5000 characters)"
    )
    context: Optional[AnalysisContext] = Field(
        None,
        description="Optional experimental context"
    )
    
    @field_validator('text')
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        """Validate text is not just whitespace"""
        if not v or not v.strip():
            raise ValueError("Text cannot be empty or whitespace only")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "This is a sample participant response to analyze.",
                "context": {
                    "videoTopic": "Social Media Interaction",
                    "videoOrder": 1,
                    "condition": "anonymous"
                }
            }
        }
    )


# ============================================================================
# RESPONSE SCHEMAS - PHASE 2 (PERSISTED)
# ============================================================================

class TextMetadata(BaseModel):
    """Metadata about the analyzed text"""
    character_count: int = Field(..., description="Number of characters")
    word_count: int = Field(..., description="Number of words")
    language: str = Field(default="unknown", description="Detected language (Phase 2: unknown)")


class SentimentResult(BaseModel):
    """Sentiment analysis result from XLM-RoBERTa"""
    label: str = Field(..., description="Sentiment label: negative, neutral, or positive")
    score: float = Field(..., ge=0.0, le=1.0, description="Confidence score for predicted label")
    probabilities: Dict[str, float] = Field(..., description="Probabilities for all classes")


class ToxicityResult(BaseModel):
    """Toxicity analysis result from Detoxify"""
    overall_score: float = Field(..., ge=0.0, le=1.0, description="Maximum toxicity score")
    is_toxic: bool = Field(..., description="Whether content exceeds toxicity threshold")
    categories: Dict[str, float] = Field(..., description="Scores for toxicity dimensions")
    threshold: float = Field(..., description="Classification threshold used")


# ============================================================================
# RESPONSE SCHEMAS - PHASE 3 (AGGRESSION & CYBERBULLYING)
# ============================================================================

class AggressionPosition(BaseModel):
    """Character span position of an identified term"""
    start: int = Field(..., description="Character start index (0-based)")
    end: int = Field(..., description="Character end index")


class AggressionEvidenceItem(BaseModel):
    """Evidence item for aggression indicator"""
    term: str = Field(..., description="Detected term")
    category: str = Field(..., description="Aggression category (hostile, insult, threat, demeaning)")
    position: AggressionPosition = Field(..., description="Span position in original text")


class AggressionResult(BaseModel):
    """Aggression analysis result based on Aggression Lexicon Model framework"""
    score: float = Field(..., ge=0.0, le=10.0, description="Aggression level on 0-10 scale")
    engineering_normalized_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Engineering normalized score 0.0-1.0")
    level: str = Field(..., description="Aggression category: none, mild, moderate, severe")
    is_aggressive: bool = Field(..., description="Whether aggression exceeds moderate threshold")
    is_personally_targeted: bool = Field(..., description="Whether language is directed against a person")
    matched_indicators: List[str] = Field(default_factory=list, description="Unique indicator terms matched")
    categories: List[str] = Field(default_factory=list, description="Aggression categories present")
    evidence: List[AggressionEvidenceItem] = Field(default_factory=list, description="Matched evidence with span offsets")
    method: str = Field(..., description="Methodology framework applied")
    needs_review: bool = Field(..., description="Whether response requires human review")


class CyberbullyingResult(BaseModel):
    """Cyberbullying classification based on operational multi-dimensional criteria"""
    classification: str = Field(..., description="Classification: cyberbullying, not_cyberbullying, needs_review, insufficient_evidence")
    is_cyberbullying: bool = Field(..., description="Whether operational cyberbullying criteria are satisfied")
    type: str = Field(..., description="Type: harassment, denigration, flaming, threat, none")
    severity: float = Field(..., ge=0.0, le=10.0, description="Severity rating on 0-10 scale")
    score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Normalized composite score")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Model confidence score (not empirical accuracy)")
    evidence: List[str] = Field(default_factory=list, description="Rationale evidence statements")
    indicators: List[str] = Field(default_factory=list, description="Operational indicators matched")
    reason_codes: List[str] = Field(default_factory=list, description="Deterministic reason codes")
    needs_review: bool = Field(..., description="Whether response requires human researcher review")
    method: str = Field(..., description="Methodology operational definition")
    limitations: List[str] = Field(default_factory=list, description="Research limitations statement")


class AnalysisMetadata(BaseModel):
    """Metadata about the analysis process"""
    request_id: str = Field(..., description="Unique request identifier")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    models: Dict[str, str] = Field(..., description="Models used for analysis")
    device: str = Field(..., description="Device used (cpu or cuda)")
    timestamp: float = Field(..., description="Unix timestamp of analysis")


class AnalysisResponse(BaseModel):
    """
    Comprehensive analysis response - PHASE 3
    
    Endpoint: POST /analyze
    """
    success: bool = Field(True, description="Request success status")
    request_id: str = Field(..., description="Unique request identifier")
    text_metadata: TextMetadata = Field(..., description="Text statistics")
    sentiment: SentimentResult = Field(..., description="Sentiment analysis results")
    toxicity: ToxicityResult = Field(..., description="Toxicity analysis results")
    aggression: Optional[AggressionResult] = Field(None, description="Aggression analysis results")
    cyberbullying: Optional[CyberbullyingResult] = Field(None, description="Cyberbullying analysis results")
    metadata: AnalysisMetadata = Field(..., description="Processing metadata")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "request_id": "550e8400-e29b-41d4-a716-446655440000",
                "text_metadata": {
                    "character_count": 42,
                    "word_count": 8,
                    "language": "unknown"
                },
                "sentiment": {
                    "label": "negative",
                    "score": 0.85,
                    "probabilities": {
                        "negative": 0.85,
                        "neutral": 0.10,
                        "positive": 0.05
                    }
                },
                "toxicity": {
                    "overall_score": 0.15,
                    "is_toxic": False,
                    "categories": {
                        "toxicity": 0.15,
                        "severe_toxicity": 0.02,
                        "obscene": 0.01,
                        "threat": 0.01,
                        "insult": 0.08,
                        "identity_attack": 0.01
                    },
                    "threshold": 0.5
                },
                "aggression": {
                    "score": 0.0,
                    "engineering_normalized_score": 0.0,
                    "level": "none",
                    "is_aggressive": False,
                    "is_personally_targeted": False,
                    "matched_indicators": [],
                    "categories": [],
                    "evidence": [],
                    "method": "Aggression Lexicon Model (Xu et al., 2020) - Research Operational Framework",
                    "needs_review": False
                },
                "cyberbullying": {
                    "classification": "not_cyberbullying",
                    "is_cyberbullying": False,
                    "type": "none",
                    "severity": 0.0,
                    "score": 0.0,
                    "confidence": 0.90,
                    "evidence": ["No personal targeting or abusive language detected."],
                    "indicators": [],
                    "reason_codes": ["NO_AGGRESSION_INDICATORS"],
                    "needs_review": False,
                    "method": "Research Operational Definition (Multi-dimensional Assessment)",
                    "limitations": [
                        "Model confidence is not empirical research accuracy.",
                        "Human researcher review is strictly required for official coding."
                    ]
                },
                "metadata": {
                    "request_id": "550e8400-e29b-41d4-a716-446655440000",
                    "processing_time_ms": 234.56,
                    "models": {
                        "sentiment": "cardiffnlp/twitter-xlm-roberta-base-sentiment",
                        "toxicity": "detoxify-multilingual",
                        "aggression": "aggression-lexicon-xu-2020",
                        "cyberbullying": "research-operational-definition"
                    },
                    "device": "cpu",
                    "timestamp": 1699564800.0
                }
            }
        }
    )


# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = Field(False, description="Request success status")
    error: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": False,
                "error": "Text cannot be empty or whitespace only",
                "details": {
                    "error_type": "ValidationError"
                }
            }
        }
    )
