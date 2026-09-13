"""
Aggression Analysis Service - PHASE 3 IMPLEMENTATION

Implements the research-oriented Aggression Lexicon Model framework
(Xu et al., 2020; Research Operational Coding Guidelines).

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
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Default fallback terms in case external resource file is missing
DEFAULT_LEXICON = {
    "categories": {
        "hostile": {
            "terms": [
                "stupid", "idiot", "fool", "moron", "dumb", "jerk", "asshole",
                "bastard", "bitch", "loser", "pathetic", "clown", "garbage", "trash"
            ]
        },
        "insult": {
            "terms": [
                "ugly", "disgusting", "worthless", "useless", "retard", "scum",
                "pig", "freak", "nasty", "creep"
            ]
        },
        "threat": {
            "terms": [
                "kill", "destroy", "hurt", "attack", "die", "murder", "beat",
                "punch", "shoot", "choke", "strangle", "slit", "burn", "torture"
            ]
        },
        "demeaning": {
            "terms": [
                "shame", "embarrass", "humiliate", "laughable", "disgrace",
                "unwanted", "nobody likes you", "disappear"
            ]
        }
    },
    "targeting_pronouns": [
        "you", "your", "you're", "youre", "yourself", "u", "ur", "he", "she", "they"
    ],
    "critique_markers": [
        "i think", "i believe", "in my opinion", "i disagree", "the idea",
        "the video", "the content", "the presentation", "the argument",
        "the topic", "the speaker", "this video", "this clip", "this argument"
    ]
}


class AggressionAnalyzer:
    """
    Aggression Analyzer based on the Aggression Lexicon Model framework.
    Loads once on startup and operates deterministically.
    """

    def __init__(self, lexicon_path: Optional[str] = None):
        """
        Initialize the analyzer and load the lexicon configuration.
        """
        self.method_name = "Aggression Lexicon Model (Xu et al., 2020) - Research Operational Framework"
        self._loaded = False
        self.lexicon_path = lexicon_path or os.path.join(
            os.path.dirname(__file__), "..", "resources", "aggression", "lexicon_config.json"
        )
        self.categories: Dict[str, List[str]] = {}
        self.targeting_pronouns: List[str] = []
        self.critique_markers: List[str] = []
        self._compiled_patterns: Dict[str, List[Tuple[str, re.Pattern]]] = {}

        self.load()

    def load(self) -> bool:
        """
        Load lexicon terms from configuration file or fallback data.
        """
        try:
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
        Analyze text for aggression indicators and personal targeting.

        Args:
            text: Input string (not modified)

        Returns:
            Dict containing score, level, matched_indicators, categories, evidence, method, needs_review
        """
        if not self.is_loaded:
            raise RuntimeError("Aggression analyzer is not loaded. Call load() first.")

        if text is None or not text.strip():
            raise ValueError("Input text cannot be empty")

        # Conservative normalization for analysis only; original text remains untouched
        lower_text = text.lower()

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

        # Check for personal targeting (e.g. "you are idiot", "you're stupid", "tu pagal hai", "tera content bakwas")
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
        if targeting_regex.search(text):
            personal_targeting = True

        # Direct second-person address in English and Roman Urdu combined with abusive terms
        direct_second_person = bool(re.search(
            r"\b(you|your|u|ur|tu|tum|tera|teri|tere|tujhe|tujhko|tumhara|tumhari|tumhare|apne\s+aap)\b",
            lower_text
        ))
        if direct_second_person and (threat_count > 0 or insult_count > 0 or hostile_count > 0 or personal_targeting):
            personal_targeting = True

        # Check for critique of idea / content
        is_critique = False
        for marker in self.critique_markers:
            if marker in lower_text:
                is_critique = True
                break

        total_indicators = len(evidence)

        # Operational scoring based on research coding methodology (0-10 scale)
        if threat_count > 0:
            level = "severe"
            score = float(min(10, 7 + threat_count))
            needs_review = True
        elif personal_targeting and (insult_count > 0 or hostile_count > 0):
            level = "severe" if (insult_count >= 2 or hostile_count >= 2) else "moderate"
            score = float(min(9, 5 + insult_count + hostile_count))
            needs_review = False
        elif insult_count > 1 or hostile_count > 1 or demeaning_count > 1:
            level = "moderate"
            score = float(min(7, 4 + total_indicators))
            needs_review = False
        elif total_indicators == 1:
            if is_critique:
                # Content critique with harsh word (e.g., "what a dumb video") -> Mild
                level = "mild"
                score = 3.0
                needs_review = False
            else:
                level = "mild"
                score = 3.0
                needs_review = False
        elif total_indicators > 1 and is_critique and not personal_targeting:
            level = "mild"
            score = 4.0
            needs_review = True
        else:
            level = "none"
            score = 0.0
            needs_review = False

        # If critique markers are present along with hostile language, flag for human verification
        if is_critique and level != "none":
            needs_review = True

        # Engineering normalized score (0.0 to 1.0)
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
            "needs_review": needs_review
        }
