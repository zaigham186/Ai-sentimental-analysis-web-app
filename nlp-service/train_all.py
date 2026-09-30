"""
Master Model Training Script
Trains all specialized classifiers:
1. Roman Urdu Cyber Abuse Classifier
2. Aggression Classifier (combining 3. Aggressive_All, Cyberbullying, and Roman Urdu datasets)
3. Cyberbullying Classifier (combining Cyberbullying, Roman Urdu, and targeted Aggressive datasets)
"""

import sys
import time

# Ensure UTF-8 output encoding for emojis on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from train_roman_urdu import train_and_evaluate as train_roman_urdu
from train_aggression import train_and_evaluate as train_aggression
from train_cyberbullying import train_and_evaluate as train_cyberbullying

def main():
    total_start = time.time()
    print("=" * 80)
    print("NLP SERVICE - FULL RETRAINING SUITE")
    print("=" * 80)

    print("\n>>> PHASE 1: Training Roman Urdu Model...")
    t0 = time.time()
    train_roman_urdu()
    print(f"Phase 1 completed in {time.time() - t0:.2f}s\n")

    print("\n>>> PHASE 2: Training Aggression Model...")
    t1 = time.time()
    train_aggression()
    print(f"Phase 2 completed in {time.time() - t1:.2f}s\n")

    print("\n>>> PHASE 3: Training Cyberbullying Model...")
    t2 = time.time()
    train_cyberbullying()
    print(f"Phase 3 completed in {time.time() - t2:.2f}s\n")

    print("=" * 80)
    print(f"ALL MODELS TRAINED & SERIALIZED SUCCESSFULLY in {time.time() - total_start:.2f}s! 🎉")
    print("=" * 80)

if __name__ == "__main__":
    main()
