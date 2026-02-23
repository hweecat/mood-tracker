from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "mindful-track-api"}

def test_read_moods_unauthenticated():
    # Since we haven't implemented full auth yet, this should work with our demo user
    response = client.get("/api/v1/moods/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
