"""
Production End-to-End Test & Validation Suite for Research NLP Service
Phase 3 & Phase 6 Production Validation

Usage:
    python test_production_e2e.py [--url http://127.0.0.1:8001]
"""

import sys
import os
import time
import argparse
import httpx
from typing import Dict, Any

# Configure console encoding for Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def print_banner(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def test_health(base_url: str) -> Dict[str, Any]:
    print("\n[1/6] Testing /health and / endpoints...")
    
    # Test Root
    res_root = httpx.get(f"{base_url}/", timeout=10)
    assert res_root.status_code == 200, f"Root returned {res_root.status_code}"
    root_data = res_root.json()
    assert root_data.get("success") is True
    print(f"  ✅ GET /: status=200, service='{root_data.get('service')}', version='{root_data.get('version')}'")

    # Test Health
    res_health = httpx.get(f"{base_url}/health", timeout=10)
    assert res_health.status_code == 200, f"Health returned {res_health.status_code}"
    health_data = res_health.json()
    assert health_data.get("status") == "healthy"
    print(f"  ✅ GET /health: status='{health_data.get('status')}', models_ready={health_data.get('models_ready')}, device='{health_data.get('device', 'cpu')}'")
    
    return health_data


def test_documentation(base_url: str):
    print("\n[2/6] Testing API Documentation endpoints...")
    res_docs = httpx.get(f"{base_url}/docs", timeout=10)
    assert res_docs.status_code == 200, f"Docs returned {res_docs.status_code}"
    print("  ✅ GET /docs: Swagger UI accessible")

    res_openapi = httpx.get(f"{base_url}/openapi.json", timeout=10)
    assert res_openapi.status_code == 200
    schema = res_openapi.json()
    assert "/analyze" in schema.get("paths", {})
    assert "/health" in schema.get("paths", {})
    print("  ✅ GET /openapi.json: Valid OpenAPI schema with /analyze endpoint")


