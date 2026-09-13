"""
Cyberbullying Classification Service - PHASE 3 IMPLEMENTATION

Implements the research project's operational definition of cyberbullying.

CRITICAL RESEARCH RULES:
1. Negative Sentiment ≠ Cyberbullying: A critical, bored, or negative response
   to video content is legitimate discourse, NOT cyberbullying.
2. Toxicity ≠ Cyberbullying: Vulgarity or abusive words without personal targeting
   or harassment pattern is not cyberbullying.
3. Aggression ≠ Cyberbullying: Aggressive debate or harsh critique of ideas
   is not cyberbullying.
4. Cyberbullying requires:
   - Personal Targeting: Directed against an individual or group.
   - Harmful Intent / High Severity: Threats, sustained denigration, or severe harassment.
5. Ambiguous cases must be flagged with 'needs_review' or 'insufficient_evidence'.
6. AI provides suggestions only; human research review is required.
"""

import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class CyberbullyingAnalyzer:
    """
    Multi-dimensional Cyberbullying Analyzer based on research operational criteria.
    Integrates sentiment, toxicity, aggression, and context deterministically.
    """

    def __init__(self):
        self.method_name = "Research Operational Definition (Multi-dimensional Assessment)"
        self.limitations = [
            "Model confidence is not empirical research accuracy.",
            "Single-text analysis cannot definitively verify longitudinal repetition or power imbalance.",
            "Human researcher review is strictly required for official coding.",
            "Colloquial dialect and Roman Urdu nuances require empirical validation against human ground-truth."
        ]

    def analyze(
        self,
        text: str,
        sentiment: Dict,
        toxicity: Dict,
        aggression: Dict,
        context: Optional[Dict] = None,
        roman_urdu: Optional[Dict] = None
    ) -> Dict:
        """
        Evaluate cyberbullying presence using the operational criteria.

        Args:
            text: Original participant response text
            sentiment: Sentiment analysis result dict
            toxicity: Toxicity analysis result dict
            aggression: Aggression analysis result dict
            context: Optional experiment context (e.g. videoTopic, condition)
            roman_urdu: Optional Roman Urdu cyber abuse analysis dict

        Returns:
            Dict containing classification, type, confidence, evidence, indicators,
            reason_codes, needs_review, method, limitations
        """
        if text is None or not text.strip():
            raise ValueError("Input text cannot be empty")

        reason_codes = []
        indicators = []
        evidence = []

        # Extract features from component analyses
        sentiment_label = sentiment.get("label", "neutral")
        is_toxic = toxicity.get("is_toxic", False)
        toxicity_score = toxicity.get("overall_score", 0.0)
        tox_categories = toxicity.get("categories", {})

        aggression_score = aggression.get("score", 0.0)
        aggression_level = aggression.get("level", "none")
        is_personally_targeted = aggression.get("is_personally_targeted", False)
        agg_categories = aggression.get("categories", [])
        matched_indicators = aggression.get("matched_indicators", [])

        # Extract Roman Urdu features if available
        roman_urdu_is_abusive = bool(roman_urdu and roman_urdu.get("is_abusive", False))
        roman_urdu_prob = float(roman_urdu.get("abuse_probability", 0.0)) if roman_urdu else 0.0
        roman_urdu_terms = roman_urdu.get("detected_terms", []) if roman_urdu else []

        if roman_urdu_is_abusive or roman_urdu_prob >= 0.50:
            indicators.append("roman_urdu_abuse")
            reason_codes.append("ROMAN_URDU_ABUSE_DETECTED")
            if is_personally_targeted:
                reason_codes.append("ROMAN_URDU_PERSONAL_TARGETING")

        # 1. Evaluate Aggression indicators
        if not matched_indicators and not roman_urdu_is_abusive:
            reason_codes.append("NO_AGGRESSION_INDICATORS")
        elif matched_indicators:
            reason_codes.append("AGGRESSION_INDICATOR_DETECTED")

        if "insult" in agg_categories or tox_categories.get("insult", 0.0) >= 0.5:
            indicators.append("insult")
            reason_codes.append("INSULT_INDICATOR")

        if "threat" in agg_categories or tox_categories.get("threat", 0.0) >= 0.5:
            indicators.append("threat")
            reason_codes.append("THREAT_INDICATOR")

        if tox_categories.get("severe_toxicity", 0.0) >= 0.5:
            indicators.append("severe_toxicity")
            reason_codes.append("SEVERE_TOXICITY_INDICATOR")

        if "demeaning" in agg_categories:
            indicators.append("demeaning_language")
            reason_codes.append("DEMEANING_LANGUAGE")

        if is_personally_targeted:
            indicators.append("personal_targeting")
            reason_codes.append("PERSONAL_TARGETING_DETECTED")

        # 2. Check for content critique vs personal attack
        if aggression.get("needs_review") and not is_personally_targeted:
            reason_codes.append("CONTENT_CRITIQUE_NOT_PERSONAL")

        # 3. Operational Classification Decision
        classification = "not_cyberbullying"
        cb_type = "none"
        severity = 0.0
        confidence = 0.85
        needs_review = False

        # Case A: Clear Cyberbullying (Personal targeting + high harmful behavior/threat/severe insult)
        if is_personally_targeted and ("threat" in indicators or "severe_toxicity" in indicators):
            classification = "cyberbullying"
            cb_type = "harassment" if "threat" not in indicators else "threat"
            severity = float(min(10.0, 7.0 + aggression_score * 0.3))
            confidence = 0.80
            needs_review = True  # High severity always flagged for researcher confirmation
            evidence.append("Contains direct personal targeting combined with threatening or severely toxic language.")

        elif is_personally_targeted and (aggression_level in ["moderate", "severe"] or "insult" in indicators):
            classification = "cyberbullying"
            cb_type = "denigration" if "demeaning_language" in indicators else "harassment"
            severity = float(min(8.0, 5.0 + aggression_score * 0.3))
            confidence = 0.75
            needs_review = False
            evidence.append("Contains direct personal insult or denigration targeting an individual.")

        # Case A.2: Targeted Roman Urdu Cyber Abuse (Personal targeting + Roman Urdu abuse probability >= 0.50)
        elif is_personally_targeted and (roman_urdu_is_abusive or roman_urdu_prob >= 0.50):
            classification = "cyberbullying"
            cb_type = "harassment"
            severity = float(min(8.5, 5.0 + roman_urdu_prob * 3.0))
            confidence = round(max(confidence, roman_urdu.get("confidence", 0.85)), 2)
            needs_review = False
            terms_str = f" (terms: {', '.join(roman_urdu_terms)})" if roman_urdu_terms else ""
            evidence.append(f"Targeted Roman Urdu cyber abuse detected with {roman_urdu_prob * 100:.1f}% confidence{terms_str}.")

        # Case B: Ambiguous / Borderline cases (e.g. general hostile words, isolated insult without clear targeting)
        elif (is_toxic or roman_urdu_is_abusive) and not is_personally_targeted and (aggression_level != "none" or roman_urdu_prob >= 0.65):
            classification = "needs_review"
            cb_type = "flaming"
            severity = float(min(5.5, 3.0 + max(toxicity_score, roman_urdu_prob) * 2.0))
            confidence = 0.70
            needs_review = True
            reason_codes.append("AMBIGUOUS_CASE")
            reason_codes.append("REQUIRES_HUMAN_REVIEW")
            evidence.append("Hostile Roman Urdu or abusive language present without unambiguous personal targeting. Human review required to determine if targeted.")

        elif aggression.get("needs_review") or (is_toxic and not is_personally_targeted):
            classification = "insufficient_evidence"
            cb_type = "none"
            severity = 0.0
            confidence = 0.50
            needs_review = True
            reason_codes.append("INSUFFICIENT_CONTEXT")
            reason_codes.append("REQUIRES_HUMAN_REVIEW")
            evidence.append("Insufficient evidence to establish cyberbullying criteria; review needed.")

        # Case C: Not Cyberbullying (Negative critique, neutral, or non-targeted discourse)
        else:
            classification = "not_cyberbullying"
            cb_type = "none"
            severity = 0.0
            confidence = 0.90
            needs_review = False
            if sentiment_label == "negative":
                reason_codes.append("NEGATIVE_SENTIMENT_WITHOUT_ABUSE")
                evidence.append("Negative sentiment expressed toward content or ideas without personal targeting or abuse.")
            else:
                evidence.append("No personal targeting, threats, or severe abuse indicators detected.")

        return {
            "classification": classification,
            "is_cyberbullying": classification == "cyberbullying",
            "type": cb_type,
            "severity": severity,
            "score": round(severity / 10.0, 4) if severity > 0 else 0.0,
            "confidence": confidence,
            "evidence": evidence,
            "indicators": indicators,
            "reason_codes": reason_codes,
            "needs_review": needs_review,
            "method": self.method_name,
            "limitations": self.limitations
        }
