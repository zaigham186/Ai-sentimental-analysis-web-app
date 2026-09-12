# Research Validation & Calibration Report
**Project:** M.Phil Cyberbullying Experimental Research Study  
**Generated:** 2026-09-11T06:55:23.991139+00:00  
**Validation Type:** Benchmark Validated (Synthetic Benchmark: True)  
**Sample Size:** 15 annotated responses  

---

## 1. Executive Summary

| Dimension | Model / Methodology | Accuracy | Precision | Recall | F1-Score | Cohen's $\kappa$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cyberbullying** | Multi-dimensional Operational Criteria | 0.9333 | 0.8 | 1.0 | 0.8889 | 0.8421 |
| **Sentiment** | CardiffNLP Twitter-XLM-RoBERTa | 0.8 | Macro: 0.6222 | Macro: 0.7 | Macro: 0.648 | 0.6218 |
| **Toxicity** | Detoxify Multilingual | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| **Aggression** | Xu et al. (2020) Lexicon Model | 0.8 | Macro: 0.6444 | Macro: 0.625 | Macro: 0.6076 | 0.6786 |

> [!IMPORTANT]
> **Research Principles**:
> - Negative Sentiment $\neq$ Toxicity $\neq$ Aggression $\neq$ Cyberbullying.
> - The Human Researcher is the scientific ground truth reference.
> - AI provides coding suggestions only; human review is strictly required for official research coding.

---

## 2. Inter-Rater Reliability (Cohen's $\kappa$)

A secondary researcher coded 15 samples for human-vs-human reliability evaluation:
- **Cyberbullying Agreement (Human vs Human):** $\kappa = 1.0$
- **Sentiment Agreement (Human vs Human):** $\kappa = 0.8684$
- **Toxicity Agreement (Human vs Human):** $\kappa = 1.0$
- **Aggression Agreement (Human vs Human):** $\kappa = 1.0$

---

## 3. Threshold Calibration (Cyberbullying Severity)

Candidate thresholds evaluated against gold labels:

| Threshold | Accuracy | Precision | Recall | F1-Score |
| :--- | :--- | :--- | :--- | :--- |
| 0.30 | 0.8667 | 0.6667 | 1.0000 | 0.8000 |
| 0.40 | 0.8667 | 0.6667 | 1.0000 | 0.8000 |
| 0.50 | 0.9333 | 0.8000 | 1.0000 | 0.8889 |
| 0.60 | 0.9333 | 0.8000 | 1.0000 | 0.8889 |
| 0.70 | 0.9333 | 0.8000 | 1.0000 | 0.8889 |

**Optimal Calibrated Threshold:** `0.50` (Yields F1: `0.8889`)  
**Default Engineering Threshold:** `0.50`  

---

## 4. Error Analysis & Categorized Failure Patterns

Total discrepancies identified across validation samples: **4**

### Categorical Breakdown:
- **INSULT_WITHOUT_CYBERBULLYING:** 1 cases
- **SARCASM_AMBIGUITY:** 1 cases
- **SENTIMENT_POLARITY_MISMATCH:** 1 cases
- **MIXED_VALENCE_DISCREPANCY:** 1 cases

### Qualitative Error Highlights:
- **[val-002]** *"You are a complete idiot. Only a moron would say something this stupid."* (english)  
  **Failure Pattern:** `INSULT_WITHOUT_CYBERBULLYING` — Text contains abusive language but lacks sustained harassment or personal threat required for cyberbullying definition.  
- **[val-005]** *"Wow, you are really a total genius, aren't you? What brilliant insight."* (english)  
  **Failure Pattern:** `SARCASM_AMBIGUITY` — Sarcastic surface positive wording disguised true negative evaluation.  
- **[val-011]** *"Tum bilkul jahil aur bewaqoof insan ho, sharam karo."* (roman_urdu)  
  **Failure Pattern:** `SENTIMENT_POLARITY_MISMATCH` — Human coded negative but model predicted positive.  
- **[val-013]** *"I see both sides of this argument. While some points are valid, other claims lack factual evidence."* (english)  
  **Failure Pattern:** `MIXED_VALENCE_DISCREPANCY` — Response contained both positive and negative elements; model selected single primary pole.  

---

## 5. Methodological & Language Limitations

1. **Roman Urdu / Multilingual Nuances:** Informal transliterations exhibit phonetic variability not always captured by English lexicons.
2. **Context & Sarcasm:** Single-text analysis cannot observe longitudinal repetition or power asymmetry.
3. **Reproducibility:** All calibration thresholds and random seeds must be reported in publication appendices.
