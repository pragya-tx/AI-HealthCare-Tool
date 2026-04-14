# 🩺 Clinical Symptom Extraction Pipeline

A two-stage machine learning pipeline designed to automatically extract medical symptoms from raw patient text and seamlessly map them to a standardized medical vocabulary.

---

## 🌟 How It Works

The pipeline operates in two powerful stages to ensure high accuracy and clean data:

### **Stage 1: Symptom Extraction (spaCy NER)**
- Reads the raw patient text (e.g., *"I have severe chest pain and my neck is stiff"*).
- Detects and extracts the exact phrases related to symptoms using a custom-trained **spaCy** Named Entity Recognition (NER) model.

### **Stage 2: Standardization (BioBERT)**
- Takes the extracted phrases and matches them to a standard, predefined medical vocabulary (`symptoms_vocab.json`).
- Uses **BioBERT** (a medical language model via `sentence-transformers`) to calculate how closely the extracted phrase matches the official symptom name.
- Categorizes the results into three tiers based on similarity:
  - ✅ **Confirmed** (Score $\ge$ 0.72): Automatically accepted and stored.
  - ⚠️ **Ambiguous** (Score 0.45 - 0.71): Unsure matches that can be presented to a human for Yes/No confirmation.
  - ❌ **Rejected** (Score < 0.45): Automatically discarded as an incorrect extraction.

---

## 🚀 Getting Started

### 1. Prerequisites
First, install the necessary dependencies from the `requirements.txt` file. We have ensured these versions are stable and won't conflict.

```bash
pip install -r requirements.txt
```

*(This will install PyTorch, Transformers, Sentence-Transformers, and spaCy automatically).*

### 2. Project Structure
- `pipeline.py`: The core code containing the `SymptomPipeline` class.
- `evaluate_pipeline.py`: A script to test and evaluate the pipeline against built-in test cases.
- `extract_vocab.py`: A helper script for updating the medical vocabulary (`symptoms_vocab.json`) from a CSV source.
- `models/symptom_ner_best/`: The saved, custom-trained spaCy NER model.
- `symptoms_vocab.json`: The standardized list of clinical symptoms.

---

## 💻 Usage Examples

You can run the full pipeline in three different modes depending on your application's needs. 

### A. Fully Automatic (No User Input)
Extracts and returns only the **Confirmed** symptoms. Any ambiguous or rejected matches are silently ignored.

```python
from pipeline import SymptomPipeline

pipe = SymptomPipeline()
results = pipe.extract("I woke up feeling nauseous and threw up twice.")
print(results)
```

### B. Interactive (Human-in-the-Loop)
Prompts you via the command line with a Yes/No question whenever it finds an **Ambiguous** symptom.

```python
from pipeline import SymptomPipeline

pipe = SymptomPipeline()
results = pipe.extract_interactive("my heart keeps doing a weird fluttering thing")
```

### C. Batch Processing
Automatically processes a list of texts (returns only Confirmed matches).

```python
from pipeline import SymptomPipeline

pipe = SymptomPipeline()
texts = [
    "I have a high fever",
    "my lower back is killing me"
]
confident_results , ambigous_results = pipe.extract_batch(texts)
```

---

## 🧪 Running the Built-In Tests
To see the pipeline in action, you can easily run the evaluation script:

```bash
python evaluate_pipeline.py
```

Or, you can run `pipeline.py` directly to see the interactive, human-in-the-loop Command Line Interface:

```bash
python pipeline.py
```
