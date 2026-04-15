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
    def __init__(self, model_name="gemma-3-27b-it"):
        self.model = genai.GenerativeModel(model_name)
        self.emergency_triggers = [
            "chest pain",
            "breathing difficulty",
            "difficulty breathing",
            "unconscious",
            "severe bleeding",
            "stroke symptoms",
            "heart attack",
            "shortness of breath",
            "coughing blood",
        ]

    # ------------------------------------------------------------------ #
    #  Response Validation (ported from validation.js)                     #
    # ------------------------------------------------------------------ #

    def _validate_response(self, data):
        """
        Validates the Gemini response has the required structure.
        Returns (is_valid, cleaned_data).
        """
        if not data or not isinstance(data, dict):
            return False, None

        # Ensure required arrays exist
        if not isinstance(data.get("conditions"), list):
            return False, None
        if not isinstance(data.get("emergency_flag"), bool):
            data["emergency_flag"] = False
        if not isinstance(data.get("recommended_actions"), list):
            data["recommended_actions"] = []
        if not isinstance(data.get("medications"), list):
            data["medications"] = []
        if not isinstance(data.get("precautions"), list):
            data["precautions"] = []
        if not isinstance(data.get("disclaimer"), str):
            data["disclaimer"] = "This is for informational purposes only. Always consult a healthcare professional."

        # Validate each condition has required fields
        valid_conditions = []
        for cond in data["conditions"]:
            if isinstance(cond, dict) and "name" in cond:
                cond.setdefault("probability", "N/A")
                cond.setdefault("severity", "low")
                cond.setdefault("explanation", "")
                valid_conditions.append(cond)
        data["conditions"] = valid_conditions

        # Build a top-level explanation from the top condition
        if data["conditions"]:
            top = data["conditions"][0]
            data["explanation"] = (
                f"Based on the analysis, the most likely condition is "
                f"{top['name']} ({top['probability']} confidence, "
                f"{top['severity']} severity). {top['explanation']}"
            )
        else:
            data["explanation"] = "The analysis could not identify a strong match for the reported symptoms."

        return True, data

    # ------------------------------------------------------------------ #
    #  Safety Rules (ported from rules.js + enhanced)                      #
    # ------------------------------------------------------------------ #

    def _apply_safety_rules(self, text, response):
        """Python implementation of safety grounding."""
        text_lower = text.lower()
        for trigger in self.emergency_triggers:
            if trigger in text_lower:
                response["emergency_flag"] = True
                if not response.get("emergency_reason"):
                    response["emergency_reason"] = f"Detected emergency trigger: {trigger}"
                actions = response.get("recommended_actions", [])
                if "Seek immediate medical attention" not in actions:
                    actions.insert(0, "Seek immediate medical attention")
                    response["recommended_actions"] = actions
                break
        return response

    # ------------------------------------------------------------------ #
    #  Structured Analysis (for /api/predict)                              #
    # ------------------------------------------------------------------ #

    def analyze_symptoms(self, symptoms_text, ml_predictions):
        """
        Uses Gemini to analyze symptoms alongside ML results.
        Returns a validated, structured JSON response.
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

PREDICTED CONDITIONS (RANKED):
{json.dumps(ml_predictions, indent=2)}

OUTPUT JSON SCHEMA:
{{
  "conditions": [
{{
      "name": "Condition Name",
      "probability": "percentage",
      "severity": "low | medium | high",
      "explanation": "Detailed medical explanation of why this condition matches the symptoms."
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

INSTRUCTIONS:
1. You MUST evaluate and return at least the Top 3 conditions provided in ML Predictions.
2. For each condition, provide a thorough explanation of WHY it is a match, specifically calling out which user symptoms map to it.
3. Use "confidence_score" from ML Predictions as probability.
4. Respect given "rank" order.
5. Assign severity (low/medium/high) based on condition risk.
6. Detect emergencies ONLY if symptoms explicitly indicate (e.g., chest pain, breathing issues, unconsciousness).
7. Do NOT invent medications unless clearly safe OTC.
8. Output ONLY valid JSON.
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    top_p=0.8,
                    max_output_tokens=1024,
                    response_mime_type="application/json",
                ),
            )

            # Parse and validate
            result = json.loads(response.text)
            is_valid, result = self._validate_response(result)

            if not is_valid:
                print("Gemini returned invalid response structure")
                return self._build_fallback(symptoms_text, ml_predictions)

            # Apply safety rules
            result = self._apply_safety_rules(symptoms_text, result)

            return result

        except json.JSONDecodeError as e:
            print(f"Gemini returned invalid JSON: {e}")
            return self._build_fallback(symptoms_text, ml_predictions)
        except Exception as e:
            print(f"Gemini Analysis Error: {e}")
            return self._build_fallback(symptoms_text, ml_predictions)

    # ------------------------------------------------------------------ #
    #  Conversational Chat Reply (for /api/chat)                           #
    # ------------------------------------------------------------------ #

    def generate_chat_reply(self, user_message, ml_predictions, structured_analysis=None):
        """
        Generates a natural, conversational reply for the chat interface.
        Uses ML predictions and optionally the structured analysis.
        """
        # Build context from ML predictions
        predictions_context = ""
        if ml_predictions and isinstance(ml_predictions, list):
            for pred in ml_predictions[:3]:
                predictions_context += (
                    f"- {pred.get('disease_name', 'Unknown')} "
                    f"({pred.get('confidence_score', 'N/A')} confidence)\n"
                )
                contribs = pred.get("symptom_contributions", [])
                if contribs:
                    positive = [c["symptom"] for c in contribs if c.get("direction") == "+"]
                    if positive:
                        predictions_context += f"  Contributing symptoms: {', '.join(positive)}\n"

        # Build context from Gemini structured analysis if available
        analysis_context = ""
        if structured_analysis:
            if structured_analysis.get("emergency_flag"):
                analysis_context += f"EMERGENCY: {structured_analysis.get('emergency_reason', 'Urgent symptoms detected')}\n"
            if structured_analysis.get("recommended_actions"):
                analysis_context += "Recommended actions: " + "; ".join(structured_analysis["recommended_actions"]) + "\n"
            if structured_analysis.get("medications"):
                med_names = [m.get("name", "") for m in structured_analysis["medications"] if isinstance(m, dict)]
                if med_names:
                    analysis_context += "Suggested medications: " + ", ".join(med_names) + "\n"

        prompt = f"""
