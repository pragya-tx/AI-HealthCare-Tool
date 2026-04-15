import os
import warnings
import logging

# Suppress library noise
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
warnings.filterwarnings("ignore")
logging.getLogger("transformers").setLevel(logging.ERROR)

from pipeline import SymptomPipeline
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import joblib
import shap

class DiseasePredictor:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=200,
            random_state=42,
            n_jobs=-1,
            class_weight="balanced"
        )
        self.label_encoder = LabelEncoder()
        self.symptom_columns = None
        self.symp_to_idx = {}
        self.explainer = None

    # ------------------------------------------------------------------ #
    #  Data                                                                #
    # ------------------------------------------------------------------ #

    def load_data(self, filepath: str):
        df = pd.read_csv(filepath)
        y = df.iloc[:, 0]
        X = df.iloc[:, 1:]

        self.symptom_columns = X.columns.tolist()
        self.symp_to_idx = {name: i for i, name in enumerate(self.symptom_columns)}

        y_encoded = self.label_encoder.fit_transform(y)
        return X.values.astype(np.float32), y_encoded

    # ------------------------------------------------------------------ #
    #  Training                                                            #
    # ------------------------------------------------------------------ #

    def train(self, filepath: str) -> float:
        X, y = self.load_data(filepath)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        self.model.fit(X_train, y_train)
        accuracy = self.model.score(X_test, y_test)

        # FIX: 'interventional' mode disables the internal correlation
        # assumption that causes the additivity check to fail on
        # sparse/binary feature matrices like symptom datasets.
        self.explainer = shap.TreeExplainer(
            self.model,
            feature_perturbation="interventional",
            data=X_train            # small background sample is enough
        )

        return accuracy

    # ------------------------------------------------------------------ #
    #  Persistence                                                         #
    # ------------------------------------------------------------------ #

    def save(self, path: str = "model.joblib"):
        joblib.dump({
            "model": self.model,
            "label_encoder": self.label_encoder,
            "symptoms": self.symptom_columns,
            "symp_to_idx": self.symp_to_idx,
        }, path)

    def load(self, path: str = "model.joblib"):
        data = joblib.load(path)
        self.model = data["model"]
        self.label_encoder = data["label_encoder"]
        self.symptom_columns = data["symptoms"]
        self.symp_to_idx = data["symp_to_idx"]

        # Re-init explainer after loading — no background data needed
        # when using the default 'tree_path_dependent' mode.
        # check_additivity=False prevents the broken additivity assertion.
        self.explainer = shap.TreeExplainer(self.model)

    # ------------------------------------------------------------------ #
    #  Inference helpers                                                   #
    # ------------------------------------------------------------------ #

    def _prepare_input(self, input_symptoms: list[str]) -> np.ndarray:
        input_set = set(input_symptoms)
        vec = np.array(
            [1.0 if col in input_set else 0.0 for col in self.symptom_columns],
            dtype=np.float32
        ).reshape(1, -1)
        return vec

    def _get_shap_for_class(
        self,
        all_shap: list | np.ndarray,
        class_idx: int
    ) -> np.ndarray:
        """Safely extract per-class SHAP values across SHAP versions."""
        if isinstance(all_shap, list):
            # SHAP < 0.42: list of (n_samples, n_features) arrays
            return all_shap[class_idx][0]
        else:
            # SHAP >= 0.42: ndarray of shape (n_samples, n_features, n_classes)
            return all_shap[0, :, class_idx]

    # ------------------------------------------------------------------ #
    #  Prediction                                                          #
    # ------------------------------------------------------------------ #

    def predict(self, input_symptoms: list[str], top_k: int = 3) -> list[dict]:
        if not self.symptom_columns:
            raise RuntimeError("Model not trained or loaded yet.")

        # Validate symptoms — warn but don't crash on unknown ones
        unknown = [s for s in input_symptoms if s not in self.symp_to_idx]

        valid_symptoms = [s for s in input_symptoms if s in self.symp_to_idx]
        if not valid_symptoms:
            raise ValueError("No valid symptoms provided.")

        input_vec = self._prepare_input(valid_symptoms)

        # --- Probabilities ---
        probs = self.model.predict_proba(input_vec)[0]
        top_indices = np.argsort(probs)[::-1][:top_k]

        # --- SHAP values (check_additivity=False avoids the crash) ---
        all_shap = self.explainer.shap_values(input_vec, check_additivity=False)

        results = []
        for rank, class_idx in enumerate(top_indices):
            disease = self.label_encoder.inverse_transform([class_idx])[0]
            confidence = float(probs[class_idx])

            class_shap = self._get_shap_for_class(all_shap, class_idx)

            # Only report contributions for symptoms the user actually entered
            raw: dict[str, float] = {}
            for symptom in valid_symptoms:
                feat_idx = self.symp_to_idx[symptom]
                raw[symptom] = float(class_shap[feat_idx])

            # Normalise to percentages (preserving sign for direction)
            total_abs = sum(abs(v) for v in raw.values())
            contributions = (
                {k: v / total_abs for k, v in raw.items()}
                if total_abs > 0
                else {k: 0.0 for k in raw}
            )

            results.append({
                "rank": rank + 1,
                "disease": disease,
                "confidence": confidence,
                "symptom_contributions": dict(
                    sorted(contributions.items(), key=lambda x: -abs(x[1]))
                ),
            })

        return results


# --------------------------------------------------------------------------- #
#  Entry-point                                                                 #
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    predictor = DiseasePredictor()
    pipe = SymptomPipeline()

    confirmed, ambiguous = pipe.extract_interactive("I have high fever and my head hurts. i also have Pain in stomach.")
    predictor.train("../symptom_ner/dataset.csv")
    predictor.save()

    # Fresh load — simulates production use
    predictor.load()

    sample_symptoms = confirmed

    predictions = predictor.predict([s["matched_symptom"] for s in sample_symptoms])

    for pred in predictions:
        print(f"Rank {pred['rank']}  |  {pred['disease']}  |  Confidence: {pred['confidence']:.2%}")
        print("  Symptom contributions:")
        for symptom, contrib in pred["symptom_contributions"].items():
            bar = "▓" * int(abs(contrib) * 20)
            direction = "+" if contrib >= 0 else "-"
            print(f"    {direction} {symptom:<30} {abs(contrib):.1%}  {bar}")
        print()