def wait_for_models(base_url: str, max_wait_sec: int = 180) -> bool:
    print(f"\n[3/6] Awaiting model readiness (max {max_wait_sec}s)...")
    start = time.time()
    while time.time() - start < max_wait_sec:
        try:
            res = httpx.get(f"{base_url}/health", timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("models_ready"):
                    elapsed = time.time() - start
                    print(f"  ✅ All models loaded and ready for inference ({elapsed:.1f}s)")
                    return True
                elif data.get("models_error"):
                    print(f"  ❌ Model loading failed: {data.get('models_error')}")
                    return False
        except Exception as e:
            print(f"  ... waiting for server: {e}")
        time.sleep(3)
        sys.stdout.write(".")
        sys.stdout.flush()
    print("\n  ⚠️ Model readiness timed out")
    return False


def test_analyze_inference(base_url: str):
    print("\n[4/6] Testing Live NLP Inference on /analyze...")
    
    test_cases = [
        {
            "name": "English Positive",
            "payload": {"text": "I really enjoyed this video, the presentation was insightful and well crafted!"},
            "expected_sentiment": "positive",
            "expected_cyberbullying": False
        },
        {
            "name": "English Negative Disagreement (Constructive)",
            "payload": {"text": "I disagree with this argument. In my opinion the conclusion is flawed."},
            "expected_cyberbullying": False
        },
        {
            "name": "English Aggressive Insult Attack",
            "payload": {"text": "You are a complete idiot, worthless loser and nobody likes you."},
            "expected_cyberbullying": True
        },
        {
            "name": "Roman Urdu Abusive Cyber Attack",
            "payload": {"text": "Aray bakwaas baatein mat kar lol faltu insan"},
            "expected_abusive_ru": True
        },
        {
            "name": "Roman Urdu Friendly Engagement",
            "payload": {"text": "Mashallah shukriya share karne ke liye bhai, bahut acha kaam kiya."},
            "expected_abusive_ru": False
        }
    ]

    for i, tc in enumerate(test_cases, 1):
        t0 = time.time()
        res = httpx.post(f"{base_url}/analyze", json=tc["payload"], timeout=30)
        dur = (time.time() - t0) * 1000

        assert res.status_code == 200, f"Case {tc['name']} failed with status {res.status_code}: {res.text}"
        data = res.json()

        # Validate structure
        assert data.get("success") is True
        assert "sentiment" in data
        assert "toxicity" in data
        assert "aggression" in data
        assert "cyberbullying" in data
        assert "roman_urdu" in data
        assert "request_id" in data

        sentiment = data["sentiment"]
        aggression = data["aggression"]
        cb = data["cyberbullying"]
        ru = data["roman_urdu"]

        print(f"  [{i}/{len(test_cases)}] {tc['name']} ({dur:.1f}ms):")
        print(f"      Sentiment: label={sentiment.get('label')}, score={sentiment.get('score'):.2f}")
        print(f"      Aggression: level={aggression.get('level')}, score={aggression.get('score')}, targeting={aggression.get('is_personally_targeted')}")
        print(f"      Cyberbullying: is_cb={cb.get('is_cyberbullying')}, classification='{cb.get('classification')}', severity={cb.get('severity')}")
        if ru:
            print(f"      Roman Urdu: is_abusive={ru.get('is_abusive')}, prob={ru.get('abuse_probability'):.3f}")

        # Assertions
        if "expected_sentiment" in tc:
            assert sentiment.get("label") == tc["expected_sentiment"], f"Expected {tc['expected_sentiment']}, got {sentiment.get('label')}"
        if "expected_cyberbullying" in tc:
            assert cb.get("is_cyberbullying") == tc["expected_cyberbullying"], f"Cyberbullying mismatch for {tc['name']}"
        if "expected_abusive_ru" in tc and ru:
            assert ru.get("is_abusive") == tc["expected_abusive_ru"], f"Roman Urdu abuse mismatch for {tc['name']}"

    print("  ✅ All inference test cases passed operational research validation")


def test_input_validation(base_url: str):
    print("\n[5/6] Testing Input Validation & Error Boundaries...")

    # 1. Empty string
    res1 = httpx.post(f"{base_url}/analyze", json={"text": ""}, timeout=5)
    assert res1.status_code in [400, 422], f"Expected 400/422 on empty string, got {res1.status_code}"
    print("  ✅ Empty text rejected with proper validation error (400/422)")

    # 2. Whitespace only
    res2 = httpx.post(f"{base_url}/analyze", json={"text": "   \n\t   "}, timeout=5)
    assert res2.status_code in [400, 422]
    print("  ✅ Whitespace-only rejected with proper validation error")

    # 3. Missing text field
    res3 = httpx.post(f"{base_url}/analyze", json={}, timeout=5)
    assert res3.status_code == 422
    print("  ✅ Missing field rejected with schema validation error (422)")

    # 4. Text exceeding max length
    res4 = httpx.post(f"{base_url}/analyze", json={"text": "a" * 5005}, timeout=5)
    assert res4.status_code == 422
    print("  ✅ Text exceeding 5000 chars rejected with 422")


def test_models_info(base_url: str):
    print("\n[6/6] Testing /models endpoint...")
    res = httpx.get(f"{base_url}/models", timeout=5)
    assert res.status_code == 200
    data = res.json()
    assert data.get("success") is True
    print(f"  ✅ GET /models returned status='{data.get('status')}'")
    if "models" in data:
        for name, info in data["models"].items():
            print(f"      - {name}: loaded={info.get('loaded')}, model={info.get('model')}")


def main():
    parser = argparse.ArgumentParser(description="NLP Production E2E Test Suite")
    parser.add_argument("--url", default="http://127.0.0.1:8001", help="Base URL of NLP service")
    parser.add_argument("--skip-wait", action="store_true", help="Skip waiting for models")
    args = parser.parse_args()

    print_banner(f"NLP Service Production Verification Suite ({args.url})")
    
    try:
        health_data = test_health(args.url)
        test_documentation(args.url)

        if not args.skip_wait and not health_data.get("models_ready"):
            ready = wait_for_models(args.url)
            if not ready:
                print("  ❌ Models not ready, aborting inference tests.")
                sys.exit(1)

        test_models_info(args.url)
        test_analyze_inference(args.url)
        test_input_validation(args.url)

        print_banner("🎉 ALL TESTS PASSED — NLP SERVICE IS PRODUCTION READY!")
    except Exception as e:
        print_banner(f"❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
