"""
Phase 2 Runtime Verification Script
This script performs ACTUAL runtime verification of the NLP service.
NO ASSUMPTIONS - ONLY REAL EXECUTION.
"""

import sys
import os
import json
import time

print("=" * 80)
print("PHASE 2 RUNTIME VERIFICATION")
print("=" * 80)

# ==============================================================================
# 1. VERIFY ENVIRONMENT
# ==============================================================================
print("\n1. ENVIRONMENT VERIFICATION")
print("-" * 80)

print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")

# Check required packages
required_packages = [
    'torch',
    'transformers',
    'detoxify',
    'fastapi',
    'uvicorn',
    'pydantic'
]

print("\nChecking installed packages:")
for package in required_packages:
    try:
        module = __import__(package)
        version = getattr(module, '__version__', 'unknown')
        print(f"  ✅ {package}: {version}")
    except ImportError as e:
        print(f"  ❌ {package}: NOT INSTALLED")
        sys.exit(1)

# ==============================================================================
# 2. VERIFY SENTIMENT MODEL
# ==============================================================================
print("\n2. SENTIMENT MODEL VERIFICATION")
print("-" * 80)

try:
    from app.services.sentiment import SentimentAnalyzer
    
    print("Creating SentimentAnalyzer...")
    sentiment_analyzer = SentimentAnalyzer()
    
    print(f"  Model name: {sentiment_analyzer.model_name}")
    print(f"  Device: {sentiment_analyzer.device}")
    
    print("Loading model...")
    load_start = time.time()
    load_success = sentiment_analyzer.load()
    load_time = time.time() - load_start
    
    if load_success:
        print(f"  ✅ MODEL LOAD: PASS ({load_time:.2f}s)")
    else:
        print(f"  ❌ MODEL LOAD: FAIL")
        sys.exit(1)
    
    # Test inference
    print("Testing inference...")
    test_texts = [
        "I really enjoyed this video. It was very informative.",
        "I did not like this video. I found it boring.",
        "The video discusses online communication."
    ]
    
    inference_results = []
    for i, text in enumerate(test_texts, 1):
        try:
            inference_start = time.time()
            result = sentiment_analyzer.analyze(text)
            inference_time = time.time() - inference_start
            
            # Validate result structure
            assert 'label' in result, "Missing 'label'"
            assert 'score' in result, "Missing 'score'"
            assert 'probabilities' in result, "Missing 'probabilities'"
            assert result['label'] in ['negative', 'neutral', 'positive'], f"Invalid label: {result['label']}"
            assert 0.0 <= result['score'] <= 1.0, f"Invalid score: {result['score']}"
            
            # Validate probabilities
            prob_sum = sum(result['probabilities'].values())
            assert 0.99 <= prob_sum <= 1.01, f"Probabilities don't sum to 1: {prob_sum}"
            
            print(f"  Test {i}: label={result['label']}, score={result['score']:.4f}, time={inference_time*1000:.2f}ms")
            inference_results.append(result)
            
        except Exception as e:
            print(f"  ❌ INFERENCE FAIL: {str(e)}")
            sys.exit(1)
    
    print(f"  ✅ INFERENCE: PASS ({len(test_texts)} tests)")
    