You are a medical assistant explaining diagnosis results to a patient in simple, plain English.

You will be given a list of predicted conditions with confidence scores and symptom contributions.

Your job is to:
1. Explain what all of the top predicted conditions mean (not just the first one) in simple words a non-medical person can understand.
2. Tell the patient which condition is most likely and why, based on their symptoms.
3. Keep the tone direct and informative. No filler sentences.
4. Do NOT use medical jargon. Speak like a caring doctor talking to a nervous patient.
5. Do NOT mention confidence scores or boost scores directly — translate them into natural language like "most likely", "possibly", "unlikely".
6. If an emergency is flagged, lead with the emergency warning urgently.
7. Keep it concise but comprehensive.
8. Do NOT add generic closing remarks or reminders to see a doctor.

Do NOT output JSON. Output only a plain human-readable response.

USER MESSAGE:
"{user_message}"

ML PREDICTION RESULTS:
{predictions_context if predictions_context else "No strong symptom matches were found."}

{f"ANALYSIS CONTEXT:{chr(10)}{analysis_context}" if analysis_context else ""}

Write your response now:
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.5,
                    top_p=0.9,
                    max_output_tokens=512,
                ),
            )
            return response.text.strip()

        except Exception as e:
            print(f"Gemini Chat Error: {e}")
            # Fallback: build a reply from the structured data
            return self._build_fallback_chat(ml_predictions, structured_analysis)

    # ------------------------------------------------------------------ #
    #  Fallback Builders                                                   #
    # ------------------------------------------------------------------ #

    def _build_fallback(self, symptoms_text, ml_predictions):
        """
        Build a minimal valid response when Gemini fails entirely.
        Uses ML predictions directly so the frontend still has data.
        """
        conditions = []
        if isinstance(ml_predictions, list):
            for pred in ml_predictions[:3]:
                # Build explanation from symptom contributions
                contribs = pred.get("symptom_contributions", [])
                positive = [f"{c['symptom']} ({c['boost_score']})" for c in contribs if c.get("direction") == "+"]
                explanation = (
                    f"This condition was identified based on: {', '.join(positive)}."
                    if positive else "Identified by the ML prediction model."
                )

                confidence = pred.get("confidence_score", "0%")
                conf_value = float(confidence.replace("%", "")) if isinstance(confidence, str) else float(confidence)

                conditions.append({
                    "name": pred.get("disease_name", "Unknown"),
                    "probability": confidence,
                    "severity": "high" if conf_value > 70 else ("medium" if conf_value > 40 else "low"),
                    "explanation": explanation,
                })

        result = {
            "conditions": conditions,
            "emergency_flag": False,
            "emergency_reason": "",
            "recommended_actions": ["Consult a healthcare professional for proper evaluation."],
            "medications": [],
            "precautions": ["This analysis is based on ML predictions only (Gemini AI was unavailable)."],
            "disclaimer": "This is for informational purposes only. Always consult a healthcare professional.",
        }

        # Build top-level explanation
        if conditions:
            top = conditions[0]
            result["explanation"] = (
                f"Based on the analysis, the most likely condition is "
                f"{top['name']} ({top['probability']} confidence, "
                f"{top['severity']} severity). {top['explanation']}"
            )
        else:
            result["explanation"] = "Could not determine a condition from the provided symptoms."

        # Still apply safety rules
        result = self._apply_safety_rules(symptoms_text, result)

        return result

    def _build_fallback_chat(self, ml_predictions, structured_analysis):
        """Build a plain-text chat reply when Gemini chat call fails."""
        if structured_analysis and structured_analysis.get("explanation"):
            return structured_analysis["explanation"]

        if isinstance(ml_predictions, list) and ml_predictions:
            top = ml_predictions[0]
            return (
                f"Based on your symptoms, the most likely match is "
                f"{top.get('disease_name', 'an unidentified condition')} "
                f"with {top.get('confidence_score', 'unknown')} confidence. "
                f"I'd recommend consulting a healthcare professional for a proper evaluation."
            )

        return "I wasn't able to identify specific conditions from your description. Could you provide more details about your symptoms?"


# ── Singleton ────────────────────────────────────────────────────────────────
analyzer = GeminiAnalyzer()


def get_gemini_analysis(symptoms_text, ml_predictions):
    """Structured analysis for the /api/predict endpoint."""
    return analyzer.analyze_symptoms(symptoms_text, ml_predictions)


def get_gemini_chat_reply(user_message, ml_predictions, structured_analysis=None):
    """Conversational reply for the /api/chat endpoint."""
    return analyzer.generate_chat_reply(user_message, ml_predictions, structured_analysis)
