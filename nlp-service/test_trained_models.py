"""
Comprehensive Validation Script for Trained Aggression and Cyberbullying Models
Tests inference accuracy, scoring, and operational criteria across English and Roman Urdu.
"""

import sys
import os

# Ensure UTF-8 output encoding for emojis on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.aggression import AggressionAnalyzer
from app.services.cyberbullying import CyberbullyingAnalyzer
from app.services.roman_urdu import RomanUrduClassifier

def run_tests():
    print("=" * 80)
    print("COMPREHENSIVE TEST OF TRAINED AGGRESSION & CYBERBULLYING MODELS")
    print("=" * 80)

    agg_analyzer = AggressionAnalyzer()
    cb_analyzer = CyberbullyingAnalyzer()
    ru_classifier = RomanUrduClassifier()

    assert agg_analyzer.is_loaded, "AggressionAnalyzer should be loaded"
    assert agg_analyzer.model is not None, "AggressionAnalyzer trained ML model should be loaded"
    assert cb_analyzer.is_loaded, "CyberbullyingAnalyzer should be loaded"
    assert cb_analyzer.model is not None, "CyberbullyingAnalyzer trained ML model should be loaded"
    assert ru_classifier.is_ready, "RomanUrduClassifier should be ready"

    print("✅ All 3 ML Models Loaded Successfully into Memory!\n")

    test_cases = [
        {
            "name": "1. English Cyberbullying (Targeted Personal Attack)",
            "text": "You’re a joke, nobody cares about you.",
            "expect_agg": True,
            "expect_cb": True,
            "sentiment": {"label": "negative", "score": 0.95},
            "toxicity": {"overall_score": 0.85, "is_toxic": True, "categories": {"insult": 0.8}}
        },
        {
            "name": "2. English Cyberbullying (Cruel Harassment)",
            "text": "You're ugly and worthless, just disappear.",
            "expect_agg": True,
            "expect_cb": True,
            "sentiment": {"label": "negative", "score": 0.98},
            "toxicity": {"overall_score": 0.92, "is_toxic": True, "categories": {"insult": 0.9}}
        },
        {
            "name": "3. English Non-Bullying (Supportive & Polite)",
            "text": "Wishing you all the best in your exams! Happy birthday!",
            "expect_agg": False,
            "expect_cb": False,
            "sentiment": {"label": "positive", "score": 0.96},
            "toxicity": {"overall_score": 0.01, "is_toxic": False, "categories": {}}
        },
        {
            "name": "4. English Aggressive Wikipedia Comment (From 3. Aggressive_All)",
            "text": "hey shithead quit fucking with all the ufc pages and go get a fucking life you god damn mother fucking loser",
            "expect_agg": True,
            "expect_cb": True,
            "sentiment": {"label": "negative", "score": 0.99},
            "toxicity": {"overall_score": 0.97, "is_toxic": True, "categories": {"insult": 0.95}}
        },
        {
            "name": "5. Roman Urdu Cyber Abuse (From 'old data' Hostile)",
            "text": "tu bohat bara pagal aur kutta hai chup kar",
            "expect_agg": True,
            "expect_cb": True,
            "sentiment": {"label": "negative", "score": 0.88},
            "toxicity": {"overall_score": 0.65, "is_toxic": True, "categories": {}}
        },
        {
            "name": "6. Roman Urdu Neutral / Respectful (From 'old data' Neutral)",
            "text": "Mashallah shukriya share karne ke liye bhai bohot informative video thi",
            "expect_agg": False,
            "expect_cb": False,
            "sentiment": {"label": "positive", "score": 0.92},
            "toxicity": {"overall_score": 0.02, "is_toxic": False, "categories": {}}
        },
        {
            "name": "7. Intellectual Disagreement / Critique of Ideas (NOT personal cyberbullying)",
            "text": "I disagree with the conclusions reached in this presentation. In my opinion the data does not support this claim.",
            "expect_agg": False,
            "expect_cb": False,
            "sentiment": {"label": "negative", "score": 0.75},
            "toxicity": {"overall_score": 0.03, "is_toxic": False, "categories": {}}
        },
        {
            "name": "8. Violent Direct Threat",
            "text": "I will find you and attack you and destroy you.",
            "expect_agg": True,
            "expect_cb": True,
            "sentiment": {"label": "negative", "score": 0.95},
            "toxicity": {"overall_score": 0.98, "is_toxic": True, "categories": {"threat": 0.95}}
        }
    ]

    all_passed = True

    for tc in test_cases:
        print("-" * 75)
        print(f"TEST: {tc['name']}")
        print(f"TEXT: \"{tc['text']}\"")

        # 1. Roman Urdu
        ru_res = ru_classifier.analyze(tc["text"])

        # 2. Aggression
        agg_res = agg_analyzer.analyze(tc["text"])

        # 3. Cyberbullying
        cb_res = cb_analyzer.analyze(
            text=tc["text"],
            sentiment=tc["sentiment"],
            toxicity=tc["toxicity"],
            aggression=agg_res,
            roman_urdu=ru_res
        )

        agg_prob_str = f"{agg_res.get('ml_probability', 0.0):.4f}" if agg_res.get('ml_probability') is not None else "N/A"
        cb_prob_str = f"{cb_res.get('ml_probability', 0.0):.4f}" if cb_res.get('ml_probability') is not None else "N/A"

        print(f"  [Aggression]    Level: {agg_res['level'].upper():<8} Score: {agg_res['score']:.1f}/10  ML Prob: {agg_prob_str}  Aggressive: {agg_res['is_aggressive']}")
        print(f"  [Cyberbullying] Class: {cb_res['classification']:<15} Type: {cb_res['type']:<10} ML Prob: {cb_prob_str}  Bullying: {cb_res['is_cyberbullying']}")

        # Verify expectations
        agg_ok = (agg_res["is_aggressive"] == tc["expect_agg"]) if tc["expect_agg"] else (agg_res["level"] in ["none", "mild"] and not agg_res["is_aggressive"])
        cb_ok = (cb_res["is_cyberbullying"] == tc["expect_cb"]) if tc["expect_cb"] else (cb_res["classification"] in ["not_cyberbullying", "needs_review", "insufficient_evidence"] and not cb_res["is_cyberbullying"])

        if agg_ok and cb_ok:
            print("  >>> RESULT: PASS ✅")
        else:
            print(f"  >>> RESULT: FAIL ❌ (Expected Agg={tc['expect_agg']}, CB={tc['expect_cb']})")
            all_passed = False

    print("=" * 80)
    if all_passed:
        print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉")
    else:
        print("SOME TESTS FAILED - REVIEW OUTPUT ABOVE.")
    print("=" * 80)

    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