except Exception as e:
    print(f"❌ SENTIMENT MODEL FAILED: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ==============================================================================
# 3. VERIFY TOXICITY MODEL
# ==============================================================================
print("\n3. TOXICITY MODEL VERIFICATION")
print("-" * 80)

try:
    from app.services.toxicity import ToxicityAnalyzer
    
    print("Creating ToxicityAnalyzer...")
    toxicity_analyzer = ToxicityAnalyzer()
    
    print(f"  Model name: {toxicity_analyzer.model_name}")
    print(f"  Threshold: {toxicity_analyzer.threshold}")
    
    print("Loading model...")
    load_start = time.time()
    load_success = toxicity_analyzer.load()
    load_time = time.time() - load_start
    
    if load_success:
        print(f"  ✅ MODEL LOAD: PASS ({load_time:.2f}s)")
    else:
        print(f"  ❌ MODEL LOAD: FAIL")
        sys.exit(1)
    
    # Test inference
    print("Testing inference...")
    test_texts = [
        "Have a great day! Hope you enjoy.",
        "I disagree with your opinion.",
        "You're wrong about this topic."  # Controlled example
    ]
    
    expected_categories = {'toxicity', 'severe_toxicity', 'obscene', 'threat', 'insult', 'identity_attack'}
    
    for i, text in enumerate(test_texts, 1):
        try:
            inference_start = time.time()
            result = toxicity_analyzer.analyze(text)
            inference_time = time.time() - inference_start
            
            # Validate result structure
            assert 'overall_score' in result, "Missing 'overall_score'"
            assert 'is_toxic' in result, "Missing 'is_toxic'"
            assert 'categories' in result, "Missing 'categories'"
            assert 'threshold' in result, "Missing 'threshold'"
            
            assert 0.0 <= result['overall_score'] <= 1.0, f"Invalid overall_score: {result['overall_score']}"
            assert isinstance(result['is_toxic'], bool), "is_toxic must be boolean"
            
            # Validate categories
            actual_categories = set(result['categories'].keys())
            assert actual_categories == expected_categories, f"Missing categories: {expected_categories - actual_categories}"
            
            for cat, score in result['categories'].items():
                assert 0.0 <= score <= 1.0, f"Invalid score for {cat}: {score}"
            
            print(f"  Test {i}: toxic={result['is_toxic']}, score={result['overall_score']:.4f}, time={inference_time*1000:.2f}ms")
            
        except Exception as e:
            print(f"  ❌ INFERENCE FAIL: {str(e)}")
            sys.exit(1)
    
    print(f"  ✅ INFERENCE: PASS ({len(test_texts)} tests)")
    
except Exception as e:
    print(f"❌ TOXICITY MODEL FAILED: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ==============================================================================
# 4. VERIFY UNIFIED ANALYZER
# ==============================================================================
print("\n4. UNIFIED ANALYZER VERIFICATION")
print("-" * 80)

try:
    from app.services.analyzer import UnifiedAnalyzer
    
    print("Creating UnifiedAnalyzer...")
    analyzer = UnifiedAnalyzer()
    
    print("Loading all models...")
    load_results = analyzer.load_models()
    
    print(f"  Sentiment: {'✅ LOADED' if load_results['sentiment'] else '❌ FAILED'}")
    print(f"  Toxicity: {'✅ LOADED' if load_results['toxicity'] else '❌ FAILED'}")
    
    if not analyzer.is_ready:
        print("  ❌ ANALYZER NOT READY")
        sys.exit(1)
    
    # Test full analysis
    print("\nTesting full analysis...")
    test_text = "This is a wonderful day and I'm very happy!"
    
    result = analyzer.analyze(test_text)
    
    # Validate structure
    assert 'request_id' in result
    assert 'text_metadata' in result
    assert 'sentiment' in result
    assert 'toxicity' in result
    assert 'metadata' in result
    
    print(f"  ✅ Request ID: {result['request_id']}")
    print(f"  ✅ Processing time: {result['metadata']['processing_time_ms']:.2f}ms")
    print(f"  ✅ Sentiment: {result['sentiment']['label']}")
    print(f"  ✅ Toxicity: {result['toxicity']['is_toxic']}")
    
except Exception as e:
    print(f"❌ UNIFIED ANALYZER FAILED: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ==============================================================================
# FINAL SUMMARY
# ==============================================================================
print("\n" + "=" * 80)
print("VERIFICATION COMPLETE")
print("=" * 80)
print("✅ Environment: PASS")
print("✅ Sentiment Model: PASS")
print("✅ Toxicity Model: PASS")
print("✅ Unified Analyzer: PASS")
print("\n🟢 PHASE 2 RUNTIME VERIFICATION: SUCCESS")
print("=" * 80)
