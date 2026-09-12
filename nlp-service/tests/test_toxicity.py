"""
Toxicity Analysis Tests - PHASE 2 IMPLEMENTATION

Tests for real toxicity analyzer using Detoxify multilingual model.
"""

import pytest
from app.services.toxicity import ToxicityAnalyzer


@pytest.fixture(scope="module")
def toxicity_analyzer():
    """
    Create and load toxicity analyzer once for all tests.
    Scope='module' ensures model is loaded only once.
    """
    analyzer = ToxicityAnalyzer()
    success = analyzer.load()
    assert success, "Failed to load toxicity model"
    assert analyzer.is_loaded, "Toxicity analyzer not ready"
    return analyzer


def test_toxicity_analyzer_initialization():
    """Test toxicity analyzer can be initialized"""
    analyzer = ToxicityAnalyzer()
    assert analyzer.model_name == "multilingual"
    assert analyzer.threshold == 0.5
    assert not analyzer.is_loaded  # Not loaded until load() is called


def test_toxicity_model_loading():
    """Test toxicity model can be loaded"""
    analyzer = ToxicityAnalyzer()
    success = analyzer.load()
    assert success, "Model loading should succeed"
    assert analyzer.is_loaded, "Model should be marked as loaded"
    assert analyzer.model is not None


def test_toxicity_custom_threshold():
    """Test custom threshold configuration"""
    analyzer = ToxicityAnalyzer(threshold=0.7)
    assert analyzer.threshold == 0.7


def test_toxicity_non_toxic_text(toxicity_analyzer):
    """Test non-toxic content classification"""
    text = "Have a great day! Hope you enjoy the sunshine."
    result = toxicity_analyzer.analyze(text)
    
    # Check structure
    assert "overall_score" in result
    assert "is_toxic" in result
    assert "categories" in result
    assert "threshold" in result
    
    # Check types
    assert isinstance(result["overall_score"], float)
    assert isinstance(result["is_toxic"], bool)
    assert isinstance(result["categories"], dict)
    assert isinstance(result["threshold"], float)
    
    # Check value ranges
    assert 0.0 <= result["overall_score"] <= 1.0
    assert result["threshold"] == 0.5


def test_toxicity_toxic_text(toxicity_analyzer):
    """Test toxic content detection"""
    text = "You're stupid and I hate you!"
    result = toxicity_analyzer.analyze(text)
    
    # Check structure
    assert "overall_score" in result
    assert "is_toxic" in result
    assert "categories" in result
    
    # All category scores should be valid probabilities
    for category, score in result["categories"].items():
        assert 0.0 <= score <= 1.0, f"Score for {category} out of range: {score}"


def test_toxicity_categories_present(toxicity_analyzer):
    """Test that all expected toxicity categories are present"""
    text = "Sample text for category testing"
    result = toxicity_analyzer.analyze(text)
    
    # Detoxify multilingual returns these categories (including sexual_explicit)
    expected_categories = {"toxicity", "severe_toxicity", "obscene", "threat", "insult", "identity_attack", "sexual_explicit"}
    actual_categories = set(result["categories"].keys())
    
    assert expected_categories == actual_categories, f"Expected {expected_categories}, got {actual_categories}"


def test_toxicity_overall_score_is_maximum(toxicity_analyzer):
    """Test that overall_score is the maximum of all category scores"""
    text = "This is a test message"
    result = toxicity_analyzer.analyze(text)
    
    max_category_score = max(result["categories"].values())
    
    # Overall score should equal the maximum category score
    assert abs(result["overall_score"] - max_category_score) < 0.0001, \
        f"Overall score {result['overall_score']} should equal max category score {max_category_score}"


def test_toxicity_threshold_behavior(toxicity_analyzer):
    """Test threshold-based classification"""
    text = "Sample text"
    result = toxicity_analyzer.analyze(text)
    
    # is_toxic should be True if overall_score >= threshold
    expected_toxic = result["overall_score"] >= result["threshold"]
    assert result["is_toxic"] == expected_toxic


def test_toxicity_empty_text(toxicity_analyzer):
    """Test error handling for empty text"""
    with pytest.raises(ValueError, match="Input text cannot be empty"):
        toxicity_analyzer.analyze("")


def test_toxicity_whitespace_only(toxicity_analyzer):
    """Test error handling for whitespace-only text"""
    with pytest.raises(ValueError, match="Input text cannot be empty"):
        toxicity_analyzer.analyze("   \t\n   ")


def test_toxicity_not_loaded():
    """Test error when analyzing without loading model"""
    analyzer = ToxicityAnalyzer()
    # Do not call load()
    
    with pytest.raises(RuntimeError, match="Toxicity model not loaded"):
        analyzer.analyze("This should fail")


def test_toxicity_multilingual_english(toxicity_analyzer):
    """Test toxicity on English text"""
    text = "This is a polite and respectful message."
    result = toxicity_analyzer.analyze(text)
    
    assert 0.0 <= result["overall_score"] <= 1.0
    assert len(result["categories"]) in (6, 7)


def test_toxicity_consistency(toxicity_analyzer):
    """Test that same text produces same results (deterministic)"""
    text = "This is a consistent test message"
    
    result1 = toxicity_analyzer.analyze(text)
    result2 = toxicity_analyzer.analyze(text)
    
    # Results should be identical (or very close due to floating point)
    assert result1["is_toxic"] == result2["is_toxic"]
    assert abs(result1["overall_score"] - result2["overall_score"]) < 0.0001
    
    for category in result1["categories"]:
        assert abs(result1["categories"][category] - result2["categories"][category]) < 0.0001


def test_toxicity_moderate_content(toxicity_analyzer):
    """Test borderline/moderate content"""
    text = "I disagree with your opinion."
    result = toxicity_analyzer.analyze(text)
    
    # Should produce valid scores regardless of classification
    assert 0.0 <= result["overall_score"] <= 1.0
    assert isinstance(result["is_toxic"], bool)
    assert len(result["categories"]) in (6, 7)


def test_toxicity_long_text(toxicity_analyzer):
    """Test toxicity on longer text"""
    text = " ".join(["This is a polite sentence."] * 50)
    result = toxicity_analyzer.analyze(text)
    
    # Should still work despite length
    assert "overall_score" in result
    assert "is_toxic" in result
    assert 0.0 <= result["overall_score"] <= 1.0
