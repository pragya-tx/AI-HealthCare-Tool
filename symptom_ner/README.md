# 🩺 Symptom Extraction Pipeline

A two-stage NLP pipeline that reads patient text, finds symptoms automatically, and maps them to a clean standardized medical vocabulary.

---

## What Does It Do?

You give it a sentence like:

> *"I have been having chest pain and my neck is really stiff"*

It gives you back:

```
✅ chest pain       → chest discomfort   (0.87)
✅ neck is stiff    → neck stiffness     (0.91)
```

No manual work. No rules. Just patient text in, clean symptoms out.

---

## How It Works

There are two stages running back to back:

**Stage 1 — Find the symptoms (spaCy NER)**
A custom-trained Named Entity Recognition model reads the text and highlights the symptom phrases, the same way spell-check highlights a word but for medical symptoms.

**Stage 2 — Standardize them (BioBERT)**
The highlighted phrases are then matched against a list of ~200 standard clinical symptom names using BioBERT, a language model trained on medical text. It picks the closest match and gives it a confidence score.

Based on that score, each symptom gets one of three labels:

| Label | Score | Meaning |
|---|---|---|
| ✅ Confirmed | ≥ 0.70 | High confidence — kept automatically |
| ⚠️ Ambiguous | 0.45 – 0.49 | Uncertain — optionally ask a human |
| ❌ Rejected | < 0.45 | Low confidence — discarded |

---

## Setup

**Step 1 — Install dependencies**

```bash
pip install -r requirements.txt
```

**Step 2 — Download the NER model**

The trained model is hosted on Hugging Face. Download it with:

```python
from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="HuggingIceQueen/symptom-ner-spacy",
    local_dir="models/symptom_ner_best"
)
```

Or manually from:
👉 https://huggingface.co/HuggingIceQueen/symptom-ner-spacy

Place the downloaded folder at `models/symptom_ner_best/` inside this directory.

**Step 3 — You're ready**

```bash
python pipeline.py
```

---

## Usage

### Option A — Automatic (recommended for apps)

Just pass text, get confirmed symptoms back. No prompts, no interaction.

```python
from pipeline import SymptomPipeline

pipe = SymptomPipeline()

results = pipe.extract("I woke up feeling nauseous and threw up twice")

for r in results:
    print(r["raw"], "→", r["matched_symptom"], f"({r['score']})")
```

Output:
```
nauseous → nausea (0.81)
threw up → vomiting (0.76)
```

---

### Option B — Interactive (human in the loop)

When a symptom is uncertain, the pipeline asks you yes or no before including it.

```python
from pipeline import SymptomPipeline

pipe = SymptomPipeline()

confirmed, ambiguous = pipe.extract_interactive("my heart keeps doing a weird fluttering thing")
```

Terminal output:
```
  Possible symptom detected:
    Patient said : "weird fluttering"
    Closest match: "heart palpitations" (similarity: 0.48)
  Is this a symptom? (y/n): y
```

`confirmed` contains everything accepted (auto + user).
`ambiguous` contains only the ones the user said yes to.

---

### Option C — Batch processing

Process a list of texts at once. Returns only confirmed symptoms per text.

```python
from pipeline import SymptomPipeline

pipe = SymptomPipeline()

texts = [
    "I have a high fever and chills",
    "my lower back is killing me",
    "I feel completely fine"
]

results = pipe.extract_batch(texts)

for text, symptoms in zip(texts, results):
    print(f"\n{text}")
    for s in symptoms:
        print(f"  → {s['matched_symptom']} ({s['score']})")
```

---

## Project Structure

```
symptom_ner/
├── pipeline.py              # Main pipeline — SymptomPreprocessor, Extractor, SymptomPipeline
├── extract_vocab.py         # Helper to update symptoms_vocab.json from a CSV
├── symptoms_vocab.json      # ~200 standardized clinical symptom names
├── requirements.txt         # All dependencies
├── models/
│   └── symptom_ner_best/    # Trained spaCy NER model (download from Hugging Face)
└── README.md
```

---

## Requirements

- Python 3.9+
- spaCy 3.x
- sentence-transformers
- PyTorch
- en_core_web_sm (spaCy model for dependency parsing)

Install the spaCy language model separately:

```bash
python -m spacy download en_core_web_sm
```

---

## NER Model Details

| Property | Value |
|---|---|
| Framework | spaCy 3.x |
| Entity type | `SYMPTOM` |
| Training data | ~16,000 labeled symptom entities from medical forum posts |
| Hosted at | [HuggingFace](https://huggingface.co/HuggingIceQueen/symptom-ner-spacy) |

---

## Limitations

- The NER model was trained on informal patient text (medical forums). It may perform differently on formal clinical notes.
- Colloquial expressions like *"my head is pounding"* may not always be caught — a synonym map is planned for a future update.
- BioBERT matching is limited to the symptoms defined in `symptoms_vocab.json`. Symptoms outside the vocab will be scored against the closest available term.