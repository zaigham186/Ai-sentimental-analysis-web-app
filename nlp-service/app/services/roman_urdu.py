"""
Roman Urdu Cyber Abuse Analysis Service
Loads the calibrated classifier trained on the 5,004-sample dataset.
Provides fast (<1ms) inference and evidence extraction for Roman Urdu responses.
"""

import os
import logging
import joblib
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "resources", "models", "roman_urdu_classifier.joblib"
)

# Prominent abusive trigger terms for local highlight extraction
ROMAN_URDU_ABUSE_TRIGGERS = [
    "bakwas", "bakwaas", "faltu", "faaltu", "pagal", "paagal", "badtameez",
    "jhoot", "jhoota", "dimagh kharab", "dimag kharab", "sharam nahi", "sharam kar",
    "chirkut", "kameena", "kamina", "jahil", "lanat", "zaleel", "ghatiya",
    "kutte", "kutta", "harami", "besharam", "manhoos", "ullu", "gadha", "nalayak",
    "time waste", "waqt zaya", "auqat", "kuch nahi ata", "chup kar", "maroonga"
]


class RomanUrduClassifier:
    """
    Service for detecting cyber abuse and hostile language in Roman Urdu.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.model = None
        self.method_name = "Calibrated Subword TF-IDF Classifier (5,004 Empirical Roman Urdu Samples)"
        self.version = "1.0.0"
        self._loaded = False
        self.load()

    def load(self) -> bool:
        """Load trained model pipeline from joblib file"""
        try:
            if os.path.exists(self.model_path):
                logger.info(f"Loading Roman Urdu cyber abuse model from {self.model_path}...")
                self.model = joblib.load(self.model_path)
                self._loaded = True
                logger.info("✅ Roman Urdu model loaded successfully")
                return True
            else:
                logger.warning(f"⚠️ Roman Urdu model file not found at {self.model_path}")
                self._loaded = False
                return False
        except Exception as e:
            logger.error(f"❌ Failed to load Roman Urdu model: {str(e)}", exc_info=True)
            self._loaded = False
            return False

    @property
    def is_ready(self) -> bool:
        return self._loaded and self.model is not None

    def analyze(self, text: str) -> Dict:
        """
        Analyze Roman Urdu text for cyber abuse and hostile intent.

        Returns:
            Dict with is_abusive, probability, label, confidence, detected_terms, method
        """
        if not text or not text.strip():
            return {
                "is_abusive": False,
                "abuse_probability": 0.0,
                "label": "O",
                "confidence": 0.0,
                "detected_terms": [],
                "method": self.method_name,
                "is_ready": self.is_ready
            }

        cleaned_text = " ".join(text.strip().split())
        lower_text = cleaned_text.lower()

        # Find detected triggers in text
        detected_triggers = [
            term for term in ROMAN_URDU_ABUSE_TRIGGERS if term in lower_text
        ]

        if not self.is_ready:
            # Fallback heuristic if model file failed to load
            has_trigger = len(detected_triggers) > 0
            return {
                "is_abusive": has_trigger,
                "abuse_probability": 0.85 if has_trigger else 0.10,
                "label": "H" if has_trigger else "O",
                "confidence": 0.70 if has_trigger else 0.50,
                "detected_terms": detected_triggers,
                "method": "Roman Urdu Heuristic Fallback",
                "is_ready": False
            }

        try:
            # Predict probability: classes are [0: O, 1: H]
            proba = self.model.predict_proba([cleaned_text])[0]
            # Probability of abuse (class 1: H)
            abuse_prob = float(proba[1])
            is_abusive = abuse_prob >= 0.50
            label = "H" if is_abusive else "O"
            confidence = float(max(proba))

            return {
                "is_abusive": is_abusive,
                "abuse_probability": round(abuse_prob, 4),
                "label": label,
                "confidence": round(confidence, 4),
                "detected_terms": detected_triggers,
                "method": self.method_name,
                "is_ready": True
            }

        except Exception as e:
            logger.error(f"Error during Roman Urdu inference: {str(e)}", exc_info=True)
            has_trigger = len(detected_triggers) > 0
            return {
                "is_abusive": has_trigger,
                "abuse_probability": 0.75 if has_trigger else 0.15,
                "label": "H" if has_trigger else "O",
                "confidence": 0.60,
                "detected_terms": detected_triggers,
                "method": "Roman Urdu Error Fallback",
                "is_ready": False
            }
