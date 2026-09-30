"""
Aggression Analysis Service - PHASE 3 IMPLEMENTATION (Upgraded with Trained ML Classifier)

Implements the research-oriented Aggression Lexicon Model framework
(Xu et al., 2020; Research Operational Coding Guidelines) combined with
a calibrated subword + word TF-IDF classifier trained on:
- 3. Aggressive_All (1).csv (118,828 aggressive comments)
- cyberbullying_dataset_1000-selected-columns (1).csv (1,000 balanced samples)
- roman_urdu_cyber_abuse_dataset.csv (5,004 balanced Roman Urdu samples)

Operational Principles:
1. Aggression ≠ Sentiment: Negative emotional tone or disagreement does not
   equal aggression.
2. Aggression ≠ Cyberbullying: Aggressive words alone do not constitute cyberbullying
   without targeted harassment, repetition, or power imbalance.
3. Critique of Ideas ≠ Attack on Persons: Strong critique of video content, arguments,
   or ideas is classified as None/Mild; personal targeting of individuals is Moderate/Severe.
4. Scale: 0-10 research-aligned scale:
   - 0-2: None / Minimal
   - 3-4: Mild
   - 5-7: Moderate
   - 8-10: Severe
"""

import json
import logging
import os
import re
import joblib
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "resources", "models", "aggression_classifier.joblib"
)

# Default fallback terms in case external resource file is missing
DEFAULT_LEXICON = {
    "categories": {
        "hostile": {
            "terms": [
                "stupid", "idiot", "fool", "moron", "dumb", "jerk", "asshole",
                "bastard", "bitch", "loser", "pathetic", "clown", "garbage", "trash",
                "bakwas", "bakwaas", "faltu", "faaltu", "pagal", "paagal", "badtameez",
                "jhoot", "jhoota", "chirkut", "kameena", "jahil", "lanat", "zaleel",
                "ghatiya", "kutte", "kutta", "harami"
            ]
        },
        "insult": {
            "terms": [
                "ugly", "disgusting", "worthless", "useless", "retard", "scum",
                "pig", "freak", "nasty", "creep",
                "ganda", "manhoos", "besharam", "kamina", "ullu", "gadha", "nalayak", "dallal"
            ]
        },
        "threat": {
            "terms": [
                "kill", "destroy", "hurt", "attack", "die", "murder", "beat",
                "punch", "shoot", "choke", "strangle", "slit", "burn", "torture",
                "maro", "maroonga", "marunga", "peetoonga", "jaan se mar", "thappad",
                "hath tor", "chup kar", "tujhe dekh loonga"
            ]
        },
        "demeaning": {
            "terms": [
                "shame", "embarrass", "humiliate", "laughable", "disgrace",
                "unwanted", "nobody likes you", "disappear",
                "sharam nahi aati", "sharam kar", "kuch nahi ata", "auqat", "time waste",
                "dimagh kharab", "dimag kharab", "waqt zaya", "kisi kaam ka nahi"
            ]
        }
    },
    "targeting_pronouns": [
        "you", "your", "you're", "youre", "yourself", "u", "ur", "he", "she", "they",
        "tu", "tum", "tera", "teri", "tere", "tujhe", "tujhko", "tumhara", "tumhari",
        "tumhare", "apne aap", "apne aap ko", "tume", "apko", "aap"
    ],
    "critique_markers": [
        "i think", "i believe", "in my opinion", "i disagree", "the idea",
        "the video", "the content", "the presentation", "the argument",
        "the topic", "the speaker", "this video", "this clip", "this argument",
        "meri raye", "mera khayal", "mujhe lagta", "yeh video", "ye video",
        "yeh clip", "ye clip", "video theek nahi"
    ]
}


