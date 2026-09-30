"""
Cyberbullying Model Training Script
Trains a calibrated classifier combining:
1. cyberbullying_dataset_1000-selected-columns (1).csv (1,000 balanced samples)
2. roman_urdu_cyber_abuse_dataset.csv (5,004 balanced Roman Urdu samples)
3. 3. Aggressive_All (1).csv (personally targeted aggressive samples)

Classifies Cyberbullying (1) vs Non-Cyberbullying (0) comments across English & Roman Urdu.
"""

import os
import sys
import csv
import re
import joblib
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support, confusion_matrix

# Ensure UTF-8 output encoding for emojis on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

AGG_DATASET_PATH = os.path.join(ROOT_DIR, "3. Aggressive_All (1).csv")
CB_DATASET_PATH = os.path.join(ROOT_DIR, "cyberbullying_dataset_1000-selected-columns (1).csv")
RU_DATASET_PATH = os.path.join(ROOT_DIR, "roman_urdu_cyber_abuse_dataset.csv")

MODEL_OUTPUT_DIR = os.path.join(BASE_DIR, "app", "resources", "models")
MODEL_OUTPUT_PATH = os.path.join(MODEL_OUTPUT_DIR, "cyberbullying_classifier.joblib")

# Targeting patterns to extract personal harassment from the broad aggressive dataset
TARGETING_PATTERNS = re.compile(
    r"\b(you|you're|youre|ur|u|yourself|yours|tu|tum|tera|teri|tere|tujhe|tumhara|tumhari|"
    r"whore|bitch|faggot|idiot|moron|loser|die|kill\s+yourself|pathetic|ugly|worthless|"
    r"shut\s+up|get\s+lost|nobody\s+likes\s+you|everyone\s+hates\s+you|fuck\s+you)\b",
    re.IGNORECASE
)

BENIGN_ENGLISH_SAMPLES = [
    "I really enjoyed this video, thanks for sharing!",
    "In my opinion, the presentation was clear and well organized.",
    "I disagree with the conclusion, but the argument was interesting.",
    "Could you provide more sources for that claim?",
    "Great work on the project everyone!",
    "This was very helpful and informative.",
    "I think the pacing of the video could be improved slightly.",
    "Thank you for taking the time to explain this concept.",
    "I appreciate your perspective, even though I see it differently.",
    "Interesting discussion, looking forward to the next update.",
    "The data in the second chart seems inconsistent with the first.",
    "Good explanation, keep up the good work!",
    "I have a different viewpoint regarding this topic.",
    "Nice explanation of the methodology.",
    "Thank you very much for this useful content.",
    "This helped me understand the topic much better.",
    "Well done team, excellent progress today.",
    "I respectfully disagree with that particular interpretation.",
    "The audio quality was very good throughout.",
    "Looking forward to reading more about this subject.",
    "Wishing you all the best in your exams.",
    "Happy birthday, hope you have a wonderful day!",
    "Congrats on your success! Keep shining.",
    "Nice work team, proud of you!",
    "Thanks for helping me yesterday!",
    "Great job on your project, well done!"
]

def clean_text(text: str) -> str:
    """Basic text normalization"""
    if not text:
        return ""
    return " ".join(text.strip().split())

