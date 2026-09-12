# Research Validation, Accuracy Evaluation & Calibration (Phase 6)

## 1. Purpose & Theoretical Framework
The primary objective of Phase 6 is to provide a rigorous, empirical validation and threshold calibration pipeline for the M.Phil research study's NLP-assisted coding system.

The system evaluates four distinct linguistic and behavioral dimensions:
1. **Sentiment**: Emotional and evaluative orientation (Positive, Neutral, Negative, Mixed).
2. **Toxicity / Abusive Language**: Explicit vulgarity, profanity, or toxic insults.
3. **Aggression**: Hostility level and targeting according to the **Xu et al. (2020)** Lexicon Model.
4. **Cyberbullying**: Operational classification based on personal targeting, harm severity, and harassment patterns.

### Core Research Principle:
$$\text{Negative Sentiment} \neq \text{Toxicity} \neq \text{Aggression} \neq \text{Cyberbullying}$$

- **Critique of ideas is NOT cyberbullying**: Strong disagreement with experimental stimuli is legitimate discourse.
- **Isolated profanity is NOT cyberbullying**: Vulgarity without personal targeting or sustained harm does not meet the operational definition.
- **The Human Researcher is the scientific ground truth reference**: Model confidence or softmax probabilities are never treated as empirical accuracy.

---

## 2. Dataset Requirements & Schema
Validation datasets are stored independently in `validation/` and adhere to `validation/dataset.schema.json`.

### Structure:
```json
{
  "$schema": "../dataset.schema.json",
  "version": "1.0.0",
  "description": "Validation dataset description",
  "is_synthetic_benchmark": false,
  "coders": ["researcher_1", "researcher_2"],
  "items": [
    {
      "id": "val-001",
      "text": "Participant response text",
      "language": "english",
      "context": {
        "videoTopic": "Stimulus Topic",
        "condition": "anonymous"
      },
      "human": {
        "sentiment": "negative",
        "toxicity": false,
        "aggression": "none",
        "aggression_score": 0.0,
        "cyberbullying": false,
        "cyberbullying_type": "none",
        "cyberbullying_severity": 0.0,
        "is_personally_targeted": false,
        "coder_id": "researcher_1"
      },
      "secondary_human": {
        "sentiment": "negative",
        "toxicity": false,
        "aggression": "none",
        "cyberbullying": false,
        "cyberbullying_type": "none",
        "coder_id": "researcher_2"
      },
      "notes": "Research notes on linguistic context"
    }
  ]
}
```

---

## 3. Human Gold-Labeling Procedure & Inter-Rater Reliability
1. **Primary Coder**: Codes responses according to the operational definitions in `docs/coding-methodology.md`.
2. **Secondary Coder**: Independently codes a subset (minimum 15-20%) of responses without seeing primary coder labels or AI suggestions.
3. **Inter-Rater Reliability Calculation (Cohen's $\kappa$)**:
   $$\kappa = \frac{P_o - P_e}{1 - P_e}$$
   Where $P_o$ is observed agreement and $P_e$ is expected agreement by chance.
4. **Agreement Distinction**:
   - **Human-vs-Human agreement**: Authentic inter-rater reliability.
   - **Model-vs-Human agreement**: Diagnostic model performance metric.

---

## 4. Evaluated Classification Metrics
Because research datasets frequently exhibit class imbalance (e.g. cyberbullying is relatively rare compared to non-bullying comments), the system reports multiple metrics and does not rely solely on overall accuracy:

- **Accuracy**: $\frac{\text{TP} + \text{TN}}{\text{Total}}$
- **Precision (Positive Class)**: $\frac{\text{TP}}{\text{TP} + \text{FP}}$ (Minimizes false accusations of cyberbullying)
- **Recall (Positive Class)**: $\frac{\text{TP}}{\text{TP} + \text{FN}}$ (Ensures true bullying is not overlooked)
- **$F_1$-Score**: Harmonic mean of Precision and Recall: $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$
- **Macro $F_1$ & Weighted $F_1$**: Averages per-class performance equally across minority and majority classes.
- **Confusion Matrices**: Stored in `validation/results/confusion_matrices.json`.

---

## 5. Threshold Calibration
Initial engineering default thresholds (e.g. 0.50) are systematically evaluated against candidate thresholds:
$$\tau \in \{0.30, 0.40, 0.50, 0.60, 0.70\}$$

On the benchmark dataset:
- **Optimal Cyberbullying Threshold**: `0.50` yields balanced Precision ($0.80$) and Recall ($1.00$) with $F_1 = 0.8889$.
- Lowering threshold to $0.30$ increases False Positives (Precision drops to $0.67$).

---

## 6. Categorized Error Analysis
Discrepancies between NLP suggestions and human reference labels are automatically classified into diagnostic failure patterns:
1. `INSULT_WITHOUT_CYBERBULLYING`: Abusive word detected, but lacks personal targeting or sustained harassment.
2. `CONTENT_CRITIQUE_MISCLASSIFIED`: Negative review of video ideas mistakenly flagged as personal attack.
3. `SARCASM_AMBIGUITY`: Positive lexical surface words disguising negative pragmatic intent.
4. `MIXED_VALENCE_DISCREPANCY`: Complex response containing conflicting positive and negative elements.
5. `LANGUAGE_CODE_SWITCHING_LIMITATION`: Dialect phrases in Roman Urdu or native Urdu.

---

## 7. Language & Research Limitations
1. **Roman Urdu / Multilingual Nuances**: Roman Urdu lacks standardized spelling; phonetic transliterations require localized empirical gold labels.
2. **Contextual Invisibility**: Single isolated text submissions cannot evaluate longitudinal repetition or power asymmetry.
3. **Human-in-the-Loop Authority**: Model suggestions must always be reviewed by the researcher via Accept, Modify, or Reject.

---

## 8. How to Execute the Validation Pipeline

```bash
# Run validation on benchmark dataset:
cd nlp-service
.\venv\Scripts\python.exe ..\validation\scripts\evaluate.py --dataset ..\validation\examples\validation.sample.json

# Run unit tests:
.\venv\Scripts\pytest.exe tests/test_validation.py -v

# Run backend regression tests:
cd ..\backend
node src/tests/test-phase6-validation.js
```

---

## 9. Distinction: Technical System Validation vs. Research Validity
- **Technical System Validation**: Confirms that the tokenizer, transformer models, inference pipelines, metric algorithms, confusion matrix generators, and review workflows execute without software bugs.
- **Research Validity**: Requires empirical validation against independently collected, human-coded participant responses from the target demographic. When real data is not yet collected, the system explicitly reports:
  `VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED`.
