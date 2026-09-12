# Phase 7 — Research Analytics, Results, Export & Supervisor Reporting

## 1. Purpose
Phase 7 provides a research-grade analytics, visualization, and export framework for the M.Phil cyberbullying and aggression experimental study. It synthesizes final researcher-approved codings into descriptive statistics, condition comparisons, AI-human agreement analysis, Phase 6 empirical validation results, and multi-format exports (CSV, XLSX, JSON, and printable research reports).

---

## 2. System Architecture

```text
Participant Response (Immutable)
            ↓
NLP Microservice Analysis (CardiffNLP XLM-RoBERTa + Detoxify + Xu et al.)
            ↓
AI Suggestions (aiCoding in MongoDB)
            ↓
Human Researcher Review (Accept / Modify / Reject)
            ↓
Final Researcher Coding (sentiment, aggression, cyberbullying, reviewStatus: 'reviewed')
            ↓
ResearchAnalyticsService (Descriptive Aggregation & Strict Denominators)
            ↓
Admin Research Analytics Dashboard & Multi-Format Exports (CSV, XLSX, JSON, PDF)
```

---

## 3. Data Sources & Three Analytical Levels

The system strictly enforces the distinction between three data representations:

1. **Original Participant Response (`VideoResponse`)**:
   - Strictly immutable and read-only.
   - Contains participant text, response length, and submission timestamp.
2. **AI / NLP Suggestion (`Coding.aiCoding`)**:
   - Model predictions generated for decision support.
   - Used for inter-rater agreement, evaluation against human gold labels, and error auditability.
3. **Final Researcher Coding (`Coding.sentiment`, `Coding.aggression`, `Coding.cyberbullying`)**:
   - **The primary ground truth research dataset**.
   - All research outcome metrics (condition comparisons, stimulus breakdowns, prevalence rates) are derived strictly from this level.

---

## 4. Final Coding Definition & Priority Principle

> [!IMPORTANT]
> **Final Coding Priority Principle**:
> For research outcome statistics, **Final Researcher Coding > AI Suggestion**.
> AI suggestions are NEVER silently treated as final research results.

A response is considered part of the **Final Research Dataset** when:
- `coderRole: 'primary'`
- `reviewStatus` is `reviewed` or `approved`
- The researcher has explicitly accepted, modified, or confirmed the coding values.

---

## 5. Analytics Calculations & Safe Percentage Rules

1. **Percentage Calculation**:
   $$\text{Percentage} = \left(\frac{\text{Count}}{N_{\text{valid}}}\right) \times 100$$
   - Percentages are computed strictly against valid coded responses ($N_{\text{valid}}$), not total responses.
   - Division-by-zero protection ensures $0.00\%$ is returned when $N_{\text{valid}} = 0$.
2. **Missing Data Preservation**:
   - Uncoded responses and missing dimensions are explicitly tracked as `missingCount`.
   - Missing data is never coerced to negative sentiment, zero aggression, or absent cyberbullying.
3. **Descriptive Rounding**:
   - Percentages: rounded to 2 decimal places.
   - Numeric scores: rounded to 2 decimal places.
   - Counts: whole integers.
4. **Descriptive Statistics Only**:
   - Mean, median, min, and max are reported for numeric aggression and severity levels.
   - No automated causal claims or inferential significance assertions are made without formal testing.

---

## 6. Construct Independence & Non-Conflation

The analytics dashboard strictly decouples all four research variables:

$$\text{Negative Sentiment} \neq \text{Toxicity} \neq \text{Aggression} \neq \text{Cyberbullying}$$

- **Sentiment**: Reflects general affective polarity (Positive, Neutral, Negative, Mixed).
- **Toxicity**: Identifies abusive, obscene, or insulting language via Detoxify.
- **Aggression**: Measures behavioral hostility via the Xu et al. (2020) lexicon framework.
- **Cyberbullying**: Requires personal targeting, repeated or severe harassment, and intent to harm.

---

## 7. Filtering System

The analytics engine supports combinable, sanitized filter parameters:
- **Condition**: `anonymous` vs `identifiable`
- **Video Stimulus**: Filter by specific video ObjectId
- **Sentiment**: `positive`, `neutral`, `negative`, `mixed`
- **Aggression Severity**: `none`, `mild`, `moderate`, `severe`
- **Cyberbullying Presence**: `true` (Present) vs `false` (Absent)
- **Review Status**: `reviewed`, `pending_review`, `ai_generated`
- **Date Range**: `startDate` and `endDate`

Filters dynamically update summary cards, distribution charts, condition comparisons, and exports. A **Clear Filters** button resets to the full dataset.

---

## 8. Experimental Condition Comparison (Group Analysis)

Cross-tabulation comparing participant groups:
- **Anonymous Condition**: Total responses, coded responses, cyberbullying prevalence, aggression prevalence, mean aggression score, and sentiment distribution.
- **Identifiable Condition**: Parallel metrics for direct side-by-side descriptive comparison.
- **Methodology Note**: Accompanied by an explicit disclaimer that differences are descriptive and require formal inferential hypothesis testing for thesis claims.

