"""
Unit and Integration Tests for Roman Urdu Cyber Abuse Detection
Verifies model inference, aggression lexicon enrichment, and cyberbullying integration.
"""

import sys
import os

# Ensure UTF-8 output encoding for emojis on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.roman_urdu import RomanUrduClassifier
from app.services.aggression import AggressionAnalyzer
from app.services.cyberbullying import CyberbullyingAnalyzer
from app.services.analyzer import UnifiedAnalyzer


def test_roman_urdu_classifier():
    print("\n--- Test 1: RomanUrduClassifier Direct Inference ---")
    classifier = RomanUrduClassifier()
    assert classifier.is_ready, "RomanUrduClassifier should be loaded and ready"

    # Abusive samples
    abusive_samples = [
        "Aray bakwaas baatein mat kar lol",
        "ARAY KYA FALTU! INSAN HY BRO",
        "tum smajhta kyaa haii apne aap ko lol",
        "tujhe sharam nahi aati",
        "MASHALLAH TERA CONTENT! BAKWAS HY :)",
        "Yaar dimagh kharab kar dia"
    ]

    for sample in abusive_samples:
        result = classifier.analyze(sample)
        print(f"  [Sample] '{sample}' -> Abuse Prob: {result['abuse_probability']:.4f}, Label: {result['label']}")
        assert result["is_abusive"], f"Expected '{sample}' to be classified as abusive (H)"
        assert result["label"] == "H", f"Expected label H for '{sample}'"
        assert result["abuse_probability"] >= 0.50

    # Friendly / Neutral samples
    friendly_samples = [
        "Mashallah shukriya share karne ke liye bhai",
        "good luck for neext project bro",
        "Bhai very helpful bro",
        "very clean editing",
        "YAAR TUMHARA KONTENT INSPIRE KARTA HAI :)",
        "kamal ka effort haii bro",
        "proud of you bro yaar nice"
    ]

    for sample in friendly_samples:
        result = classifier.analyze(sample)
        print(f"  [Sample] '{sample}' -> Abuse Prob: {result['abuse_probability']:.4f}, Label: {result['label']}")
        assert not result["is_abusive"], f"Expected '{sample}' to be classified as non-abusive (O)"
        assert result["label"] == "O", f"Expected label O for '{sample}'"
        assert result["abuse_probability"] < 0.50

    print("✓ Test 1: RomanUrduClassifier passed all tests successfully!")


def test_aggression_roman_urdu():
    print("\n--- Test 2: AggressionAnalyzer Roman Urdu Indicators & Targeting ---")
    analyzer = AggressionAnalyzer()
    assert analyzer.is_loaded

    # Sample with personal targeting: "tera content bakwas hai"
    res1 = analyzer.analyze("MASHALLAH TERA CONTENT! BAKWAS HY")
    print(f"  [res1] Indicators: {res1['matched_indicators']}, Targeting: {res1['is_personally_targeted']}, Score: {res1['score']}")
    assert len(res1["matched_indicators"]) > 0, "Should detect 'bakwas'"
    assert res1["is_personally_targeted"], "Should detect personal targeting with 'tera'"

    # Sample: "tu pagal hai"
    res2 = analyzer.analyze("tu pagal hai chup kar")
    print(f"  [res2] Indicators: {res2['matched_indicators']}, Targeting: {res2['is_personally_targeted']}, Score: {res2['score']}")
    assert "pagal" in res2["matched_indicators"] or "chup kar" in res2["matched_indicators"]
    assert res2["is_personally_targeted"], "Should detect personal targeting with 'tu'"

    # Neutral sample
    res3 = analyzer.analyze("Mashallah shukriya share karne ke liye bhai")
    assert len(res3["matched_indicators"]) == 0
    assert res3["score"] == 0.0

    print("✓ Test 2: AggressionAnalyzer Roman Urdu passed!")


def test_cyberbullying_integration():
    print("\n--- Test 3: CyberbullyingAnalyzer Integration with Roman Urdu ---")
    cb_analyzer = CyberbullyingAnalyzer()
    agg_analyzer = AggressionAnalyzer()
    ru_classifier = RomanUrduClassifier()

    sample = "tu samjhta kya hai apne aap ko faltu insan"
    agg_res = agg_analyzer.analyze(sample)
    ru_res = ru_classifier.analyze(sample)
    
    cb_res = cb_analyzer.analyze(
        text=sample,
        sentiment={"label": "negative", "score": 0.8},
        toxicity={"overall_score": 0.3, "is_toxic": False, "categories": {}},
        aggression=agg_res,
        roman_urdu=ru_res
    )

    print(f"  [Cyberbullying] Classification: {cb_res['classification']}, Severity: {cb_res['severity']}, Evidence: {cb_res['evidence']}")
    assert cb_res["classification"] == "cyberbullying", "Targeted Roman Urdu abuse should be classified as cyberbullying"
    assert "ROMAN_URDU_ABUSE_DETECTED" in cb_res["reason_codes"]
    assert cb_res["severity"] >= 5.0

    print("✓ Test 3: CyberbullyingAnalyzer Roman Urdu passed!")


def test_english_regression():
    print("\n--- Test 4: English Backward Compatibility Regression Check ---")
    agg_analyzer = AggressionAnalyzer()
    cb_analyzer = CyberbullyingAnalyzer()

    sample_en = "You are a stupid idiot and I will destroy you"
    agg_en = agg_analyzer.analyze(sample_en)
    assert agg_en["is_personally_targeted"], "English targeting should work"
    assert "threat" in agg_en["categories"]
    assert "hostile" in agg_en["categories"] or "insult" in agg_en["categories"]

    cb_en = cb_analyzer.analyze(
        text=sample_en,
        sentiment={"label": "negative", "score": 0.95},
        toxicity={"overall_score": 0.95, "is_toxic": True, "categories": {"threat": 0.9}},
        aggression=agg_en
    )
    assert cb_en["classification"] == "cyberbullying"
    assert cb_en["type"] == "threat"

    print("✓ Test 4: English regression check passed!")


if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING ROMAN URDU CYBER ABUSE TEST SUITE")
    print("=" * 60)
    test_roman_urdu_classifier()
    test_aggression_roman_urdu()
    test_cyberbullying_integration()
    test_english_regression()
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY! ✅")
    print("=" * 60)