def load_data(max_targeted_agg: int = 15000):
    """
    Load and combine datasets:
    - Cyberbullying dataset (1,000 samples: 500 bullying=1, 500 non-bullying=0)
    - Roman Urdu dataset (5,004 samples: 2,502 cyber abuse=1, 2,501 neutral=0)
    - Personally targeted aggressive comments from 3. Aggressive_All (1)
    - Benign conversational English samples (non-bullying=0)
    """
    texts = []
    labels = []

    print(f"\n1. Loading Cyberbullying Dataset from:\n   {CB_DATASET_PATH}")
    cb_b, cb_nb = 0, 0
    if os.path.exists(CB_DATASET_PATH):
        with open(CB_DATASET_PATH, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = clean_text(row.get("text", ""))
                label_str = row.get("label", "").strip().lower()
                if text and label_str in ("bullying", "non-bullying"):
                    texts.append(text)
                    if label_str == "bullying":
                        labels.append(1)
                        cb_b += 1
                    else:
                        labels.append(0)
                        cb_nb += 1
        print(f"   Loaded: Bullying(1)={cb_b}, Non-bullying(0)={cb_nb}")
    else:
        print(f"   WARNING: File not found at {CB_DATASET_PATH}")

    print(f"\n2. Loading Roman Urdu Dataset ('old data') from:\n   {RU_DATASET_PATH}")
    ru_h, ru_o = 0, 0
    if os.path.exists(RU_DATASET_PATH):
        with open(RU_DATASET_PATH, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                comment = clean_text(row.get("comment", ""))
                label_str = row.get("label", "").strip().upper()
                if comment and label_str in ("H", "O"):
                    texts.append(comment)
                    if label_str == "H":
                        labels.append(1)
                        ru_h += 1
                    else:
                        labels.append(0)
                        ru_o += 1
        print(f"   Loaded: Cyber Abuse(1)={ru_h}, Neutral(0)={ru_o}")
    else:
        print(f"   WARNING: File not found at {RU_DATASET_PATH}")

    print(f"\n3. Loading Personally Targeted Harassment from Aggressive All Dataset:\n   {AGG_DATASET_PATH}")
    agg_b = 0
    seen = set()
    if os.path.exists(AGG_DATASET_PATH):
        with open(AGG_DATASET_PATH, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            for row in reader:
                if len(row) >= 2:
                    msg = clean_text(row[1])
                    if msg and msg not in seen and len(msg) >= 6 and TARGETING_PATTERNS.search(msg):
                        seen.add(msg)
                        texts.append(msg)
                        labels.append(1)
                        agg_b += 1
                        if agg_b >= max_targeted_agg:
                            break
        print(f"   Loaded: Targeted Harassment/Bullying(1)={agg_b}")
    else:
        print(f"   WARNING: File not found at {AGG_DATASET_PATH}")

    # Add benign English samples
    print("\n4. Augmenting benign non-bullying English samples...")
    aug_count = 0
    for _ in range(60):
        for sample in BENIGN_ENGLISH_SAMPLES:
            texts.append(sample)
            labels.append(0)
            aug_count += 1
    print(f"   Added {aug_count} benign non-bullying samples.")

    return np.array(texts), np.array(labels)

def train_and_evaluate():
    print("=" * 70)
    print("CYBERBULLYING MODEL TRAINING (COMBINED DATASETS)")
    print("=" * 70)

    texts, labels = load_data(max_targeted_agg=15000)
    total_samples = len(texts)
    pos_count = int(np.sum(labels == 1))
    neg_count = int(np.sum(labels == 0))
    print(f"\nTotal combined samples: {total_samples}")
    print(f"  Class 1 (Cyberbullying):     {pos_count} ({pos_count/total_samples*100:.1f}%)")
    print(f"  Class 0 (Not Cyberbullying): {neg_count} ({neg_count/total_samples*100:.1f}%)")

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.20, random_state=42, stratify=labels
    )
    print(f"\nData Split:")
    print(f"  Training samples: {len(X_train)}")
    print(f"  Testing samples:  {len(X_test)}")

    # Multi-feature pipeline:
    print("\nBuilding Feature Pipeline (Word + Character n-grams)...")
    features = FeatureUnion([
        ('word_tfidf', TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 2),
            min_df=2,
            sublinear_tf=True,
            lowercase=True
        )),
        ('char_tfidf', TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(2, 5),
            min_df=3,
            sublinear_tf=True,
            lowercase=True
        ))
    ])

    classifier = LogisticRegression(
        C=2.5,
        max_iter=1000,
        solver='lbfgs',
        class_weight='balanced',
        random_state=42
    )

    pipeline = Pipeline([
        ('features', features),
        ('clf', classifier)
    ])

    print("\nRunning 5-Fold Stratified Cross-Validation on training data...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring='f1_macro')
    print(f"  CV Macro F1 Scores: {[round(s, 4) for s in cv_scores]}")
    print(f"  CV Macro F1 Mean:   {np.mean(cv_scores):.4f} (+/- {np.std(cv_scores):.4f})")

    print("\nFitting model on full training set...")
    pipeline.fit(X_train, y_train)

    print("\nEvaluating on Held-Out Test Set:")
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='binary')
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_test, y_pred, average='macro')
    cm = confusion_matrix(y_test, y_pred)

    print("-" * 50)
    print(f"Accuracy:                {accuracy * 100:.2f}%")
    print(f"Cyberbullying Precision: {precision * 100:.2f}%")
    print(f"Cyberbullying Recall:    {recall * 100:.2f}%")
    print(f"Cyberbullying F1-Score:  {f1 * 100:.2f}%")
    print(f"Macro F1-Score:          {macro_f1 * 100:.2f}%")
    print("-" * 50)
    print(f"\nConfusion Matrix (Rows=True, Cols=Pred):")
    print(f"   [[TN={cm[0][0]:4d}, FP={cm[0][1]:4d}],")
    print(f"    [FN={cm[1][0]:4d}, TP={cm[1][1]:4d}]]")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Not Cyberbullying (0)', 'Cyberbullying (1)'], digits=4))

    # Top indicative features
    feature_names = pipeline.named_steps['features'].get_feature_names_out()
    coefs = pipeline.named_steps['clf'].coef_[0]
    top_cb_idx = np.argsort(coefs)[-15:][::-1]
    top_clean_idx = np.argsort(coefs)[:15]

    print("\nTop 15 Indicative Cyberbullying Features:")
    for rank, idx in enumerate(top_cb_idx, 1):
        print(f"   {rank:2d}. {feature_names[idx]:<25} (coef: {coefs[idx]:+.4f})")

    print("\nTop 15 Indicative Non-Cyberbullying Features:")
    for rank, idx in enumerate(top_clean_idx, 1):
        print(f"   {rank:2d}. {feature_names[idx]:<25} (coef: {coefs[idx]:+.4f})")

    # Serialize trained model
    os.makedirs(MODEL_OUTPUT_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_OUTPUT_PATH, compress=3)
    file_size_mb = os.path.getsize(MODEL_OUTPUT_PATH) / (1024 * 1024)
    print(f"\nSerialized trained Cyberbullying model saved to:\n   {MODEL_OUTPUT_PATH}")
    print(f"   Model file size: {file_size_mb:.2f} MB")
    print("\n" + "=" * 70)
    print("CYBERBULLYING MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print("=" * 70)

    return pipeline

if __name__ == "__main__":
    train_and_evaluate()
