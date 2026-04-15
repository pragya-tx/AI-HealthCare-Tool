import requests
import time
import json

BASE_URL = "http://127.0.0.1:5000"

def test_health():
    print("\n[Testing Health Check]")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Status: {response.status_code}")
        print(f"Body: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_auth():
    print("\n[Testing Auth (Mocked)]")
    # Login
    response = requests.post(f"{BASE_URL}/api/login", json={"email": "test@example.com"})
    print(f"Login Response: {response.json()}")
    
    # Me
    s = requests.Session()
    s.post(f"{BASE_URL}/api/login", json={"email": "test@example.com"})
    response = s.get(f"{BASE_URL}/api/me")
    print(f"Me Response: {response.json()}")

def test_prediction():
    print("\n[Testing Prediction]")
    test_text = "I have a sharp pain in my chest and difficulty breathing."
    print(f"Sending text: {test_text}")
    try:
        response = requests.post(f"{BASE_URL}/api/predict", json={"text": test_text})
        print(f"Status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Wait a bit for server to start if run externally
    test_health()
    test_auth()
    test_prediction()
