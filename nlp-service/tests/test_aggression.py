"""
Aggression Analysis Tests - PHASE 3 IMPLEMENTATION

Tests for research-aligned AggressionAnalyzer based on the Aggression Lexicon Model framework.
"""

import pytest
from app.services.aggression import AggressionAnalyzer


@pytest.fixture(scope="module")
def aggression_analyzer():
    """Create and load aggression analyzer once for all tests."""
    analyzer = AggressionAnalyzer()
    assert analyzer.is_loaded
    return analyzer


def test_aggression_analyzer_initialization():
    """Test analyzer initialization and load status"""
    analyzer = AggressionAnalyzer()
    assert analyzer.is_loaded
    assert "Aggression Lexicon Model" in analyzer.method_name


def test_aggression_case_1_neutral(aggression_analyzer):
    """Case 1 — Neutral: Positive/neutral feedback should have no aggression"""
    text = "I enjoyed watching this video."
    result = aggression_analyzer.analyze(text)

    assert result["score"] == 0.0
    assert result["level"] == "none"
    assert result["is_aggressive"] is False
    assert result["is_personally_targeted"] is False
    assert len(result["matched_indicators"]) == 0
    assert len(result["evidence"]) == 0
    assert result["needs_review"] is False


def test_aggression_case_2_criticism(aggression_analyzer):
    """Case 2 — Criticism: Disagreement without hostile language is not aggressive"""
    text = "I disagree with the person's opinion."
    result = aggression_analyzer.analyze(text)

    assert result["score"] == 0.0
    assert result["level"] == "none"
    assert result["is_aggressive"] is False
    assert result["is_personally_targeted"] is False
    assert len(result["matched_indicators"]) == 0


def test_aggression_case_2b_content_critique(aggression_analyzer):
    """Case 2b — Critique of content with harsh words: none/mild, marked for review"""
    text = "In my opinion the idea and the video is dumb."
    result = aggression_analyzer.analyze(text)

    assert result["is_personally_targeted"] is False
    assert result["level"] in ["none", "mild"]
    assert "dumb" in result["matched_indicators"]
    # Critique with harsh word triggers review flag to verify idea vs person
    assert result["needs_review"] is True


def test_aggression_case_3_aggressive_insult(aggression_analyzer):
    """Case 3 — Aggressive/insulting: Personal attack detected"""
    text = "You are an idiot and completely stupid."
    result = aggression_analyzer.analyze(text)

    assert result["is_personally_targeted"] is True
    assert result["is_aggressive"] is True
    assert result["level"] in ["moderate", "severe"]
    assert result["score"] >= 5.0
    assert "idiot" in result["matched_indicators"]
    assert "stupid" in result["matched_indicators"]
    assert len(result["evidence"]) >= 2


def test_aggression_case_4_threatening(aggression_analyzer):
    """Case 4 — Threatening: Violent/threatening language flagged as severe"""
    text = "I will hurt and attack you."
    result = aggression_analyzer.analyze(text)

    assert result["level"] == "severe"
    assert result["score"] >= 7.0
    assert result["is_aggressive"] is True
    assert "threat" in result["categories"]
    assert result["needs_review"] is True  # Severe threats flag researcher review


def test_aggression_evidence_positions(aggression_analyzer):
    """Test that evidence accurately identifies word span positions"""
    text = "He is an idiot."
    result = aggression_analyzer.analyze(text)

    assert len(result["evidence"]) >= 1
    item = result["evidence"][0]
    assert item["term"].lower() == "idiot"
    start = item["position"]["start"]
    end = item["position"]["end"]
    assert text[start:end].lower() == "idiot"


def test_aggression_input_immutability(aggression_analyzer):
    """Test that analyzer does NOT mutate the original input string"""
    original_text = "You are a Fool."
    saved_copy = str(original_text)

    aggression_analyzer.analyze(original_text)

    assert original_text == saved_copy


def test_aggression_empty_text(aggression_analyzer):
    """Test validation on empty and whitespace-only text"""
    with pytest.raises(ValueError, match="Input text cannot be empty"):
        aggression_analyzer.analyze("")

    with pytest.raises(ValueError, match="Input text cannot be empty"):
        aggression_analyzer.analyze("   \n\t  ")


def test_aggression_determinism(aggression_analyzer):
    """Test that identical text produces identical scores and evidence"""
    text = "You are completely worthless and useless."

    res1 = aggression_analyzer.analyze(text)
    res2 = aggression_analyzer.analyze(text)

    assert res1["score"] == res2["score"]
    assert res1["level"] == res2["level"]
    assert res1["matched_indicators"] == res2["matched_indicators"]
    assert len(res1["evidence"]) == len(res2["evidence"])
