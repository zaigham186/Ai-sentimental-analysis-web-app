"""
Health Check Endpoint Tests

Tests the /health endpoint to ensure service is running correctly.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint_exists():
    """Test that /health endpoint is accessible"""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_returns_json():
    """Test that /health returns JSON"""
    response = client.get("/health")
    assert response.headers["content-type"] == "application/json"


def test_health_success_flag():
    """Test that /health returns success: true"""
    response = client.get("/health")
    data = response.json()
    assert "success" in data
    assert data["success"] is True


def test_health_status():
    """Test that /health returns valid status"""
    response = client.get("/health")
    data = response.json()
    assert "status" in data
    assert data["status"] in ["healthy", "starting"]


def test_health_response_structure():
    """Test complete /health response structure for Phase 2"""
    response = client.get("/health")
    data = response.json()
    
    # Check all required Phase 2 fields
    assert "success" in data
    assert data["success"] is True
    assert "status" in data
    assert "models_ready" in data