class AggressionAnalyzer:
    """
    Hybrid Aggression Analyzer based on the Aggression Lexicon Model framework
    and trained subword TF-IDF calibrated classifier.
    Operates deterministically and reliably.
    """

    def __init__(self, lexicon_path: Optional[str] = None, model_path: Optional[str] = None):
        """
        Initialize the analyzer and load the lexicon configuration and trained model.
        """
        self.method_name = "Aggression Lexicon Model (Xu et al., 2020) & Calibrated Subword ML Classifier"
        self._loaded = False
        self.lexicon_path = lexicon_path or os.path.join(
            os.path.dirname(__file__), "..", "resources", "aggression", "lexicon_config.json"
        )
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.model = None
        self.categories: Dict[str, List[str]] = {}
        self.targeting_pronouns: List[str] = []
        self.critique_markers: List[str] = []
        self._compiled_patterns: Dict[str, List[Tuple[str, re.Pattern]]] = {}

        self.load()

    def load(self) -> bool:
        """
        Load lexicon terms and serialized trained ML classifier.
        """
        try:
            # 1. Load Lexicon configuration
            if os.path.exists(self.lexicon_path):
                with open(self.lexicon_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                raw_cats = data.get("categories", {})
                self.categories = {
                    cat: raw_cats[cat].get("terms", []) for cat in raw_cats
                }
                self.targeting_pronouns = data.get("targeting_pronouns", DEFAULT_LEXICON["targeting_pronouns"])
                self.critique_markers = data.get("critique_markers", DEFAULT_LEXICON["critique_markers"])
                logger.info(f"Loaded aggression lexicon from {self.lexicon_path}")
            else:
                logger.warning(f"Lexicon file not found at {self.lexicon_path}. Using built-in fallback lexicon.")
                raw_cats = DEFAULT_LEXICON["categories"]
                self.categories = {cat: raw_cats[cat]["terms"] for cat in raw_cats}
                self.targeting_pronouns = DEFAULT_LEXICON["targeting_pronouns"]
                self.critique_markers = DEFAULT_LEXICON["critique_markers"]

            # Precompile regular expressions with word boundary checks
            self._compiled_patterns = {}
            for cat, terms in self.categories.items():
                self._compiled_patterns[cat] = [
                    (term, re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE))
                    for term in terms
                ]

            # 2. Load trained Machine Learning classifier
            if os.path.exists(self.model_path):
                logger.info(f"Loading trained Aggression model from {self.model_path}...")
                self.model = joblib.load(self.model_path)
                logger.info("✅ Aggression ML classifier loaded successfully")
            else:
                logger.warning(f"⚠️ Aggression ML model not found at {self.model_path}. Will use lexicon fallback.")
                self.model = None

            self._loaded = True
            logger.info("✅ AggressionAnalyzer loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to load AggressionAnalyzer: {str(e)}", exc_info=True)
            self._loaded = False
            return False

    @property
    def is_loaded(self) -> bool:
        """Check if analyzer is loaded and ready."""
        return self._loaded

    def analyze(self, text: str) -> Dict:
        """
        Analyze text for aggression indicators, personal targeting, and empirical probability.

        Args:
            text: Input string (not modified)

        Returns:
            Dict containing score, level, matched_indicators, categories, evidence, method, needs_review, ml_probability
        """
        if not self.is_loaded:
            raise RuntimeError("Aggression analyzer is not loaded. Call load() first.")

        if text is None or not text.strip():
            raise ValueError("Input text cannot be empty")

        # Conservative normalization for analysis only
        clean_t = " ".join(text.strip().split())
        lower_text = clean_t.lower()

        evidence = []
        matched_indicators = set()
        matched_categories = set()

        threat_count = 0
        insult_count = 0
        hostile_count = 0
        demeaning_count = 0

        # Scan for terms across categories with exact span offset reporting
        for cat, patterns in self._compiled_patterns.items():
            for term, pattern in patterns:
                for match in pattern.finditer(text):
                    start, end = match.span()
                    evidence.append({
                        "term": match.group(),
                        "category": cat,
                        "position": {"start": start, "end": end}
                    })
                    matched_indicators.add(term)
                    matched_categories.add(cat)

                    if cat == "threat":
                        threat_count += 1
                    elif cat == "insult":
                        insult_count += 1
                    elif cat == "hostile":
                        hostile_count += 1
                    elif cat == "demeaning":
                        demeaning_count += 1

        # Check for personal targeting
        personal_targeting = False
        targeting_terms = (
            self.categories.get("hostile", []) +
            self.categories.get("insult", []) +
            self.categories.get("demeaning", [])
        )
        targeting_regex = re.compile(
            r"\b(you\s+are|you're|youre|u\s+are|u're|he\s+is|he's|she\s+is|she's|they\s+are|they're|tu\s+hai|tu\s+hy|tu\s+hey|tum\s+ho|tum\s+hy|tera|teri|tere|tujhe|tumhara|tumhari|apne\s+aap)\b\s+(?:\w+\s+){0,3}(?:"
            + "|".join(re.escape(t) for t in targeting_terms)
            + r")\b",
            re.IGNORECASE
        )
        if targeting_regex.search(clean_t):
            personal_targeting = True

        # 3. Machine Learning Inference (if model loaded)
        ml_prob = 0.0
        ml_is_aggressive = False
        if self.model is not None:
            try:
                proba = self.model.predict_proba([clean_t])[0]
                ml_prob = float(proba[1])
                ml_is_aggressive = ml_prob >= 0.50
            except Exception as e:
                logger.warning(f"Aggression ML inference error: {e}")

        direct_second_person = bool(re.search(
            r"\b(you|your|you're|youre|u|ur|tu|tum|tera|teri|tere|tujhe|tujhko|tumhara|tumhari|tumhare|apne\s+aap)\b",
            lower_text
        ))
        if direct_second_person and (
            threat_count > 0 or insult_count > 0 or hostile_count > 0 or demeaning_count > 0
            or personal_targeting or (self.model and ml_prob >= 0.70)
        ):
            personal_targeting = True

        # Check for critique of idea / content
        is_critique = False
        for marker in self.critique_markers:
            if marker in lower_text:
                is_critique = True
                break

        total_indicators = len(evidence)

        # Operational scoring combining Research Guidelines and Trained ML probabilities (0-10 scale)
        if threat_count > 0:
            level = "severe"
            score = float(min(10, 7 + threat_count))
            needs_review = True
        elif personal_targeting and (insult_count > 0 or hostile_count > 0):
            level = "severe" if (insult_count >= 2 or hostile_count >= 2 or ml_prob >= 0.90) else "moderate"
            score = float(min(9, max(5 + insult_count + hostile_count, round(ml_prob * 9.0, 1) if ml_prob > 0.6 else 5.0)))
            needs_review = False
        elif is_critique and not personal_targeting:
            # Operational rule: Disagreement or harsh content critique is None/Mild, never moderate/severe
            if total_indicators > 1:
                level = "mild"
                score = 4.0
                needs_review = True
            elif total_indicators == 1:
                level = "mild"
                score = 3.0
                needs_review = True
            else:
                level = "none"
                score = 0.0
                needs_review = False
        elif insult_count > 1 or hostile_count > 1 or demeaning_count > 1:
            level = "moderate"
            score = float(min(7, 4 + total_indicators))
            needs_review = False
        elif total_indicators == 1:
            level = "mild"
            score = 3.0
            needs_review = False
        elif ml_is_aggressive:
            # ML detected aggression from the combined 120k + Roman Urdu datasets
            if ml_prob >= 0.90:
                level = "severe" if personal_targeting else "moderate"
                score = float(round(min(8.0, 5.0 + ml_prob * 3.0), 1))
            elif ml_prob >= 0.70:
                level = "moderate"
                score = float(round(min(6.5, 4.0 + ml_prob * 2.5), 1))
            else:
                level = "mild"
                score = float(round(min(4.5, 3.0 + ml_prob * 2.0), 1))
            needs_review = False
        else:
            level = "none"
            score = 0.0
            needs_review = False

        # If critique markers are present along with hostile language, flag for human verification
        if is_critique and level != "none":
            needs_review = True

        engineering_normalized_score = round(score / 10.0, 4)

        return {
            "score": score,
            "engineering_normalized_score": engineering_normalized_score,
            "level": level,
            "is_aggressive": level in ["moderate", "severe"],
            "is_personally_targeted": personal_targeting,
            "matched_indicators": sorted(list(matched_indicators)),
            "categories": sorted(list(matched_categories)),
            "evidence": evidence,
            "method": self.method_name,
            "needs_review": needs_review,
            "ml_probability": round(ml_prob, 4) if self.model else None
        }
