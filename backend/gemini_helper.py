import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class GeminiAnalyzer:
    def __init__(self, model_name="gemini-1.5-pro"):
        self.model = genai.GenerativeModel(model_name)
        self.emergency_triggers = [
            "chest pain",
            "breathing difficulty",
            "unconscious",
            "severe bleeding",
            "stroke symptoms",
            "heart attack"
        ]

    def analyze_symptoms(self, symptoms_text, ml_predictions):
        """
        Uses Gemini to analyze symptoms alongside ML results.
        """
        prompt = f"""
You are a medical assistant AI. Your task is to analyze user symptoms and ML-predicted conditions.

CONSTRAINTS:
- Do NOT make assumptions.
- Use only provided inputs.
- Clearly separate high-risk vs low-risk.
- Flag emergencies explicitly.
- Output ONLY valid JSON according to the schema below.

USER SYMPTOMS (RAW TEXT):
{symptoms_text}

ML PREDICTIONS (INTERNAL MODEL):
{json.dumps(ml_predictions, indent=2)}

OUTPUT JSON SCHEMA:
{{
  "conditions": [
    {{
      "name": "Condition Name",
      "probability": "percentage",
      "severity": "low | medium | high",
      "explanation": "Brief medical explanation of why this matches the symptoms."
    }}
  ],
  "emergency_flag": true/false,
  "emergency_reason": "Why this is an emergency (if true)",
  "recommended_actions": ["Action 1", "Action 2"],
  "medications": [
    {{
      "name": "Meds name",
      "type": "otc | consult_doctor",
      "note": "Safety warning or usage note"
    }}
  ],
  "precautions": ["Precaution 1"],
  "disclaimer": "Medical disclaimer"
}}
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    top_p=0.8,
                    max_output_tokens=1024,
                    response_mime_type="application/json",
                )
            )
            
            # Clean response text and parse JSON
            result = json.loads(response.text)
            
            # Apply safety rules (grounding)
            result = self._apply_safety_rules(symptoms_text, result)
            
            return result
        except Exception as e:
            print(f"Gemini Analysis Error: {e}")
            return None

    def _apply_safety_rules(self, text, response):
        """Python implementation of safety grounding from rules.js"""
        text_lower = text.lower()
        for trigger in self.emergency_triggers:
            if trigger in text_lower:
                response["emergency_flag"] = True
                if "emergency_reason" not in response or not response["emergency_reason"]:
                    response["emergency_reason"] = f"Detected emergency trigger: {trigger}"
                if "Seek immediate medical attention" not in response.get("recommended_actions", []):
                    actions = response.get("recommended_actions", [])
                    actions.insert(0, "Seek immediate medical attention")
                    response["recommended_actions"] = actions
                break
        return response

# Singleton instance
analyzer = GeminiAnalyzer()

def get_gemini_analysis(symptoms_text, ml_predictions):
    return analyzer.analyze_symptoms(symptoms_text, ml_predictions)
