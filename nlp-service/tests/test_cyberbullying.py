"""
Cyberbullying Classification Tests - PHASE 3 IMPLEMENTATION

Tests for multi-dimensional CyberbullyingAnalyzer based on research operational criteria.
"""

import pytest
from app.services.cyberbullying import CyberbullyingAnalyzer


@pytest.fixture(scope="module")
def cb_analyzer():
    """Create cyberbullying analyzer once for all tests."""
    return CyberbullyingAnalyzer()


def test_cb_initialization(cb_analyzer):
    """Test analyzer initialization and metadata"""
    assert "Research Operational Definition" in cb_analyzer.method_name
    assert len(cb_analyzer.limitations) > 0


def test_cb_case_a_negative_not_cyberbullying(cb_analyzer):
    """
    Test A: Negative sentiment without abuse or targeting
    Must NOT automatically become cyberbullying.
    """
    text = "I strongly disagree with this opinion. I found the presentation boring."
    sentiment = {"label": "negative", "score": 0.92, "probabilities": {"negative": 0.92, "neutral": 0.05, "positive": 0.03}}
    toxicity = {"overall_score": 0.001, "is_toxic": False, "categories": {"toxicity": 0.001, "insult": 0.0005}}
    aggression = {"score": 0.0, "level": "none", "is_aggressive": False, "is_personally_targeted": False, "matched_indicators": [], "categories": []}

    result = cb_analyzer.analyze(text, sentiment, toxicity, aggression)

    assert result["classification"] == "not_cyberbullying"
    assert result["is_cyberbullying"] is False
    assert result["type"] == "none"
    assert "NEGATIVE_SENTIMENT_WITHOUT_ABUSE" in result["reason_codes"]
    assert "NO_AGGRESSION_INDICATORS" in result["reason_codes"]
    assert result["needs_review"] is False


def test_cb_case_b_toxic_without_targeting(cb_analyzer):
    """
    Test B: Toxic language directed at content, not a person
    Must NOT automatically be classified as cyberbullying.
    """
    text = "What a dumb and stupid video."
    sentiment = {"label": "negative", "score": 0.85, "probabilities": {"negative": 0.85, "neutral": 0.10, "positive": 0.05}}
    toxicity = {"overall_score": 0.65, "is_toxic": True, "categories": {"toxicity": 0.65, "insult": 0.40, "obscene": 0.20}}
    aggression = {"score": 3.0, "level": "mild", "is_aggressive": False, "is_personally_targeted": False, "matched_indicators": ["dumb", "stupid"], "categories": ["hostile"], "needs_review": True}

    result = cb_analyzer.analyze(text, sentiment, toxicity, aggression)

    # Content critique with toxicity is not cyberbullying, flagged for review
    assert result["classification"] in ["needs_review", "insufficient_evidence", "not_cyberbullying"]
    assert result["is_cyberbullying"] is False
    assert result["needs_review"] is True


def test_cb_case_c_targeted_cyberbullying(cb_analyzer):
    """
    Test C: Personal attack with harmful insult and demeaning language
    Meets research criteria for cyberbullying.
    """
    text = "You are a worthless loser and nobody likes you."
    sentiment = {"label": "negative", "score": 0.95, "probabilities": {"negative": 0.95, "neutral": 0.03, "positive": 0.02}}
    toxicity = {"overall_score": 0.92, "is_toxic": True, "categories": {"toxicity": 0.92, "insult": 0.90, "severe_toxicity": 0.05}}
    aggression = {"score": 8.0, "level": "severe", "is_aggressive": True, "is_personally_targeted": True, "matched_indicators": ["worthless", "loser"], "categories": ["insult", "demeaning"], "needs_review": False}

    result = cb_analyzer.analyze(text, sentiment, toxicity, aggression)

    assert result["classification"] == "cyberbullying"
    assert result["is_cyberbullying"] is True
    assert result["type"] in ["denigration", "harassment"]
    assert result["severity"] >= 5.0
    assert "PERSONAL_TARGETING_DETECTED" in result["reason_codes"]
    assert "INSULT_INDICATOR" in result["reason_codes"]


def test_cb_case_d_threat_cyberbullying(cb_analyzer):
    """
    Test D: Direct personal threat
    Classified as cyberbullying with threat type, flagged for immediate review.
    """
    text = "I will hunt you down and destroy you."
    sentiment = {"label": "negative", "score": 0.96, "probabilities": {"negative": 0.96, "neutral": 0.03, "positive": 0.01}}
    toxicity = {"overall_score": 0.98, "is_toxic": True, "categories": {"toxicity": 0.98, "threat": 0.95, "severe_toxicity": 0.60}}
    aggression = {"score": 9.0, "level": "severe", "is_aggressive": True, "is_personally_targeted": True, "matched_indicators": ["destroy"], "categories": ["threat"], "needs_review": True}

    result = cb_analyzer.analyze(text, sentiment, toxicity, aggression)

    assert result["classification"] == "cyberbullying"
    assert result["is_cyberbullying"] is True
    assert result["type"] in ["threat", "harassment"]
    assert "THREAT_INDICATOR" in result["reason_codes"]
    assert result["needs_review"] is True


def test_cb_case_e_ambiguous_review(cb_analyzer):
    """
    Test E: Ambiguous case with conflicting evidence
    Must return needs_review / insufficient_evidence rather than forcing a binary label.
    """
    text = "People like that are pathetic."
    sentiment = {"label": "negative", "score": 0.70, "probabilities": {"negative": 0.70, "neutral": 0.20, "positive": 0.10}}
    toxicity = {"overall_score": 0.55, "is_toxic": True, "categories": {"toxicity": 0.55, "insult": 0.45}}
    aggression = {"score": 4.0, "level": "mild", "is_aggressive": False, "is_personally_targeted": False, "matched_indicators": ["pathetic"], "categories": ["hostile"], "needs_review": True}

    result = cb_analyzer.analyze(text, sentiment, toxicity, aggression)

    assert result["classification"] in ["needs_review", "insufficient_evidence"]
    assert result["needs_review"] is True
    assert "REQUIRES_HUMAN_REVIEW" in result["reason_codes"]


def test_cb_empty_input(cb_analyzer):
    """Test validation on empty input"""
    sentiment = {"label": "neutral", "score": 0.5}
    toxicity = {"overall_score": 0.0, "is_toxic": False}
    aggression = {"score": 0.0, "level": "none"}

    with pytest.raises(ValueError, match="Input text cannot be empty"):
        cb_analyzer.analyze("", sentiment, toxicity, aggression)
