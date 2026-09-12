"""
Unit tests for Research Validation, Metric Calculations & Calibration Pipeline
Phase 6: M.Phil Research NLP System
"""

import os
import sys
import json
import pytest
import tempfile
from pathlib import Path

# Add validation/scripts to sys.path
validation_scripts_dir = str(Path(__file__).resolve().parent.parent.parent / "validation" / "scripts")
if validation_scripts_dir not in sys.path:
    sys.path.insert(0, validation_scripts_dir)

from evaluate import (
    calculate_binary_metrics,
    calculate_multiclass_metrics,
    calibrate_thresholds,
    categorize_error,
    evaluate_dataset
)


def test_binary_metrics_calculation():
    """Verify binary accuracy, precision, recall, f1, and confusion matrix."""
    y_true = [True, True, False, False, True]
    y_pred = [True, False, False, False, True]

    metrics = calculate_binary_metrics(y_true, y_pred)
    assert metrics["accuracy"] == 0.8
    assert metrics["confusion_matrix"]["true_positive"] == 2
    assert metrics["confusion_matrix"]["false_negative"] == 1
    assert metrics["confusion_matrix"]["true_negative"] == 2
    assert metrics["confusion_matrix"]["false_positive"] == 0
    assert 0.0 <= metrics["cohen_kappa"] <= 1.0
    assert metrics["support"]["total"] == 5
    assert metrics["support"]["positive_cases"] == 3


def test_multiclass_metrics_calculation():
    """Verify multiclass accuracy, macro F1, and confusion matrix."""
    classes = ["positive", "neutral", "negative"]
    y_true = ["positive", "neutral", "negative", "negative", "positive"]
    y_pred = ["positive", "neutral", "neutral", "negative", "positive"]

    metrics = calculate_multiclass_metrics(y_true, y_pred, classes)
    assert metrics["accuracy"] == 0.8
    assert metrics["macro_f1"] > 0
    assert "positive" in metrics["per_class"]
    assert metrics["confusion_matrix"]["labels"] == classes
    assert len(metrics["confusion_matrix"]["matrix"]) == 3


def test_threshold_calibration():
    """Verify candidate threshold evaluation and optimal operating point selection."""
    y_true = [True, True, False, False]
    scores = [0.85, 0.45, 0.20, 0.10]
    candidate_thresholds = [0.30, 0.50, 0.70]

    result = calibrate_thresholds(y_true, scores, candidate_thresholds)
    assert "candidate_evaluations" in result
    assert len(result["candidate_evaluations"]) == 3
    assert result["optimal_threshold"] in candidate_thresholds
    assert result["best_f1"] >= 0.0


def test_error_categorization():
    """Verify error categorization rules."""
    # Case 1: Insult without cyberbullying
    text = "You are an idiot"
    human = {"sentiment": "negative", "toxicity": True, "aggression": "moderate", "cyberbullying": False}
    pred = {"cyberbullying": {"is_cyberbullying": True, "classification": "cyberbullying"}, "sentiment": {"label": "negative"}, "toxicity": {"is_toxic": True}}
    cat, explanation = categorize_error(text, human, pred)
    assert cat == "INSULT_WITHOUT_CYBERBULLYING"

    # Case 2: Content critique misclassified as cyberbullying
    text = "This presentation was completely flawed"
    human = {"sentiment": "negative", "toxicity": False, "aggression": "none", "cyberbullying": False}
    pred = {"cyberbullying": {"is_cyberbullying": True, "classification": "cyberbullying"}, "sentiment": {"label": "negative"}, "toxicity": {"is_toxic": False}}
    cat, explanation = categorize_error(text, human, pred)
    assert cat == "CONTENT_CRITIQUE_MISCLASSIFIED"

    # Case 3: Sarcasm
    text = "Wow you are really a genius"
    human = {"sentiment": "negative", "toxicity": False, "aggression": "mild", "cyberbullying": False}
    pred = {"cyberbullying": {"is_cyberbullying": False}, "sentiment": {"label": "positive"}, "toxicity": {"is_toxic": False}}
    cat, explanation = categorize_error(text, human, pred)
    assert cat == "SARCASM_AMBIGUITY"


