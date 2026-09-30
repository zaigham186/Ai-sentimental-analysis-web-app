"""
Cyberbullying Classification Service - PHASE 3 IMPLEMENTATION (Upgraded with Trained ML Classifier)

Implements the research project's operational definition of cyberbullying,
harmonized with a calibrated classifier trained on:
- cyberbullying_dataset_1000-selected-columns (1).csv (1,000 balanced samples)
- roman_urdu_cyber_abuse_dataset.csv (5,004 balanced Roman Urdu samples)
- 3. Aggressive_All (1).csv (targeted harassment samples)

Cyberbullying Types Detected:
1. Harassment   - Repeated insulting, mean, or abusive comments directly to a person
2. Flaming      - Angry, foul-language, or aggressive insults in public to spark a fight
3. Denigration  - Spreading cruel rumors, lies, or negative remarks to ruin reputation
4. Trolling     - Intentionally provocative or upsetting comments to anger others
5. Outing       - Posting private messages or secrets publicly without permission

CRITICAL RESEARCH RULES:
1. Negative Sentiment ≠ Cyberbullying
2. Toxicity ≠ Cyberbullying
3. Aggression ≠ Cyberbullying
4. Cyberbullying requires Personal Targeting + Harmful Intent
5. Ambiguous cases must be flagged with needs_review
6. AI provides suggestions only; human research review is required.
"""

import logging
import os
import re
import joblib
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "resources", "models", "cyberbullying_classifier.joblib"
)


