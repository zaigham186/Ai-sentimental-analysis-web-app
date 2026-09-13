"""
Roman Urdu Cyber Abuse Model Training Script
Trains a calibrated classifier on roman_urdu_cyber_abuse_dataset.csv (5,004 samples)
to classify Hostile/Abusive comments (H) vs Others/Neutral (O).
"""

import os
import sys
import csv
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

DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "roman_urdu_cyber_abuse_dataset.csv")
MODEL_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "app", "resources", "models")
MODEL_OUTPUT_PATH = os.path.join(MODEL_OUTPUT_DIR, "roman_urdu_classifier.joblib")

def clean_text(text: str) -> str:
    """Basic text normalization for Roman Urdu"""
    if not text:
        return ""
    # Normalize whitespace
    text = " ".join(text.strip().split())
    return text

def load_data(filepath: str):
    """Load dataset and return texts and binary labels (1 for H, 0 for O)"""
    texts = []
    labels = []
    
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            comment = clean_text(row.get("comment", ""))
            label_str = row.get("label", "").strip().upper()
            if comment and label_str in ("H", "O"):
                texts.append(comment)
                # 1 = Hostile/Abuse (H), 0 = Others/Neutral (O)
                labels.append(1 if label_str == "H" else 0)
                
    return np.array(texts), np.array(labels)

def train_and_evaluate():
    print("=" * 70)
    print("ROMAN URDU CYBER ABUSE MODEL TRAINING")
    print("=" * 70)
    
    print(f"\n1. Loading dataset from: {DATASET_PATH}")
    texts, labels = load_data(DATASET_PATH)
    total_samples = len(texts)
    h_count = np.sum(labels == 1)
    o_count = np.sum(labels == 0)
    print(f"   Total samples: {total_samples}")
    print(f"   Class H (Hostile/Abusive): {h_count} ({h_count/total_samples*100:.1f}%)")
    print(f"   Class O (Others/Neutral):  {o_count} ({o_count/total_samples*100:.1f}%)")
    
    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.20, random_state=42, stratify=labels
    )
    print(f"\n2. Data Split:")
    print(f"   Training samples:   {len(X_train)}")
    print(f"   Testing samples:    {len(X_test)}")
    
    # Multi-feature pipeline:
    # 1. Word n-grams (1-2) with sublinear TF scaling
    # 2. Character n-grams (2-5) within word boundaries to capture Roman Urdu spelling variations
    print("\n3. Building Feature Pipeline:")
    print("   - Word n-grams (1-2)")
    print("   - Character n-grams (2-5) with word boundaries")
    
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
    
    # Classifier: Regularized Logistic Regression with balanced class weights
    # Gives fast, well-calibrated posterior probabilities
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
    
    # 5-fold cross-validation on training data
    print("\n4. Running 5-Fold Stratified Cross-Validation on training data...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring='f1_macro')
    print(f"   CV Macro F1 Scores: {[round(s, 4) for s in cv_scores]}")
    print(f"   CV Macro F1 Mean:   {np.mean(cv_scores):.4f} (+/- {np.std(cv_scores):.4f})")
    
    # Fit on complete training set
    print("\n5. Fitting model on full training set...")
    pipeline.fit(X_train, y_train)
    
    # Evaluate on held-out test set
    print("\n6. Evaluating on Held-Out Test Set (1,001 samples):")
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='binary')
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_test, y_pred, average='macro')
    cm = confusion_matrix(y_test, y_pred)
    
    print("\n" + "-" * 50)
    print(f"Accuracy:        {accuracy * 100:.2f}%")
    print(f"Abuse Precision: {precision * 100:.2f}%")
    print(f"Abuse Recall:    {recall * 100:.2f}%")
    print(f"Abuse F1-Score:  {f1 * 100:.2f}%")
    print(f"Macro F1-Score:  {macro_f1 * 100:.2f}%")
    print("-" * 50)
    print("\nConfusion Matrix (Rows=True, Cols=Pred):")
    print(f"   [[TN={cm[0][0]:3d}, FP={cm[0][1]:3d}],")
    print(f"    [FN={cm[1][0]:3d}, TP={cm[1][1]:3d}]]")
    
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Others (O)', 'Hostile (H)'], digits=4))
    
    # Save model
    os.makedirs(MODEL_OUTPUT_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_OUTPUT_PATH, compress=3)
    print(f"7. Serialized trained model saved to:\n   {MODEL_OUTPUT_PATH}")
    file_size_mb = os.path.getsize(MODEL_OUTPUT_PATH) / (1024 * 1024)
    print(f"   Model file size: {file_size_mb:.2f} MB")
    
    # Extract top abusive n-grams/features
    feature_names = pipeline.named_steps['features'].get_feature_names_out()
    coefs = pipeline.named_steps['clf'].coef_[0]
    top_abuse_idx = np.argsort(coefs)[-30:][::-1]
    top_friendly_idx = np.argsort(coefs)[:30]
    
    print("\n8. Top 15 Indicative Hostile/Abusive Features (H):")
    for rank, idx in enumerate(top_abuse_idx[:15], 1):
        print(f"   {rank:2d}. {feature_names[idx]:<25} (coef: {coefs[idx]:+.4f})")
        
    print("\nTop 15 Indicative Friendly/Neutral Features (O):")
    for rank, idx in enumerate(top_friendly_idx[:15], 1):
        print(f"   {rank:2d}. {feature_names[idx]:<25} (coef: {coefs[idx]:+.4f})")
        
    print("\n" + "=" * 70)
    print("TRAINING COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    
    return pipeline

if __name__ == "__main__":
    train_and_evaluate()
