"""
Comprehensive Analysis Endpoint Tests - PHASE 2 IMPLEMENTATION

Integration tests for POST /analyze endpoint with real NLP models.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ============================================================================
# INFRASTRUCTURE TESTS (from Phase 1 - still valid)
# ============================================================================

def test_root_endpoint():
    """Test root endpoint returns service info"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "service" in data
    assert "version" in data
    assert data["version"] == "2.0.0"  # Phase 2 version


def test_health_endpoint():
    """Test health endpoint returns model status"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "status" in data
    assert "models_ready" in data


def test_models_endpoint():
    """Test models info endpoint"""
    response = client.get("/models")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Should have status information
    assert "status" in data
    
    # If models are loaded, check structure
    if "models" in data:
        models_info = data["models"]
        assert "sentiment" in models_info
        assert "toxicity" in models_info
        assert "aggression" in models_info
        assert "cyberbullying" in models_info


def test_swagger_docs_available():
    """Test that Swagger documentation is accessible"""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_openapi_schema_available():
    """Test that OpenAPI schema is accessible"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert "info" in data
    assert "paths" in data
    
    # Phase 2 should have /analyze endpoint in schema
    assert "/analyze" in data["paths"]
    assert "post" in data["paths"]["/analyze"]


# ============================================================================
# ANALYSIS ENDPOINT TESTS - PHASE 2
# ============================================================================

def test_analyze_endpoint_exists():
    """Test that /analyze endpoint is accessible"""
    # Even if models not loaded, endpoint should exist (may return 503)
    response = client.post("/analyze", json={"text": "test"})
    assert response.status_code in [200, 503]  # 200 if loaded, 503 if not ready


def test_analyze_valid_request():
    """Test analysis with valid request"""
    request_data = {
        "text": "This is a sample text for analysis testing."
    }
    
    response = client.post("/analyze", json=request_data)
    
    # If models loaded, should succeed
    if response.status_code == 200:
        data = response.json()
        
        # Check top-level structure
        assert data["success"] is True
        assert "request_id" in data
        assert "text_metadata" in data
        assert "sentiment" in data
        assert "toxicity" in data
        assert "metadata" in data
        
        # Check text metadata
        assert "character_count" in data["text_metadata"]
        assert "word_count" in data["text_metadata"]
        assert data["text_metadata"]["character_count"] > 0
        assert data["text_metadata"]["word_count"] > 0
        
        # Check sentiment result
        sentiment = data["sentiment"]
        assert "label" in sentiment
        assert "score" in sentiment
        assert "probabilities" in sentiment
        assert sentiment["label"] in ["negative", "neutral", "positive"]
        assert 0.0 <= sentiment["score"] <= 1.0
        
        # Check toxicity result
        toxicity = data["toxicity"]
        assert "overall_score" in toxicity
        assert "is_toxic" in toxicity
        assert "categories" in toxicity
        assert "threshold" in toxicity
        assert 0.0 <= toxicity["overall_score"] <= 1.0
        assert isinstance(toxicity["is_toxic"], bool)
        
        # Check metadata
        metadata = data["metadata"]
        assert "request_id" in metadata
        assert "processing_time_ms" in metadata
        assert "models" in metadata
        assert "device" in metadata
        assert metadata["processing_time_ms"] > 0
    
    elif response.status_code == 503:
        # Models not ready yet - acceptable during startup
        data = response.json()
        assert "detail" in data or "error" in data.get("detail", {})


def test_analyze_empty_text():
    """Test error handling for empty text"""
    response = client.post("/analyze", json={"text": ""})
    
    # Should return 400 or 422 (validation error)
    assert response.status_code in [400, 422]


def test_analyze_whitespace_only():
    """Test error handling for whitespace-only text"""
    response = client.post("/analyze", json={"text": "   \t\n   "})
    
    # Should return 400 or 422 (validation error)
    assert response.status_code in [400, 422]


def test_analyze_missing_text_field():
    """Test error handling when text field is missing"""
    response = client.post("/analyze", json={})
    
    # Should return 422 (Pydantic validation error)
    assert response.status_code == 422


def test_analyze_too_long_text():
    """Test error handling for text exceeding max length"""
    # Create text longer than MAX_TEXT_LENGTH (5000)
    long_text = "a" * 5001
    
    response = client.post("/analyze", json={"text": long_text})
    
    # Should return 422 (Pydantic validation error)
    assert response.status_code == 422


def test_analyze_with_context():
    """Test analysis with optional context"""
    request_data = {
        "text": "This is a test with context.",
        "context": {
            "videoTopic": "Social Media",
            "videoOrder": 1,
            "condition": "anonymous"
        }
    }
    
    response = client.post("/analyze", json=request_data)
    
    # Should accept context (even if not used in Phase 2)
    assert response.status_code in [200, 503]
    
    if response.status_code == 200:
        data = response.json()
        assert data["success"] is True


