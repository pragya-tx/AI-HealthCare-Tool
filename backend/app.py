import os
import sys
import json
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv

# Add the prediction folder to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(CURRENT_DIR, "HAAHAHAHAHAHAH"))

try:
    from Prediction import get_prediction, load_models
except ImportError:
    # Handle direct import if HAAHAHAHAHAHAH is already in sys.path
    from HAAHAHAHAHAHAH.Prediction import get_prediction, load_models

from gemini_helper import get_gemini_analysis

load_dotenv()

app = Flask(__name__, 
            static_folder="../frontend/dist", 
            template_folder="../frontend/dist",
            static_url_path="")
app.secret_key = os.getenv("SECRET_KEY", "healthcare_secret_key_v1")
CORS(app, supports_credentials=True)

# Pre-load models to avoid delay on first request
print("🏥 Loading medical models... this may take a moment.")
load_models()
print("✅ Models loaded successfully.")

# --- HELPERS ---

def mock_user(email="user@example.com", name="Demo User"):
    return {
        "id": "123",
        "email": email,
        "name": name,
        "symptomHistory": [
            {
                "id": "h1",
                "symptoms": ["Headache", "Fever"],
                "timestamp": "2024-04-15T10:00:00Z"
            }
        ]
    }

# --- API ENDPOINTS ---

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "Welcome to the HealthCare+ Backend API",
        "endpoints": {
            "health": "/api/health",
            "predict": "/api/predict",
            "symptoms": "/api/symptoms",
            "login": "/api/login",
            "register": "/api/register"
        }
    })

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "HealthCare+ Backend is running"})

@app.route("/api/symptoms", methods=["GET"])
def get_symptoms():
    """Returns a list of all supported symptoms."""
    matrix_path = os.path.join(CURRENT_DIR, "symptom_ner", "disease_symptom_matrix.csv")
    if os.path.exists(matrix_path):
        import csv
        try:
            with open(matrix_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                headers = next(reader)
                symptoms = [s.replace("_", " ") for s in headers[1:]]
                return jsonify({"symptoms": symptoms})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"symptoms": []})

@app.route("/api/predict", methods=["POST"])
def predict():
    """Main prediction endpoint using the local ML/NER pipeline."""
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        results = get_prediction(data["text"])
        
        # Add Gemini Enrichment
        gemini_result = get_gemini_analysis(data["text"], results)
        
        return jsonify({
            "predictions": results,
            "analysis": gemini_result
        })
    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({"error": "Failed to process prediction", "details": str(e)}), 500

# --- MOCKED AUTH ENDPOINTS (DB removed) ---

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "")
    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400
    
    # Store minimal info in session
    session["user_email"] = email
    return jsonify({
        "success": True,
        "message": "Login successful (mocked)",
        "user": mock_user(email=email)
    })

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email", "")
    name = data.get("name", "New User")
    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400
    
    session["user_email"] = email
    return jsonify({
        "success": True,
        "message": "Registration successful (mocked)",
        "user": mock_user(email=email, name=name)
    })

@app.route("/api/me", methods=["GET"])
def me():
    email = session.get("user_email")
    if not email:
        return jsonify({"isAuthenticated": False}), 401
    return jsonify({
        "isAuthenticated": True,
        "user": mock_user(email=email)
    })

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out"})

# --- METRICS & CHAT PLACEHOLDERS ---

@app.route("/api/metrics", methods=["GET"])
def metrics():
    # Return dummy data as referenced in prototype
    return jsonify({
        "current": {"heart_rate": 72, "blood_pressure": "120/80", "sleep_hours": 7.5, "steps": 8240},
        "weekly": [
            {"day": "Mon", "heart_rate": 74, "steps": 7200},
            {"day": "Tue", "heart_rate": 72, "steps": 8100},
            {"day": "Wed", "heart_rate": 78, "steps": 9200},
            {"day": "Thu", "heart_rate": 80, "steps": 10500},
            {"day": "Fri", "heart_rate": 75, "steps": 7800},
            {"day": "Sat", "heart_rate": 71, "steps": 6500},
            {"day": "Sun", "heart_rate": 72, "steps": 8240},
        ]
    })

@app.route("/api/chat", methods=["POST"])
def chat():
    # Integrated chatbot that uses the prediction engine
    data = request.get_json()
    message = data.get("message", "")
    
    if not message:
        return jsonify({"reply": "How can I help you today?"})
    
    try:
        # Run ML prediction first to ground Gemini in local model data
        ml_predictions = get_prediction(message)
        
        # Use Gemini for a conversational and medically informed reply
        analysis = get_gemini_analysis(message, ml_predictions)
        
        if analysis:
            reply = analysis.get("explanation", "I've analyzed your symptoms.")
            if analysis.get("emergency_flag"):
                reply = f"⚠️ EMERGENCY DETECTED: {analysis.get('emergency_reason')}\n\n{reply}"
            
            # Append recommended actions
            if analysis.get("recommended_actions"):
                reply += "\n\nRecommended Actions:\n- " + "\n- ".join(analysis["recommended_actions"])
        else:
            # Fallback to ML-only response if Gemini fails
            if ml_predictions and len(ml_predictions) > 0:
                top = ml_predictions[0]
                reply = f"Based on symptoms, I found a possible match: {top['disease_name']} ({top['confidence_score']})."
            else:
                reply = "I'm listening. Please describe your symptoms in more detail so I can help you."
            
        return jsonify({
            "reply": reply,
            "analysis": analysis,
            "ml_predictions": ml_predictions[:2]
        })
    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({
            "reply": "I'm having a bit of trouble analyzing that right now.",
            "error": str(e)
        })

# --- FRONTEND SERVING ---

@app.errorhandler(404)
def not_found(e):
    # For SPA routing: serve index.html for any route not found by Flask
    return app.send_static_file('index.html')

@app.route("/")
def serve():
    return app.send_static_file('index.html')

if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", 5000)))