def test_empty_dataset_handling():
    """Ensure zero-fabrication principle: empty dataset must report validation not available."""
    with tempfile.TemporaryDirectory() as tmpdir:
        dataset_path = os.path.join(tmpdir, "empty_dataset.json")
        with open(dataset_path, "w", encoding="utf-8") as f:
            json.dump({"items": []}, f)

        res = evaluate_dataset(
            dataset_path=dataset_path,
            output_dir=os.path.join(tmpdir, "results"),
            report_dir=os.path.join(tmpdir, "reports")
        )
        assert res["is_validated"] is False
        assert res["validation_status"] == "Not validated"
        assert res["sample_count"] == 0
        assert "HUMAN GOLD LABELS REQUIRED" in res["message"]


def test_offline_evaluation_with_precomputed_predictions():
    """Verify evaluation pipeline runs completely offline with precomputed predictions."""
    with tempfile.TemporaryDirectory() as tmpdir:
        dataset_path = os.path.join(tmpdir, "test_dataset.json")
        predictions_path = os.path.join(tmpdir, "test_predictions.json")

        sample_dataset = {
            "version": "1.0.0",
            "is_synthetic_benchmark": True,
            "items": [
                {
                    "id": "t-1",
                    "text": "I disagree with this argument",
                    "language": "english",
                    "human": {
                        "sentiment": "negative",
                        "toxicity": False,
                        "aggression": "none",
                        "cyberbullying": False
                    },
                    "secondary_human": {
                        "sentiment": "negative",
                        "toxicity": False,
                        "aggression": "none",
                        "cyberbullying": False
                    }
                },
                {
                    "id": "t-2",
                    "text": "I will hurt you",
                    "language": "english",
                    "human": {
                        "sentiment": "negative",
                        "toxicity": True,
                        "aggression": "severe",
                        "cyberbullying": True
                    },
                    "secondary_human": {
                        "sentiment": "negative",
                        "toxicity": True,
                        "aggression": "severe",
                        "cyberbullying": True
                    }
                }
            ]
        }

        sample_predictions = [
            {
                "id": "t-1",
                "prediction": {
                    "sentiment": {"label": "negative", "confidence": 0.9},
                    "toxicity": {"is_toxic": False, "overall_score": 0.05},
                    "aggression": {"level": "none", "score": 0.0},
                    "cyberbullying": {"is_cyberbullying": False, "score": 0.0}
                }
            },
            {
                "id": "t-2",
                "prediction": {
                    "sentiment": {"label": "negative", "confidence": 0.95},
                    "toxicity": {"is_toxic": True, "overall_score": 0.92},
                    "aggression": {"level": "severe", "score": 9.0},
                    "cyberbullying": {"is_cyberbullying": True, "score": 0.9}
                }
            }
        ]

        with open(dataset_path, "w", encoding="utf-8") as f:
            json.dump(sample_dataset, f)
        with open(predictions_path, "w", encoding="utf-8") as f:
            json.dump(sample_predictions, f)

        res = evaluate_dataset(
            dataset_path=dataset_path,
            predictions_path=predictions_path,
            output_dir=os.path.join(tmpdir, "results"),
            report_dir=os.path.join(tmpdir, "reports")
        )

        assert res["is_validated"] is True
        assert res["sample_count"] == 2
        assert res["summary"]["cyberbullying"]["accuracy"] == 1.0
        assert res["summary"]["sentiment"]["accuracy"] == 1.0
        assert os.path.exists(os.path.join(tmpdir, "results", "metrics.json"))
        assert os.path.exists(os.path.join(tmpdir, "results", "confusion_matrices.json"))
        assert os.path.exists(os.path.join(tmpdir, "results", "threshold_analysis.json"))
        assert os.path.exists(os.path.join(tmpdir, "results", "errors.json"))
        assert os.path.exists(os.path.join(tmpdir, "reports", "VALIDATION_REPORT.md"))
