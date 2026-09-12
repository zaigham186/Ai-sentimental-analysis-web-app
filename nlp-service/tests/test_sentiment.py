"""
Sentiment Analysis Tests - PHASE 2 IMPLEMENTATION

Tests for real sentiment analyzer using XLM-RoBERTa multilingual model.
"""

import pytest
from app.services.sentiment import SentimentAnalyzer


@pytest.fixture(scope="module")
def sentiment_analyzer():
    """
    Create and load sentiment analyzer once for all tests.
    Scope='module' ensures model is loaded only once.
    """
    analyzer = SentimentAnalyzer()
    success = analyzer.load()
    assert success, "Failed to load sentiment model"
    assert analyzer.is_loaded, "Sentiment analyzer not ready"
    return analyzer


def test_sentiment_analyzer_initialization():
    """Test sentiment analyzer can be initialized"""
    analyzer = SentimentAnalyzer()
    assert analyzer.model_name == "cardiffnlp/twitter-xlm-roberta-base-sentiment"
    assert analyzer.device in ["cpu", "cuda"]
    assert not analyzer.is_loaded  # Not loaded until load() is called


def test_sentiment_model_loading():
    """Test sentiment model can be loaded"""
    analyzer = SentimentAnalyzer()
    success = analyzer.load()
    assert success, "Model loading should succeed"
    assert analyzer.is_loaded, "Model should be marked as loaded"
    assert analyzer.model is not None
    assert analyzer.tokenizer is not None


def test_sentiment_positive(sentiment_analyzer):
    """Test positive sentiment detection"""
    text = "I love this! It's wonderful and amazing!"
    result = sentiment_analyzer.analyze(text)
    
    # Check structure
    assert "label" in result
    assert "score" in result
    assert "probabilities" in result
    
    # Check types
    assert isinstance(result["label"], str)
    assert isinstance(result["score"], float)
    assert isinstance(result["probabilities"], dict)
    
    # Check value ranges
    assert 0.0 <= result["score"] <= 1.0
    assert result["label"] in ["negative", "neutral", "positive"]
    
    # Check probabilities sum to ~1.0
    prob_sum = sum(result["probabilities"].values())
    assert 0.99 <= prob_sum <= 1.01, f"Probabilities should sum to ~1.0, got {prob_sum}"


def test_sentiment_negative(sentiment_analyzer):
    """Test negative sentiment detection"""
    text = "This is terrible! I hate it so much. Awful experience."
    result = sentiment_analyzer.analyze(text)
    
    # Check structure and types (same as positive test)
    assert "label" in result
    assert "score" in result
    assert "probabilities" in result
    assert result["label"] in ["negative", "neutral", "positive"]
    assert 0.0 <= result["score"] <= 1.0


def test_sentiment_neutral(sentiment_analyzer):
    """Test neutral sentiment detection"""
    text = "The meeting is scheduled for 3 PM tomorrow."
    result = sentiment_analyzer.analyze(text)
    
    # Check structure
    assert "label" in result
    assert "score" in result
    assert "probabilities" in result
    assert result["label"] in ["negative", "neutral", "positive"]


def test_sentiment_empty_text(sentiment_analyzer):
    """Test error handling for empty text"""
    with pytest.raises(ValueError, match="Input text cannot be empty"):
        sentiment_analyzer.analyze("")


def test_sentiment_whitespace_only(sentiment_analyzer):
    """Test error handling for whitespace-only text"""
    with pytest.raises(ValueError, match="Input text cannot be empty"):
        sentiment_analyzer.analyze("   \t\n   ")


def test_sentiment_not_loaded():
    """Test error when analyzing without loading model"""
    analyzer = SentimentAnalyzer()
    # Do not call load()
    
    with pytest.raises(RuntimeError, match="Sentiment model not loaded"):
        analyzer.analyze("This should fail")


def test_sentiment_multilingual_english(sentiment_analyzer):
    """Test sentiment on English text"""
    text = "This product exceeded my expectations!"
    result = sentiment_analyzer.analyze(text)
    
    assert result["label"] in ["negative", "neutral", "positive"]
    assert 0.0 <= result["score"] <= 1.0
    assert len(result["probabilities"]) == 3


def test_sentiment_probabilities_structure(sentiment_analyzer):
    """Test that probabilities contain all expected labels"""
    text = "Sample text for testing probabilities"
    result = sentiment_analyzer.analyze(text)
    
    # Should have probabilities for all three classes
    expected_labels = {"negative", "neutral", "positive"}
    actual_labels = set(result["probabilities"].keys())
    assert expected_labels == actual_labels, f"Expected {expected_labels}, got {actual_labels}"
    
    # All probabilities should be valid
    for label, prob in result["probabilities"].items():
        assert 0.0 <= prob <= 1.0, f"Probability for {label} out of range: {prob}"


def test_sentiment_long_text(sentiment_analyzer):
    """Test sentiment on longer text (should be truncated by tokenizer)"""
    # Create a long text (tokenizer will truncate to 512 tokens)
    text = " ".join(["This is a sentence that expresses positive sentiment."] * 100)
    result = sentiment_analyzer.analyze(text)
    
    # Should still work despite length
    assert "label" in result
    assert "score" in result
    assert result["label"] in ["negative", "neutral", "positive"]


def test_sentiment_consistency(sentiment_analyzer):
    """Test that same text produces same results (deterministic)"""
    text = "I really enjoyed this experience!"
    
    result1 = sentiment_analyzer.analyze(text)
    result2 = sentiment_analyzer.analyze(text)
    
    # Results should be identical
    assert result1["label"] == result2["label"]
    assert abs(result1["score"] - result2["score"]) < 0.0001  # Allow tiny floating point differences
    
    for label in result1["probabilities"]:
        assert abs(result1["probabilities"][label] - result2["probabilities"][label]) < 0.0001