---

## 9. AI vs Human Agreement & Discrepancy Auditing

The system tracks researcher interactions with AI recommendations:
- **Accepted AI Suggestions**: Count and percentage of AI suggestions adopted verbatim (`reviewAction: 'accepted_ai'`).
- **Modified by Researcher**: Count and percentage of AI suggestions modified by the researcher (`reviewAction: 'modified'`).
- **Rejected AI Suggestions**: Count and percentage of AI suggestions rejected by the researcher (`reviewAction: 'rejected'`).
- **Disagreement Inspector**: Interactive table displaying cases where AI prediction $\neq$ final researcher coding, showing the response snippet, AI prediction, final coding, and researcher action.

---

## 10. Phase 6 Validation Integration & Zero Fabrication

The validation tab reads empirical validation benchmarks from Phase 6 (`validation/results/validation_report.json`):
- **Accuracy, Precision, Recall, $F_1$-Score, Macro-$F_1$**
- **Cohen's $\kappa$ (Model vs Human and Human vs Human)**
- **Threshold Calibration (Optimal Operating Threshold)**
- **Confusion Matrices for all 4 dimensions**
- **Zero-Fabrication Guard**: If empirical benchmark results are absent, the system explicitly reports:
  `VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED` (never displaying fabricated mock numbers).

---

## 11. Multi-Format Export System

1. **CSV Export (`/api/admin/research-analytics/export/csv`)**:
   - Columns: `response_id`, `condition`, `video_order`, `video_title`, `final_sentiment`, `final_aggression_category`, `final_aggression_level`, `final_cyberbullying_present`, `final_cyberbullying_type`, `ai_sentiment`, `ai_aggression_category`, `ai_cyberbullying_present`, `review_status`, `review_action`, `submitted_at`.
   - Filters: Directly respects all active research filters.
2. **Excel XLSX Export (`/api/admin/research-analytics/export/xlsx`)**:
   - Multi-sheet workbook:
     - `Summary`: Overall response counts, rates, and sentiment distribution.
     - `Coding Dataset`: Complete response rows with final coding and AI suggestions.
     - `AI vs Human`: Agreement metrics and audit distribution.
     - `Condition Comparison`: Side-by-side breakdown for Anonymous vs Identifiable.
3. **JSON Export (`/api/admin/research-analytics/export/json`)**:
   - Machine-readable hierarchical JSON representation of the complete research report.
4. **Supervisor Printable / PDF Report (`window.print()`)**:
   - Publication-ready layout containing dataset summary, condition comparison table, model provenance, and formal methodology disclaimers.

---

## 12. Security & Privacy Assurance

- **Authentication**: All analytics endpoints require valid admin session credentials (`authenticateAdmin`).
- **Authorization**: Access restricted strictly to users with researcher or admin privileges (`requireResearcher`).
- **Participant Access Blocked**: Participant tokens cannot access analytics or export endpoints.
- **Privacy Guaranteed**: Participant passwords, session secrets, and credentials are never included in exports. Participant IDs are displayed as stable anonymous identifiers (`ANON-XXXX`).

---

## 13. Researcher & Supervisor Demonstration Flow

```text
1. Admin Login (/admin/login)
2. Open Navigation → Coding (/admin/coding)
   - Perform AI analysis on responses
   - Demonstrate Human-in-the-Loop review (Accept / Modify / Reject)
3. Open Navigation → Analytics (/admin/analytics)
   - Review Summary Stat Cards (Total Responses, Final Coded, Cyberbullying Rate)
   - Inspect Sentiment and Aggression distributions (Recharts charts)
   - Switch to 'Condition Comparison' tab (Anonymous vs Identifiable)
   - Switch to 'AI vs Human Agreement' tab (Review actions & Discrepancy table)
   - Switch to 'NLP Validation' tab (Phase 6 empirical metrics & Cohen's kappa)
   - Switch to 'Research Data Explorer' tab (Paginated table with search & sorting)
   - Switch to 'Supervisor Report' tab (Complete printable summary)
4. Click 'Export CSV' or 'Export Excel' to download data files for statistical software (SPSS / R / Python)
```

---

## 14. Verification Summary

- **Backend Unit & Integration Tests**: 53 / 53 passed (`test-phase7-analytics.js`).
- **Phase 6 Validation Tests**: 13 / 13 passed (`test-phase6-validation.js`).
- **Phase 5 UI Integration Tests**: 15 / 15 passed (`test-phase5-ui-integration.js`).
- **Phase 4 NLP Backend Tests**: 9 / 9 passed (`test-nlp-integration.js`).
- **Live E2E Tests**: 6 / 6 passed (`test-live-e2e.js`).
- **Python NLP Service Unit Tests**: 76 / 76 passed.
- **Frontend TypeScript & Build**: 0 type errors; 24 routes compiled.
- **Participant Panel Integrity**: 100% untouched and preserved.
