# Research Validation & Calibration Framework

This directory contains the independent research validation system for the M.Phil Cyberbullying & Sentimental Coding study.

## 1. Directory Structure

```text
validation/
├── README.md                          # This documentation
├── dataset.schema.json                # JSON Schema for validation datasets
├── examples/
│   ├── validation.sample.json         # Synthetic benchmark dataset for pipeline verification
│   └── validation.template.json       # Empty template for researcher gold-labeling
├── scripts/
│   └── evaluate.py                    # Evaluation, Cohen's kappa, and calibration engine
├── results/                           # Generated machine-readable JSON evaluation metrics
│   ├── metrics.json
│   ├── confusion_matrices.json
│   ├── threshold_analysis.json
│   ├── errors.json
│   └── validation_report.json
└── reports/                           # Generated human-readable Markdown validation report
    └── VALIDATION_REPORT.md
```

---

## 2. Core Research Principles

1. **Construct Separation**:
   $$\text{Negative Sentiment} \neq \text{Toxicity} \neq \text{Aggression} \neq \text{Cyberbullying}$$
2. **Ground Truth Authority**: The Human Researcher's coding is the gold standard reference. AI outputs are suggestions only.
3. **No Uncalibrated Claims**: Model probabilities are confidence scores, not scientific accuracy.
4. **Zero Fabrication**: If no human-coded dataset has been supplied, the system explicitly reports:
   `VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED`.

---

## 3. How to Run Validation

Ensure the FastAPI NLP microservice is running (default port 8001), then execute:

### Run on Synthetic Benchmark Dataset:
```bash
python validation/scripts/evaluate.py --dataset validation/examples/validation.sample.json
```

### Run on Researcher Empirical Dataset:
```bash
python validation/scripts/evaluate.py --dataset path/to/research_gold_labels.json
```

---

## 4. Evaluated Metrics

- **Binary Classification (Cyberbullying, Toxicity)**:
  - Accuracy, Precision, Recall, $F_1$-score
  - Minority class focus (handling class imbalance)
  - Confusion Matrix ($[[\text{TN}, \text{FP}], [\text{FN}, \text{TP}]]$)
  - Cohen's $\kappa$ (agreement between NLP prediction and human label)
- **Multiclass Classification (Sentiment, Aggression)**:
  - Overall Accuracy
  - Macro Precision, Macro Recall, Macro $F_1$, Weighted $F_1$
  - Per-class breakdown and confusion matrix
  - Cohen's $\kappa$
- **Inter-Rater Reliability**:
  - When `secondary_human` labels are included, calculates Human-vs-Human Cohen's $\kappa$.
- **Threshold Calibration**:
  - Compares candidate thresholds ($0.30, 0.40, 0.50, 0.60, 0.70$) for Cyberbullying and Toxicity.
  - Identifies optimal operating threshold balancing Precision and Recall.
- **Categorized Error Analysis**:
  - Automatically identifies common failure patterns: False Positives, False Negatives, Insults without Cyberbullying, Content Critique misclassified as abuse, and Roman Urdu code-switching limits.