class CyberbullyingAnalyzer:
    """
    Multi-dimensional Cyberbullying Analyzer based on research operational criteria
    and trained empirical ML classification.
    Detects 5 specific cyberbullying types:
    harassment, flaming, denigration, trolling, outing
    """

    def __init__(self, model_path: Optional[str] = None):
        self.method_name = "Research Operational Definition & Calibrated Subword ML Classifier (Multi-dimensional v3.0)"
        self.limitations = [
            "Model confidence is not empirical research accuracy.",
            "Single-text analysis cannot definitively verify longitudinal repetition or power imbalance.",
            "Human researcher review is strictly required for official coding.",
            "Colloquial dialect and Roman Urdu nuances require empirical validation against human ground-truth."
        ]
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.model = None
        self._loaded = False

        # ─── Type-specific keyword patterns ───────────────────────────────────

        # 1. HARASSMENT — repeated/direct abusive comments targeting a person
        self.harassment_patterns = [
            r'\b(you are|you\'re|ur|tum|aap)\s+(stupid|idiot|fool|loser|pathetic|worthless|ugly|disgusting|trash|garbage|waste)\b',
            r'\b(get lost|go away|nobody likes you|everyone hates you|you don\'t deserve)\b',
            r'\b(keep attacking|stop harassing|leave me alone|stop bullying)\b',
            r'\b(har roz|baar baar|repeatedly|again and again)\b.*\b(insult|abuse|bura|gali)\b',
        ]

        # 2. FLAMING — angry public insults to provoke a fight
        self.flaming_patterns = [
            r'\b(fight me|come at me|bring it on|shut up|shut your mouth|zip it)\b',
            r'\b(f+u+c+k|s+h+i+t|b+i+t+c+h|a+s+s+h+o+l+e|damn you|screw you)\b',
            r'\b(you wanna go|lets fight|i\'ll destroy you|take that back)\b',
            r'\b(angry|furious|mad at you|pissed off)\b.*\b(you|ur|tum)\b',
            r'\b(gali|gaaliyan|beizzat|besharam|badtameez)\b',
        ]

        # 3. DENIGRATION — rumors/lies to damage reputation
        self.denigration_patterns = [
            r'\b(everyone knows|people say|i heard|rumor|spreading|telling everyone)\b.*\b(bad|wrong|lie|fake|cheat)\b',
            r'\b(she is|he is|they are)\s+(a liar|fake|fraud|cheat|characterless|buri|bura)\b',
            r'\b(don\'t trust|stay away from|warn everyone|expose)\b.*\b(him|her|them|us|this person)\b',
            r'\b(reputation|izzat|character)\b.*\b(ruin|destroy|kharab|barbad)\b',
            r'\b(jhoothi?|makkar|dhokhebaaz|fraud|faker)\b',
        ]

        # 4. TROLLING — provocative comments to upset/anger others
        self.trolling_patterns = [
            r'\b(triggered|mad now|got you|rekt|owned|ratio|cope|seethe|stay mad)\b',
            r'\b(lol|lmao|haha|hehe)\b.*\b(cry|mad|upset|butthurt|loser)\b',
            r'\b(just trolling|it\'s a joke|can\'t take a joke|so sensitive)\b',
            r'\b(nobody asked|who cares|don\'t care|irrelevant|pointless)\b.*\b(you|ur|opinion)\b',
            r'\b(bait|baiting|trolling|provok)\b',
        ]

        # 5. OUTING — sharing private info/secrets publicly
        self.outing_patterns = [
            r'\b(i\'ll share|i\'m sharing|posting|exposing|leaking)\b.*\b(private|secret|personal|photo|message|chat)\b',
            r'\b(everyone will know|i\'ll tell|telling everyone)\b.*\b(secret|private|personal)\b',
            r'\b(screenshot|ss|proof|evidence)\b.*\b(share|post|leak|expose)\b',
            r'\b(private message|dm|inbox|personal info)\b.*\b(public|share|post|expose)\b',
            r'\b(raz|secret|raaz)\b.*\b(batana|share|bata doon|expose)\b',
        ]

        self.load()

    def load(self) -> bool:
        """Load trained ML cyberbullying model"""
        try:
            if os.path.exists(self.model_path):
                logger.info(f"Loading trained Cyberbullying model from {self.model_path}...")
                self.model = joblib.load(self.model_path)
                logger.info("✅ Cyberbullying ML classifier loaded successfully")
            else:
                logger.warning(f"⚠️ Cyberbullying model file not found at {self.model_path}. Will use rule-based fallback.")
                self.model = None

            self._loaded = True
            return True
        except Exception as e:
            logger.error(f"Failed to load Cyberbullying model: {str(e)}", exc_info=True)
            self._loaded = False
            return False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ──────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _match_patterns(self, text: str, patterns: List[str]) -> List[str]:
        """Return list of matched pattern snippets (lowercased text)."""
        text_lower = text.lower()
        matches = []
        for pattern in patterns:
            if re.search(pattern, text_lower):
                matches.append(pattern)
        return matches

    def _detect_cb_type(self, text: str) -> Dict:
        """
        Detect which of the 5 cyberbullying types are present.
        Returns dict with type scores and top type.
        """
        harassment_matches = self._match_patterns(text, self.harassment_patterns)
        flaming_matches    = self._match_patterns(text, self.flaming_patterns)
        denigration_matches= self._match_patterns(text, self.denigration_patterns)
        trolling_matches   = self._match_patterns(text, self.trolling_patterns)
        outing_matches     = self._match_patterns(text, self.outing_patterns)

        scores = {
            "harassment":  len(harassment_matches),
            "flaming":     len(flaming_matches),
            "denigration": len(denigration_matches),
            "trolling":    len(trolling_matches),
            "outing":      len(outing_matches),
        }

        matched_types = [t for t, s in scores.items() if s > 0]
        top_type = max(scores, key=scores.get) if any(scores.values()) else "none"

        return {
            "scores": scores,
            "matched_types": matched_types,
            "top_type": top_type if (top_type != "none" and scores.get(top_type, 0) > 0) else "none",
            "total_matches": sum(scores.values())
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Main analysis
    # ──────────────────────────────────────────────────────────────────────────

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
        Evaluate cyberbullying presence using operational criteria augmented by trained ML classifier.
        Detects and labels one of 5 specific cyberbullying types:
        harassment, flaming, denigration, trolling, outing
        """
        if text is None or not text.strip():
            raise ValueError("Input text cannot be empty")

        clean_t = " ".join(text.strip().split())

        reason_codes = []
        indicators   = []
        evidence     = []

        # ── Extract features ──────────────────────────────────────────────────
        sentiment_label      = sentiment.get("label", "neutral")
        is_toxic             = toxicity.get("is_toxic", False)
        toxicity_score       = toxicity.get("overall_score", 0.0)
        tox_categories       = toxicity.get("categories", {})

        aggression_score     = aggression.get("score", 0.0)
        aggression_level     = aggression.get("level", "none")
        is_personally_targeted = aggression.get("is_personally_targeted", False)
        agg_categories       = aggression.get("categories", [])
        matched_indicators   = aggression.get("matched_indicators", [])

        roman_urdu_is_abusive = bool(roman_urdu and roman_urdu.get("is_abusive", False))
        roman_urdu_prob       = float(roman_urdu.get("abuse_probability", 0.0)) if roman_urdu else 0.0
        roman_urdu_terms      = roman_urdu.get("detected_terms", []) if roman_urdu else []

        # ── ML Cyberbullying inference ────────────────────────────────────────
        cb_ml_prob = 0.0
        cb_ml_is_bullying = False
        if self.model is not None:
            try:
                proba = self.model.predict_proba([clean_t])[0]
                cb_ml_prob = float(proba[1])
                cb_ml_is_bullying = cb_ml_prob >= 0.50
            except Exception as e:
                logger.warning(f"Cyberbullying ML inference error: {e}")

        # ── Detect cyberbullying type from text patterns ───────────────────────
        type_detection = self._detect_cb_type(text)
        detected_types = type_detection["matched_types"]
        top_type       = type_detection["top_type"]
        type_scores    = type_detection["scores"]

        # ── Build indicators ──────────────────────────────────────────────────
        if cb_ml_is_bullying:
            indicators.append("ml_cyberbullying_indicator")
            reason_codes.append("ML_CYBERBULLYING_DETECTED")

        if roman_urdu_is_abusive or roman_urdu_prob >= 0.50:
            indicators.append("roman_urdu_abuse")
            reason_codes.append("ROMAN_URDU_ABUSE_DETECTED")
            if is_personally_targeted:
                reason_codes.append("ROMAN_URDU_PERSONAL_TARGETING")

        if not matched_indicators and not roman_urdu_is_abusive and not cb_ml_is_bullying:
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

        has_second_person = bool(re.search(
            r"\b(you|your|you're|youre|yourself|u|ur|tu|tum|tera|teri|tere|tujhe|tumhara|tumhari|aap|apka|apko)\b",
            clean_t.lower()
        ))
        if has_second_person and (is_personally_targeted or cb_ml_prob >= 0.70 or (aggression_level in ["moderate", "severe"])):
            is_personally_targeted = True

        if is_personally_targeted:
            indicators.append("personal_targeting")
            reason_codes.append("PERSONAL_TARGETING_DETECTED")

        # Add detected type indicators
        for t in detected_types:
            indicators.append(f"cb_type_{t}")
            reason_codes.append(f"CB_TYPE_{t.upper()}_DETECTED")

        if aggression.get("needs_review") and not is_personally_targeted:
            reason_codes.append("CONTENT_CRITIQUE_NOT_PERSONAL")

        # ── Classification Decision ───────────────────────────────────────────
        classification = "not_cyberbullying"
        cb_type        = "none"
        severity       = 0.0
        confidence     = 0.85
        needs_review   = False

        # ── Case A: Clear Cyberbullying (threat + personal targeting) ─────────
        if is_personally_targeted and ("threat" in indicators or "severe_toxicity" in indicators):
            classification = "cyberbullying"
            cb_type        = "threat" if "threat" in indicators else (top_type if top_type != "none" else "harassment")
            severity       = float(min(10.0, 7.0 + aggression_score * 0.3))
            confidence     = 0.85
            needs_review   = True
            evidence.append(
                f"Contains direct personal targeting combined with threatening or severely toxic language. "
                f"Detected type: {cb_type}."
            )

        # ── Case A.1: Personal targeting + insult / denigration ─────────────────
        elif is_personally_targeted and (aggression_level in ["moderate", "severe"] or "insult" in indicators or cb_ml_prob >= 0.80):
            classification = "cyberbullying"
            cb_type        = top_type if top_type != "none" else (
                "denigration" if "demeaning_language" in indicators else "harassment"
            )
            severity       = float(min(8.5, max(5.0 + aggression_score * 0.3, cb_ml_prob * 8.0)))
            confidence     = max(0.80, round(cb_ml_prob, 2) if self.model else 0.75)
            needs_review   = False
            evidence.append(
                f"Contains direct personal insult or denigration targeting an individual. "
                f"Detected type: {cb_type}."
            )

        # ── Case A.2: Roman Urdu cyber abuse + personal targeting ─────────────
        elif is_personally_targeted and (roman_urdu_is_abusive or roman_urdu_prob >= 0.50):
            classification = "cyberbullying"
            cb_type        = top_type if top_type != "none" else "harassment"
            severity       = float(min(8.5, 5.0 + roman_urdu_prob * 3.0))
            confidence     = round(max(confidence, roman_urdu.get("confidence", 0.85)), 2)
            needs_review   = False
            terms_str      = f" (terms: {', '.join(roman_urdu_terms)})" if roman_urdu_terms else ""
            evidence.append(
                f"Targeted Roman Urdu cyber abuse detected with {roman_urdu_prob * 100:.1f}% "
                f"confidence{terms_str}. Detected type: {cb_type}."
            )

        # ── Case A.3: Strong type pattern detected even without explicit targeting
        elif type_detection["total_matches"] >= 2 and (is_toxic or aggression_level != "none" or cb_ml_is_bullying):
            classification = "cyberbullying"
            cb_type        = top_type
            severity       = float(min(7.0, 4.0 + type_detection["total_matches"] * 0.5))
            confidence     = 0.75
            needs_review   = True
            reason_codes.append("PATTERN_BASED_DETECTION")
            evidence.append(
                f"Multiple cyberbullying pattern indicators detected ({', '.join(detected_types)}). "
                f"Primary type: {cb_type}. Human review recommended."
            )

        # ── Case B: Outing detected (always serious regardless of targeting) ───
        elif type_scores.get("outing", 0) > 0:
            classification = "cyberbullying"
            cb_type        = "outing"
            severity       = 7.0
            confidence     = 0.75
            needs_review   = True
            reason_codes.append("OUTING_DETECTED")
            evidence.append(
                "Private information sharing or exposure detected. "
                "Outing is cyberbullying regardless of explicit personal targeting."
            )

        # ── Case C: Ambiguous / Borderline ────────────────────────────────────
        elif (is_toxic or roman_urdu_is_abusive or cb_ml_is_bullying) and not is_personally_targeted and (
            aggression_level != "none" or roman_urdu_prob >= 0.65 or cb_ml_prob >= 0.75
        ):
            classification = "needs_review"
            cb_type        = top_type if top_type != "none" else "flaming"
            severity       = float(min(5.5, 3.0 + max(toxicity_score, roman_urdu_prob, cb_ml_prob) * 2.0))
            confidence     = 0.70
            needs_review   = True
            reason_codes.append("AMBIGUOUS_CASE")
            reason_codes.append("REQUIRES_HUMAN_REVIEW")
            evidence.append(
                f"Hostile or abusive language present without unambiguous personal targeting. "
                f"Possible type: {cb_type}. Human review required."
            )

        elif aggression.get("needs_review") or (is_toxic and not is_personally_targeted):
            classification = "insufficient_evidence"
            cb_type        = "none"
            severity       = 0.0
            confidence     = 0.50
            needs_review   = True
            reason_codes.append("INSUFFICIENT_CONTEXT")
            reason_codes.append("REQUIRES_HUMAN_REVIEW")
            evidence.append("Insufficient evidence to establish cyberbullying criteria; review needed.")

        # ── Case D: Not Cyberbullying ──────────────────────────────────────────
        else:
            classification = "not_cyberbullying"
            cb_type        = "none"
            severity       = 0.0
            confidence     = 0.90
            needs_review   = False
            if sentiment_label == "negative":
                reason_codes.append("NEGATIVE_SENTIMENT_WITHOUT_ABUSE")
                evidence.append(
                    "Negative sentiment expressed toward content or ideas without "
                    "personal targeting or abuse."
                )
            else:
                evidence.append("No personal targeting, threats, or severe abuse indicators detected.")

        # ── Type descriptions for frontend display ────────────────────────────
        type_descriptions = {
            "harassment":  "Sending repeated insulting, mean, or abusive comments directly to a person.",
            "flaming":     "Posting angry, foul-language, or aggressive insults in public to spark an online fight.",
            "denigration": "Spreading cruel rumors, lies, or negative remarks to ruin someone's reputation.",
            "trolling":    "Leaving intentionally provocative or upsetting comments to anger others.",
            "outing":      "Posting private messages, embarrassing information, or secrets publicly without permission.",
            "none":        "No specific cyberbullying type detected."
        }

        return {
            "classification":    classification,
            "is_cyberbullying":  classification == "cyberbullying",
            "type":              cb_type,
            "type_description":  type_descriptions.get(cb_type, ""),
            "detected_types":    detected_types,
            "type_scores":       type_scores,
            "severity":          severity,
            "score":             round(severity / 10.0, 4) if severity > 0 else 0.0,
            "confidence":        confidence,
            "evidence":          evidence,
            "indicators":        indicators,
            "reason_codes":      reason_codes,
            "needs_review":      needs_review,
            "method":            self.method_name,
            "limitations":       self.limitations,
            "ml_probability":    round(cb_ml_prob, 4) if self.model else None
        }