def test_analyze_positive_sentiment():
    """Test analysis of clearly positive text"""
    request_data = {
        "text": "I absolutely love this! It's wonderful and amazing!"
    }
    
    response = client.post("/analyze", json=request_data)
    
    if response.status_code == 200:
        data = response.json()
        # Don't assert specific sentiment label (model-dependent)
        # Just verify structure is correct
        assert "sentiment" in data
        assert data["sentiment"]["label"] in ["negative", "neutral", "positive"]
        assert 0.0 <= data["sentiment"]["score"] <= 1.0


def test_analyze_negative_sentiment():
    """Test analysis of clearly negative text"""
    request_data = {
        "text": "This is terrible! I hate it so much. Awful experience."
    }
    
    response = client.post("/analyze", json=request_data)
    
    if response.status_code == 200:
        data = response.json()
        assert "sentiment" in data
        assert data["sentiment"]["label"] in ["negative", "neutral", "positive"]


def test_analyze_neutral_text():
    """Test analysis of neutral text"""
    request_data = {
        "text": "The meeting is scheduled for 3 PM tomorrow in room 204."
    }
    
    response = client.post("/analyze", json=request_data)
    
    if response.status_code == 200:
        data = response.json()
        assert "sentiment" in data
        assert "toxicity" in data


def test_analyze_response_has_unique_request_ids():
    """Test that each request gets a unique request ID"""
    request_data = {"text": "Test message for request ID"}
    
    response1 = client.post("/analyze", json=request_data)
    response2 = client.post("/analyze", json=request_data)
    
    if response1.status_code == 200 and response2.status_code == 200:
        data1 = response1.json()
        data2 = response2.json()
        
        # Request IDs should be different
        assert data1["request_id"] != data2["request_id"]


def test_analyze_multilingual_english():
    """Test analysis on English text"""
    request_data = {
        "text": "This product exceeded my expectations and delivered great value!"
    }
    
    response = client.post("/analyze", json=request_data)
    
    if response.status_code == 200:
        data = response.json()
        assert data["success"] is True
        assert "sentiment" in data
        assert "toxicity" in data


def test_analyze_processing_time_reasonable():
    """Test that processing time is reasonable"""
    request_data = {"text": "Quick test message"}
    
    response = client.post("/analyze", json=request_data)
    
    if response.status_code == 200:
        data = response.json()
        processing_time = data["metadata"]["processing_time_ms"]
        
        # Processing should take less than 10 seconds (10000ms)
        # Even on CPU, inference should be faster than this
        assert processing_time < 10000, f"Processing took {processing_time}ms, which is too long"


def test_analyze_invalid_json():
    """Test error handling for invalid JSON"""
    response = client.post(
        "/analyze",
        data="not valid json",
        headers={"Content-Type": "application/json"}
    )
    
    # Should return 422 (validation error)
    assert response.status_code == 422


# ============================================================================
# PHASE 3 INTEGRATION TESTS
# ============================================================================

def test_analyze_includes_aggression_and_cyberbullying():
    """Test that POST /analyze returns aggression and cyberbullying dimensions"""
    response = client.post("/analyze", json={"text": "I enjoyed watching this presentation."})
    
    if response.status_code == 200:
        data = response.json()
        assert "aggression" in data
        assert "cyberbullying" in data
        
        aggression = data["aggression"]
        assert "score" in aggression
        assert "level" in aggression
        assert "matched_indicators" in aggression
        assert "evidence" in aggression
        assert "method" in aggression
        
        cb = data["cyberbullying"]
        assert "classification" in cb
        assert "is_cyberbullying" in cb
        assert "reason_codes" in cb
        assert "limitations" in cb


def test_analyze_aggressive_cyberbullying_example():
    """Test that aggressive personally targeted content is flagged in /analyze"""
    response = client.post("/analyze", json={"text": "You are a complete idiot and worthless."})
    
    if response.status_code == 200:
        data = response.json()
        aggression = data["aggression"]
        assert aggression["is_aggressive"] is True
        assert aggression["is_personally_targeted"] is True
        
        cb = data["cyberbullying"]
        assert cb["is_cyberbullying"] is True
        assert cb["classification"] == "cyberbullying"
        assert "PERSONAL_TARGETING_DETECTED" in cb["reason_codes"]


def test_analyze_roman_urdu_dimension():
    """Test that POST /analyze returns roman_urdu dimension when models ready"""
    response = client.post("/analyze", json={"text": "Aray bakwaas baatein mat kar lol"})
    
    if response.status_code == 200:
        data = response.json()
        assert "roman_urdu" in data
        ru = data["roman_urdu"]
        if ru:
            assert "is_abusive" in ru
            assert "abuse_probability" in ru
            assert "label" in ru

