#!/usr/bin/env python3
"""
Research Validation, Accuracy Evaluation & Threshold Calibration Engine
Phase 6: M.Phil Cyberbullying Research NLP System

CRITICAL RESEARCH RULES:
1. Negative Sentiment ≠ Toxicity ≠ Aggression ≠ Cyberbullying (separate constructs).
2. The Human Researcher is the scientific ground truth reference.
3. Model probabilities and confidence are NOT empirical research accuracy.
4. ZERO FABRICATION: If no human-labeled dataset exists, report
   'VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED'.
5. Cohen's kappa distinguishes:
   - Human-vs-Human inter-rater reliability (when 2 human coders exist)
   - Model-vs-Human diagnostic agreement metric
"""

import argparse
import datetime
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    cohen_kappa_score,
    confusion_matrix,
    precision_recall_fscore_support
)
import urllib.request
import urllib.error

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("research_evaluator")


def calculate_binary_metrics(y_true: List[bool], y_pred: List[bool]) -> Dict[str, Any]:
    """Calculate binary classification metrics including minority class focus."""
    if not y_true or not y_pred:
        return {"error": "Empty data"}

    y_t = [1 if v else 0 for v in y_true]
    y_p = [1 if v else 0 for v in y_pred]

    acc = float(accuracy_score(y_t, y_p))
    p, r, f1, _ = precision_recall_fscore_support(y_t, y_p, pos_label=1, average='binary', zero_division=0)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_t, y_p, average='macro', zero_division=0)
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(y_t, y_p, average='weighted', zero_division=0)

    try:
        kappa = float(cohen_kappa_score(y_t, y_p))
        if np.isnan(kappa):
            kappa = 0.0
    except Exception:
        kappa = 0.0

    cm = confusion_matrix(y_t, y_p, labels=[0, 1]).tolist()
    # cm is [[TN, FP], [FN, TP]]
    tn, fp = cm[0][0], cm[0][1]
    fn, tp = cm[1][0], cm[1][1]

    return {
        "accuracy": round(acc, 4),
        "precision": round(float(p), 4),
        "recall": round(float(r), 4),
        "f1": round(float(f1), 4),
        "macro_precision": round(float(macro_p), 4),
        "macro_recall": round(float(macro_r), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "cohen_kappa": round(kappa, 4),
        "confusion_matrix": {
            "labels": ["Negative/Absent (0)", "Positive/Present (1)"],
            "matrix": cm,
            "true_negative": tn,
            "false_positive": fp,
            "false_negative": fn,
            "true_positive": tp
        },
        "support": {
            "total": len(y_true),
            "positive_cases": sum(y_t),
            "negative_cases": len(y_t) - sum(y_t)
        }
    }


def calculate_multiclass_metrics(y_true: List[str], y_pred: List[str], classes: List[str]) -> Dict[str, Any]:
    """Calculate multiclass classification metrics."""
    if not y_true or not y_pred:
        return {"error": "Empty data"}

    acc = float(accuracy_score(y_true, y_pred))
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_true, y_pred, labels=classes, average='macro', zero_division=0)
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(y_true, y_pred, labels=classes, average='weighted', zero_division=0)

    # Per-class metrics
    p_per_class, r_per_class, f1_per_class, support_per_class = precision_recall_fscore_support(
        y_true, y_pred, labels=classes, average=None, zero_division=0
    )

    per_class = {}
    for i, cls in enumerate(classes):
        per_class[cls] = {
            "precision": round(float(p_per_class[i]), 4),
            "recall": round(float(r_per_class[i]), 4),
            "f1": round(float(f1_per_class[i]), 4),
            "support": int(support_per_class[i])
        }

    try:
        kappa = float(cohen_kappa_score(y_true, y_pred, labels=classes))
        if np.isnan(kappa):
            kappa = 0.0
    except Exception:
        kappa = 0.0

    cm = confusion_matrix(y_true, y_pred, labels=classes).tolist()

    return {
        "accuracy": round(acc, 4),
        "macro_precision": round(float(macro_p), 4),
        "macro_recall": round(float(macro_r), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "cohen_kappa": round(kappa, 4),
        "per_class": per_class,
        "confusion_matrix": {
            "labels": classes,
            "matrix": cm
        },
        "support": {
            "total": len(y_true)
        }
    }


def calibrate_thresholds(
    y_true: List[bool],
    scores: List[float],
    candidate_thresholds: List[float] = [0.30, 0.40, 0.50, 0.60, 0.70]
) -> Dict[str, Any]:
    """Evaluate candidate classification thresholds and identify optimal operating point."""
    results = []
    y_t = [1 if v else 0 for v in y_true]
    best_threshold = 0.50
    best_f1 = -1.0

    for thresh in candidate_thresholds:
        y_p = [1 if s >= thresh else 0 for s in scores]
        p, r, f1, _ = precision_recall_fscore_support(y_t, y_p, pos_label=1, average='binary', zero_division=0)
        acc = float(accuracy_score(y_t, y_p))

        item = {
            "threshold": thresh,
            "accuracy": round(acc, 4),
            "precision": round(float(p), 4),
            "recall": round(float(r), 4),
            "f1": round(float(f1), 4)
        }
        results.append(item)

        if float(f1) > best_f1:
            best_f1 = float(f1)
            best_threshold = thresh

    return {
        "candidate_evaluations": results,
        "optimal_threshold": best_threshold,
        "best_f1": round(best_f1, 4),
        "default_threshold": 0.50,
        "recommendation": f"Optimal operating threshold based on F1 is {best_threshold:.2f} (F1: {best_f1:.4f})"
    }


def query_nlp_service(text: str, nlp_url: str = "http://127.0.0.1:8001") -> Dict[str, Any]:
    """Query live FastAPI NLP service /analyze endpoint."""
    url = f"{nlp_url.rstrip('/')}/analyze"
    payload = json.dumps({"text": text}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as e:
        logger.error(f"Failed to query NLP service at {url}: {e}")
        raise RuntimeError(f"NLP Service unavailable at {url}: {e}")


def categorize_error(
    text: str,
    human: Dict[str, Any],
    pred: Dict[str, Any],
    lang: str = "english"
) -> Tuple[str, str]:
    """Categorize prediction errors according to research operational failure patterns."""
    human_cb = human.get("cyberbullying", False)
    pred_cb = pred.get("cyberbullying", {}).get("is_cyberbullying", False)
    pred_class = pred.get("cyberbullying", {}).get("classification", "not_cyberbullying")
    human_sent = human.get("sentiment", "neutral")
    pred_sent = pred.get("sentiment", {}).get("label", "neutral")
    human_tox = human.get("toxicity", False)
    pred_tox = pred.get("toxicity", {}).get("is_toxic", False)

    # 1. Cyberbullying False Positive
    if not human_cb and pred_cb:
        if human_tox and human.get("aggression") in ["mild", "moderate"]:
            return "INSULT_WITHOUT_CYBERBULLYING", "Text contains abusive language but lacks sustained harassment or personal threat required for cyberbullying definition."
        if human_sent == "negative" and not human_tox:
            return "CONTENT_CRITIQUE_MISCLASSIFIED", "Strong negative critique of ideas or content was misclassified as targeted cyberbullying."
        return "FALSE_POSITIVE_CYBERBULLYING", "Model predicted cyberbullying where human researcher coded non-bullying."

    # 2. Cyberbullying False Negative
    if human_cb and not pred_cb:
        if pred_class in ["needs_review", "insufficient_evidence"]:
            return "BORDERLINE_FLAGGED_FOR_REVIEW", "Model flagged text as ambiguous/needs review rather than conclusive cyberbullying."
        if lang in ["roman_urdu", "urdu"]:
            return "LANGUAGE_CODE_SWITCHING_LIMITATION", "Cyberbullying missed due to multilingual vocabulary or Roman Urdu dialect expression."
        return "FALSE_NEGATIVE_CYBERBULLYING", "Model failed to detect targeted cyberbullying behavior."

    # 3. Sentiment Discrepancy
    if human_sent != pred_sent:
        if "genius" in text.lower() or "brilliant" in text.lower():
            return "SARCASM_AMBIGUITY", "Sarcastic surface positive wording disguised true negative evaluation."
        if human_sent == "mixed":
            return "MIXED_VALENCE_DISCREPANCY", "Response contained both positive and negative elements; model selected single primary pole."
        return "SENTIMENT_POLARITY_MISMATCH", f"Human coded {human_sent} but model predicted {pred_sent}."

    # 4. Toxicity Discrepancy
    if human_tox != pred_tox:
        return "TOXICITY_THRESHOLD_DISCREPANCY", f"Human toxicity ({human_tox}) differed from model prediction ({pred_tox})."

    return "OTHER_DISCREPANCY", "Minor dimension disagreement."


def evaluate_dataset(
    dataset_path: str,
    nlp_url: str = "http://127.0.0.1:8001",
    predictions_path: Optional[str] = None,
    output_dir: str = "validation/results",
    report_dir: str = "validation/reports"
) -> Dict[str, Any]:
    """Execute complete validation pipeline."""
    # Determine report file vs directory safely
    if report_dir.endswith(('.md', '.markdown', '.txt')):
        report_file = report_dir
        actual_report_dir = os.path.dirname(report_file) or "."
    else:
        actual_report_dir = report_dir
        report_file = os.path.join(actual_report_dir, "VALIDATION_REPORT.md")

    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(actual_report_dir, exist_ok=True)

    # 1. Check for missing or empty dataset
    if not os.path.exists(dataset_path):
        msg = f"VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED (Dataset file '{dataset_path}' not found)"
        logger.warning(msg)
        empty_res = {
            "validation_status": "Not validated",
            "is_validated": False,
            "sample_count": 0,
            "message": msg,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        with open(os.path.join(output_dir, "validation_report.json"), "w", encoding="utf-8") as f:
            json.dump(empty_res, f, indent=2)
        return empty_res

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", []) if isinstance(data, dict) else data
    if not items:
        msg = "VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED (Zero samples provided in dataset)"
        logger.warning(msg)
        empty_res = {
            "validation_status": "Not validated",
            "is_validated": False,
            "sample_count": 0,
            "message": msg,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        with open(os.path.join(output_dir, "validation_report.json"), "w", encoding="utf-8") as f:
            json.dump(empty_res, f, indent=2)
        return empty_res

    is_synthetic = data.get("is_synthetic_benchmark", False) if isinstance(data, dict) else True
    logger.info(f"Loaded {len(items)} validation items. Is synthetic benchmark: {is_synthetic}")

    # 2. Check for duplicate IDs or malformed records
    seen_ids = set()
    validated_items = []
    for idx, item in enumerate(items):
        item_id = item.get("id", f"auto-id-{idx}")
        if item_id in seen_ids:
            logger.warning(f"Duplicate item ID detected: {item_id}. Skipping duplicate.")
            continue
        seen_ids.add(item_id)

        if not item.get("text", "").strip():
            logger.warning(f"Item {item_id} has empty text. Skipping.")
            continue

        if "human" not in item:
            logger.warning(f"Item {item_id} is missing human gold labels. Skipping.")
            continue

        validated_items.append(item)

    if not validated_items:
        msg = "VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED (No valid labeled items found)"
        empty_res = {
            "validation_status": "Not validated",
            "is_validated": False,
            "sample_count": 0,
            "message": msg
        }
        with open(os.path.join(output_dir, "validation_report.json"), "w", encoding="utf-8") as f:
            json.dump(empty_res, f, indent=2)
        return empty_res

    # 3. Load or generate predictions
    predictions_map = {}
    if predictions_path and os.path.exists(predictions_path):
        logger.info(f"Loading precomputed predictions from {predictions_path}")
        with open(predictions_path, "r", encoding="utf-8") as f:
            pred_data = json.load(f)
            predictions_map = {p["id"]: p["prediction"] for p in pred_data if "id" in p and "prediction" in p}

    results_aligned = []
    logger.info("Executing NLP inference for alignment...")
    for item in validated_items:
        item_id = item["id"]
        text = item["text"]
        human = item["human"]
        lang = item.get("language", "english")
        secondary = item.get("secondary_human")

        pred = predictions_map.get(item_id)
        if not pred:
            pred = query_nlp_service(text, nlp_url)

        results_aligned.append({
            "id": item_id,
            "text": text,
            "language": lang,
            "human": human,
            "secondary_human": secondary,
            "prediction": pred
        })

    # 4. Extract ground truth and predictions for each dimension
    # Dimension 1: Sentiment (Multiclass: positive, neutral, negative, mixed)
    sentiment_classes = ["positive", "neutral", "negative", "mixed"]
    y_true_sent = [r["human"].get("sentiment", "neutral") for r in results_aligned]
    y_pred_sent = [r["prediction"].get("sentiment", {}).get("label", "neutral") for r in results_aligned]
    sentiment_metrics = calculate_multiclass_metrics(y_true_sent, y_pred_sent, sentiment_classes)

    # Dimension 2: Toxicity (Binary)
    y_true_tox = [bool(r["human"].get("toxicity", False)) for r in results_aligned]
    y_pred_tox = [bool(r["prediction"].get("toxicity", {}).get("is_toxic", False)) for r in results_aligned]
    tox_scores = [float(r["prediction"].get("toxicity", {}).get("overall_score", 0.0)) for r in results_aligned]
    toxicity_metrics = calculate_binary_metrics(y_true_tox, y_pred_tox)
    toxicity_thresholds = calibrate_thresholds(y_true_tox, tox_scores)

    # Dimension 3: Aggression (Multiclass: none, mild, moderate, severe)
    aggression_classes = ["none", "mild", "moderate", "severe"]
    y_true_agg = [r["human"].get("aggression", "none") for r in results_aligned]
    y_pred_agg = [r["prediction"].get("aggression", {}).get("level", "none") for r in results_aligned]
    aggression_metrics = calculate_multiclass_metrics(y_true_agg, y_pred_agg, aggression_classes)

    # Dimension 4: Cyberbullying (Binary)
    y_true_cb = [bool(r["human"].get("cyberbullying", False)) for r in results_aligned]
    y_pred_cb = [bool(r["prediction"].get("cyberbullying", {}).get("is_cyberbullying", False)) for r in results_aligned]
    cb_scores = [float(r["prediction"].get("cyberbullying", {}).get("score", 0.0)) for r in results_aligned]
    cyberbullying_metrics = calculate_binary_metrics(y_true_cb, y_pred_cb)
    cyberbullying_thresholds = calibrate_thresholds(y_true_cb, cb_scores)

    # 5. Inter-Rater Reliability (Human-vs-Human Cohen's kappa where secondary coder exists)
    secondary_pairs = [r for r in results_aligned if r.get("secondary_human")]
    inter_rater = {
        "secondary_coder_available": len(secondary_pairs) > 0,
        "sample_count": len(secondary_pairs),
        "cohen_kappa": {}
    }
    if len(secondary_pairs) >= 2:
        try:
            h1_sent = [r["human"].get("sentiment") for r in secondary_pairs]
            h2_sent = [r["secondary_human"].get("sentiment") for r in secondary_pairs]
            k_sent = float(cohen_kappa_score(h1_sent, h2_sent))
            inter_rater["cohen_kappa"]["sentiment"] = round(k_sent if not np.isnan(k_sent) else 0.0, 4)

            h1_cb = [1 if r["human"].get("cyberbullying") else 0 for r in secondary_pairs]
            h2_cb = [1 if r["secondary_human"].get("cyberbullying") else 0 for r in secondary_pairs]
            k_cb = float(cohen_kappa_score(h1_cb, h2_cb))
            inter_rater["cohen_kappa"]["cyberbullying"] = round(k_cb if not np.isnan(k_cb) else 0.0, 4)

            h1_tox = [1 if r["human"].get("toxicity") else 0 for r in secondary_pairs]
            h2_tox = [1 if r["secondary_human"].get("toxicity") else 0 for r in secondary_pairs]
            k_tox = float(cohen_kappa_score(h1_tox, h2_tox))
            inter_rater["cohen_kappa"]["toxicity"] = round(k_tox if not np.isnan(k_tox) else 0.0, 4)

            h1_agg = [r["human"].get("aggression") for r in secondary_pairs]
            h2_agg = [r["secondary_human"].get("aggression") for r in secondary_pairs]
            k_agg = float(cohen_kappa_score(h1_agg, h2_agg))
            inter_rater["cohen_kappa"]["aggression"] = round(k_agg if not np.isnan(k_agg) else 0.0, 4)
        except Exception as e:
            logger.warning(f"Error computing human-human inter-rater reliability: {e}")

    # 6. Error Analysis Categorization
    errors = []
    for r in results_aligned:
        human_cb = r["human"].get("cyberbullying", False)
        pred_cb = r["prediction"].get("cyberbullying", {}).get("is_cyberbullying", False)
        human_sent = r["human"].get("sentiment", "neutral")
        pred_sent = r["prediction"].get("sentiment", {}).get("label", "neutral")
        human_tox = r["human"].get("toxicity", False)
        pred_tox = r["prediction"].get("toxicity", {}).get("is_toxic", False)

        has_error = (human_cb != pred_cb) or (human_sent != pred_sent) or (human_tox != pred_tox)
        if has_error:
            category, explanation = categorize_error(r["text"], r["human"], r["prediction"], r["language"])
            errors.append({
                "id": r["id"],
                "text": r["text"],
                "language": r["language"],
                "category": category,
                "explanation": explanation,
                "discrepancies": {
                    "cyberbullying": {"human": human_cb, "predicted": pred_cb},
                    "sentiment": {"human": human_sent, "predicted": pred_sent},
                    "toxicity": {"human": human_tox, "predicted": pred_tox}
                }
            })

    # Error category summary
    error_category_counts = {}
    for err in errors:
        cat = err["category"]
        error_category_counts[cat] = error_category_counts.get(cat, 0) + 1

    # 7. Multilingual Performance Breakdown
    language_breakdown = {}
    languages_present = set(r["language"] for r in results_aligned)
    for lang in languages_present:
        lang_items = [r for r in results_aligned if r["language"] == lang]
        lang_y_t_cb = [bool(r["human"].get("cyberbullying", False)) for r in lang_items]
        lang_y_p_cb = [bool(r["prediction"].get("cyberbullying", {}).get("is_cyberbullying", False)) for r in lang_items]
        lang_acc_cb = float(accuracy_score(lang_y_t_cb, lang_y_p_cb))

        lang_y_t_sent = [r["human"].get("sentiment", "neutral") for r in lang_items]
        lang_y_p_sent = [r["prediction"].get("sentiment", {}).get("label", "neutral") for r in lang_items]
        lang_acc_sent = float(accuracy_score(lang_y_t_sent, lang_y_p_sent))

        language_breakdown[lang] = {
            "samples": len(lang_items),
            "cyberbullying_accuracy": round(lang_acc_cb, 4),
            "sentiment_accuracy": round(lang_acc_sent, 4)
        }

    # 8. Assemble Complete Validation Package
    validation_status = "Benchmark Validated" if is_synthetic else "Validated"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    metrics_payload = {
        "validation_status": validation_status,
        "is_validated": True,
        "is_synthetic_benchmark": is_synthetic,
        "sample_count": len(results_aligned),
        "timestamp": now_iso,
        "dimensions": {
            "sentiment": sentiment_metrics,
            "toxicity": toxicity_metrics,
            "aggression": aggression_metrics,
            "cyberbullying": cyberbullying_metrics
        },
        "inter_rater_reliability": inter_rater,
        "multilingual_breakdown": language_breakdown
    }

    confusion_matrices_payload = {
        "timestamp": now_iso,
        "sentiment": sentiment_metrics.get("confusion_matrix"),
        "toxicity": toxicity_metrics.get("confusion_matrix"),
        "aggression": aggression_metrics.get("confusion_matrix"),
        "cyberbullying": cyberbullying_metrics.get("confusion_matrix")
    }

    threshold_analysis_payload = {
        "timestamp": now_iso,
        "toxicity": toxicity_thresholds,
        "cyberbullying": cyberbullying_thresholds
    }

    errors_payload = {
        "timestamp": now_iso,
        "total_errors": len(errors),
        "error_category_counts": error_category_counts,
        "errors": errors
    }

    # High-level summary report for API consumption
    validation_report_payload = {
        "validation_status": validation_status,
        "is_validated": True,
        "is_synthetic_benchmark": is_synthetic,
        "sample_count": len(results_aligned),
        "timestamp": now_iso,
        "models": {
            "sentiment": "cardiffnlp/twitter-xlm-roberta-base-sentiment",
            "toxicity": "Detoxify (multilingual)",
            "aggression": "Xu et al. (2020) Lexicon Model",
            "cyberbullying": "Research Operational Multi-Dimensional Definition"
        },
        "summary": {
            "cyberbullying": {
                "accuracy": cyberbullying_metrics.get("accuracy"),
                "precision": cyberbullying_metrics.get("precision"),
                "recall": cyberbullying_metrics.get("recall"),
                "f1": cyberbullying_metrics.get("f1"),
                "cohen_kappa": cyberbullying_metrics.get("cohen_kappa")
            },
            "sentiment": {
                "accuracy": sentiment_metrics.get("accuracy"),
                "macro_f1": sentiment_metrics.get("macro_f1"),
                "cohen_kappa": sentiment_metrics.get("cohen_kappa")
            },
            "toxicity": {
                "accuracy": toxicity_metrics.get("accuracy"),
                "f1": toxicity_metrics.get("f1")
            },
            "aggression": {
                "accuracy": aggression_metrics.get("accuracy"),
                "macro_f1": aggression_metrics.get("macro_f1")
            }
        },
        "threshold_calibration": {
            "cyberbullying_optimal": cyberbullying_thresholds.get("optimal_threshold"),
            "cyberbullying_best_f1": cyberbullying_thresholds.get("best_f1"),
            "toxicity_optimal": toxicity_thresholds.get("optimal_threshold")
        },
        "inter_rater": inter_rater,
        "error_summary": {
            "total_discrepancies": len(errors),
            "breakdown": error_category_counts
        }
    }

    # 9. Save JSON Artifacts
    with open(os.path.join(output_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)
    with open(os.path.join(output_dir, "confusion_matrices.json"), "w", encoding="utf-8") as f:
        json.dump(confusion_matrices_payload, f, indent=2)
    with open(os.path.join(output_dir, "threshold_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(threshold_analysis_payload, f, indent=2)
    with open(os.path.join(output_dir, "errors.json"), "w", encoding="utf-8") as f:
        json.dump(errors_payload, f, indent=2)
    with open(os.path.join(output_dir, "validation_report.json"), "w", encoding="utf-8") as f:
        json.dump(validation_report_payload, f, indent=2)

    # 10. Generate Researcher-Friendly Markdown Report
    markdown_report = generate_markdown_report(validation_report_payload, metrics_payload, threshold_analysis_payload, errors_payload)
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(markdown_report)

    logger.info(f"Validation successfully completed. Output written to {output_dir}/ and {report_file}")
    return validation_report_payload


def generate_markdown_report(
    summary: Dict[str, Any],
    metrics: Dict[str, Any],
    thresholds: Dict[str, Any],
    errors: Dict[str, Any]
) -> str:
    """Format evaluation outputs into a researcher-friendly publication report."""
    cb = summary["summary"]["cyberbullying"]
    sent = summary["summary"]["sentiment"]
    tox = summary["summary"]["toxicity"]
    agg = summary["summary"]["aggression"]
    ir = summary["inter_rater"]
    cb_thresh = thresholds["cyberbullying"]

    report = f"""# Research Validation & Calibration Report
**Project:** M.Phil Cyberbullying Experimental Research Study  
**Generated:** {summary["timestamp"]}  
**Validation Type:** {summary["validation_status"]} (Synthetic Benchmark: {summary["is_synthetic_benchmark"]})  
**Sample Size:** {summary["sample_count"]} annotated responses  

---

## 1. Executive Summary

| Dimension | Model / Methodology | Accuracy | Precision | Recall | F1-Score | Cohen's $\\kappa$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cyberbullying** | Multi-dimensional Operational Criteria | {cb.get("accuracy", "N/A")} | {cb.get("precision", "N/A")} | {cb.get("recall", "N/A")} | {cb.get("f1", "N/A")} | {cb.get("cohen_kappa", "N/A")} |
| **Sentiment** | CardiffNLP Twitter-XLM-RoBERTa | {sent.get("accuracy", "N/A")} | Macro: {metrics["dimensions"]["sentiment"].get("macro_precision", "N/A")} | Macro: {metrics["dimensions"]["sentiment"].get("macro_recall", "N/A")} | Macro: {sent.get("macro_f1", "N/A")} | {sent.get("cohen_kappa", "N/A")} |
| **Toxicity** | Detoxify Multilingual | {tox.get("accuracy", "N/A")} | {metrics["dimensions"]["toxicity"].get("precision", "N/A")} | {metrics["dimensions"]["toxicity"].get("recall", "N/A")} | {tox.get("f1", "N/A")} | {metrics["dimensions"]["toxicity"].get("cohen_kappa", "N/A")} |
| **Aggression** | Xu et al. (2020) Lexicon Model | {agg.get("accuracy", "N/A")} | Macro: {metrics["dimensions"]["aggression"].get("macro_precision", "N/A")} | Macro: {metrics["dimensions"]["aggression"].get("macro_recall", "N/A")} | Macro: {agg.get("macro_f1", "N/A")} | {metrics["dimensions"]["aggression"].get("cohen_kappa", "N/A")} |

> [!IMPORTANT]
> **Research Principles**:
> - Negative Sentiment $\\neq$ Toxicity $\\neq$ Aggression $\\neq$ Cyberbullying.
> - The Human Researcher is the scientific ground truth reference.
> - AI provides coding suggestions only; human review is strictly required for official research coding.

---

## 2. Inter-Rater Reliability (Cohen's $\\kappa$)
"""
    if ir.get("secondary_coder_available"):
        report += f"""
A secondary researcher coded {ir.get("sample_count")} samples for human-vs-human reliability evaluation:
- **Cyberbullying Agreement (Human vs Human):** $\\kappa = {ir["cohen_kappa"].get("cyberbullying", "N/A")}$
- **Sentiment Agreement (Human vs Human):** $\\kappa = {ir["cohen_kappa"].get("sentiment", "N/A")}$
- **Toxicity Agreement (Human vs Human):** $\\kappa = {ir["cohen_kappa"].get("toxicity", "N/A")}$
- **Aggression Agreement (Human vs Human):** $\\kappa = {ir["cohen_kappa"].get("aggression", "N/A")}$
"""
    else:
        report += "\n*No secondary human coder data provided in this evaluation set.*\n"

    report += f"""
---

## 3. Threshold Calibration (Cyberbullying Severity)

Candidate thresholds evaluated against gold labels:

| Threshold | Accuracy | Precision | Recall | F1-Score |
| :--- | :--- | :--- | :--- | :--- |
"""
    for row in cb_thresh.get("candidate_evaluations", []):
        report += f"| {row['threshold']:.2f} | {row['accuracy']:.4f} | {row['precision']:.4f} | {row['recall']:.4f} | {row['f1']:.4f} |\n"

    report += f"""
**Optimal Calibrated Threshold:** `{cb_thresh.get("optimal_threshold"):.2f}` (Yields F1: `{cb_thresh.get("best_f1"):.4f}`)  
**Default Engineering Threshold:** `{cb_thresh.get("default_threshold"):.2f}`  

---

## 4. Error Analysis & Categorized Failure Patterns

Total discrepancies identified across validation samples: **{errors.get("total_errors", 0)}**

### Categorical Breakdown:
"""
    for cat, count in errors.get("error_category_counts", {}).items():
        report += f"- **{cat}:** {count} cases\n"

    report += """
### Qualitative Error Highlights:
"""
    for err in errors.get("errors", [])[:5]:
        report += f"- **[{err['id']}]** *\"{err['text']}\"* ({err['language']})  \n  **Failure Pattern:** `{err['category']}` — {err['explanation']}  \n"

    report += """
---

## 5. Methodological & Language Limitations

1. **Roman Urdu / Multilingual Nuances:** Informal transliterations exhibit phonetic variability not always captured by English lexicons.
2. **Context & Sarcasm:** Single-text analysis cannot observe longitudinal repetition or power asymmetry.
3. **Reproducibility:** All calibration thresholds and random seeds must be reported in publication appendices.
"""
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate NLP coding performance against human gold labels.")
    parser.add_argument("--dataset", type=str, default="validation/examples/validation.sample.json", help="Path to validation dataset JSON file")
    parser.add_argument("--nlp-url", type=str, default="http://127.0.0.1:8001", help="URL of live FastAPI NLP service")
    parser.add_argument("--predictions", type=str, default=None, help="Path to precomputed predictions JSON file (optional)")
    parser.add_argument("--output-dir", type=str, default="validation/results", help="Directory for JSON results")
    parser.add_argument("--report-dir", type=str, default="validation/reports", help="Directory for Markdown reports")
    parser.add_argument("--report", type=str, default=None, help="Direct path to Markdown report file (optional override)")

    args = parser.parse_args()
    target_report = args.report if args.report else args.report_dir
    evaluate_dataset(
        dataset_path=args.dataset,
        nlp_url=args.nlp_url,
        predictions_path=args.predictions,
        output_dir=args.output_dir,
        report_dir=target_report
    )
