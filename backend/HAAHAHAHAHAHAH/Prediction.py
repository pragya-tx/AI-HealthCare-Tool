import os
import json
import warnings
import sys

# Suppress library warnings and non-essential logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
warnings.filterwarnings("ignore")

# Ensure the current directory is in the path for imports
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

try:
    from model import DiseasePredictor
    from pipeline import SymptomPipeline
except ImportError:
    # Fallback if running from a different directory
    from HAAHAHAHAHAHAH.model import DiseasePredictor
    from HAAHAHAHAHAHAH.pipeline import SymptomPipeline

# Global instances for reuse
_predictor = None
_pipeline = None

def load_models():
    """Initializes and caches the models."""
    global _predictor, _pipeline
    if _predictor is None:
        _predictor = DiseasePredictor()
        ml_model_path = os.path.join(CURRENT_DIR, "..", "ML-Model", "model.joblib")
        _predictor.load(ml_model_path)
    
    if _pipeline is None:
        ner_path = os.path.join(CURRENT_DIR, "..", "symptom_ner", "models", "symptom_ner_best")
        _pipeline = SymptomPipeline(ner_model_path=ner_path)
    
    return _predictor, _pipeline

def get_prediction(text: str):
    """
    Processes the input text to extract symptoms and predict diseases.
    Returns a list of predictions in a clean format.
    """
    # Initialize components (load if not already loaded)
    predictor, pipe = load_models()
    
    
    # Extract symptoms (using tiered extraction to avoid interactive prompts)
    # We combine confirmed and ambiguous symptoms for the prediction
    extraction_results = pipe.extract_tiered(text)
    confirmed_symptoms = extraction_results.get("confirmed", [])
    ambiguous_symptoms = extraction_results.get("ambiguous", [])
    
    all_extracted = confirmed_symptoms + ambiguous_symptoms
    
    if not all_extracted:
        return {"status": "error", "message": "No symptoms could be identified."}
    
    # Extract matched symptom names for the model
    symptom_names = [s["matched_symptom"] for s in all_extracted]
    
    # Get predictions from the model
    raw_predictions = predictor.predict(symptom_names)
    
    formatted_results = []
    for rank, pred in enumerate(raw_predictions, start=1):
        # Build the full list of symptom contributions for this disease
        contributions_list = []
        for symptom, score in pred["symptom_contributions"].items():
            contributions_list.append({
                "symptom": symptom,
                "boost_score": f"{abs(score):.1%}",
                "direction": "+" if score >= 0 else "-"
            })
            
        formatted_results.append({
            "rank": rank,
            "disease_name": pred["disease"],
            "confidence_score": f"{pred['confidence']:.2%}",
            "symptom_contributions": contributions_list
        })
    
    return formatted_results

if __name__ == "__main__":
    # Single test case
    input_text = "I have a splitting headache and I feel like I might vomit. My stomach also hurts."
    
    try:
        results = get_prediction(input_text)
        # Output as JSON, sorted by keys as requested
        print(json.dumps(results, indent=4, sort_keys=True))
    except Exception as e:
        error_output = {"status": "error", "message": str(e)}
        print(json.dumps(error_output, indent=4, sort_keys=True))
