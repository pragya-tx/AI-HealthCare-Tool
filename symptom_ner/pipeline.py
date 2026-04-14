"""
pipeline.py — Three-tier symptom extraction pipeline.

Classes:
    SymptomPreprocessor  — spaCy NER + long span decomposition via noun chunks
    Extractor            — BioBERT scoring, vocab matching, tiering
    SymptomPipeline      — Orchestrates both, exposes public API

Three tiers based on similarity score:
    CONFIRMED  (score >= 0.70) — auto kept
    AMBIGUOUS  (score 0.45-0.50) — presented to user for yes/no confirmation
    REJECTED   (score < 0.45) — silently dropped

Return value of extract_interactive:
    (confirmed: List[dict], ambiguous: List[dict])

    confirmed  — auto-confirmed + user-confirmed items
    ambiguous  — items the user said yes to that were originally ambiguous
                 (also included in confirmed for convenience)

Usage:
    from pipeline import SymptomPipeline

    pipe = SymptomPipeline()

    # Fully automatic — returns only confirmed list
    confirmed = pipe.extract(text)

    # Full three-tier — prompts user, returns (confirmed, ambiguous) tuple
    confirmed, ambiguous = pipe.extract_interactive(text)
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import List, Tuple

import spacy

ROOT             = Path(__file__).resolve().parent
DEFAULT_NER_PATH = ROOT / "models" / "symptom_ner_best"
DEFAULT_VOCAB    = ROOT / "symptoms_vocab.json"

BIOBERT_MODEL = "pritamdeka/BioBERT-mnli-snli-scinli-scitail-mednli-stsb"

# Tier thresholds
CONFIRMED_THRESHOLD = 0.70
AMBIGUOUS_THRESHOLD = 0.45

# Long span threshold — spans with >= this many words get decomposed
LONG_SPAN_WORD_THRESHOLD = 5


# ══════════════════════════════════════════════════════════════════════════════
# Stage 1 — SymptomPreprocessor
# ══════════════════════════════════════════════════════════════════════════════

class SymptomPreprocessor:
    """
    Handles spaCy NER and long span decomposition.

    For spans shorter than LONG_SPAN_WORD_THRESHOLD words the raw span text
    is returned as-is.  For longer spans, noun chunks are extracted and each
    chunk is enriched with its adjectival/predicate modifiers so that
    BioBERT receives a compact, semantically dense phrase instead of a
    verbose fragment.

    Returns a list of (original_ent, [cleaned_span, ...]) tuples so the
    pipeline can always trace back to the source character offsets.
    """

    CLAUSE_SPLIT_RE = re.compile(r"\bbut\b", flags=re.IGNORECASE)

    def __init__(self, ner_model_path: Path) -> None:
        self.nlp = spacy.load(str(ner_model_path))
        # separate model for dependency parsing (noun_chunks requires dep parse)
        try:
            self.dep_nlp = spacy.load("en_core_web_sm")
        except OSError:
            self.dep_nlp = None

    # ── Noun-chunk enrichment ─────────────────────────────────────────────────

    def _enrich_chunk(self, chunk, doc) -> str:
        """
        Given a spaCy noun chunk, return a compact symptom phrase by
        prepending predicate adjectives and adjectival modifiers.

        Example:
            chunk = "knee"  (from "my knee is swollen")
            returns "swollen knee"
        """
        head = chunk.root

        # 1. Collect inline adjective modifiers (amod/advmod) before the head
        adj_mods = [
            t.text for t in head.children
            if t.dep_ in ("amod", "advmod") and t.i < head.i
        ]

        # 2. Collect predicate adjectives via copula: "knee is swollen"
        pred_adjs = []
        for t in head.children:
            if t.dep_ == "cop":
                for sibling in head.children:
                    if sibling.dep_ in ("acomp", "attr") and sibling.i != t.i:
                        pred_adjs.append(sibling.text)

        # Also check one level up when head is a subject
        if head.dep_ in ("nsubj", "nsubjpass"):
            governor = head.head
            for sibling in governor.children:
                if sibling.dep_ in ("acomp", "attr") and sibling.i != head.i:
                    pred_adjs.append(sibling.text)

        # 3. Collect verbal predicates: "ear is ringing", "throat is burning"
        verbal_preds = []
        if head.dep_ in ("nsubj", "nsubjpass"):
            governor = head.head
            if governor.pos_ in ("VERB", "AUX") and governor.dep_ != "cop":
                verbal_preds.append(governor.lemma_)
                for child in governor.children:
                    if child.dep_ in ("advmod", "acomp") and child.i != head.i:
                        verbal_preds.append(child.text)

        all_adjs = adj_mods + pred_adjs

        # 4. Build enriched phrase
        chunk_text = chunk.text.lower()

        # Strip possessives and determiners from the front
        chunk_text = re.sub(
            r"^\b(my|his|her|our|their|your|the|a|an)\b\s*", "", chunk_text
        ).strip()

        # Remove any adj that already appears at the start of chunk_text (duplicate fix)
        filtered_adjs = [
            adj for adj in all_adjs
            if not re.match(rf"^{re.escape(adj.lower())}\b", chunk_text)
        ]

        # If verbal predicates exist and no adjs, append verb to chunk (verb fix)
        if filtered_adjs:
            enriched = " ".join(filtered_adjs).lower() + " " + chunk_text
        elif verbal_preds:
            enriched = chunk_text + " " + " ".join(verbal_preds).lower()
        else:
            enriched = chunk_text

        return re.sub(r"\s+", " ", enriched).strip()

    def _decompose_long_span(self, span_text: str) -> List[str]:
        """
        Decompose a long span (>= LONG_SPAN_WORD_THRESHOLD words) into one or
        more compact symptom phrases using noun chunks + predicate enrichment.

        Returns a non-empty list. Falls back to the original text if no
        noun chunks are found or dep parser is unavailable.
        """
        if self.dep_nlp is None:
            return [span_text]

        doc    = self.dep_nlp(span_text)
        chunks = list(doc.noun_chunks)

        if not chunks:
            return [span_text]

        enriched = [self._enrich_chunk(chunk, doc) for chunk in chunks]
        seen: set = set()
        result    = []
        for phrase in enriched:
            if phrase and phrase not in seen:
                seen.add(phrase)
                result.append(phrase)

        return result if result else [span_text]

    # ── Public API ────────────────────────────────────────────────────────────

    def process(self, text: str) -> List[Tuple]:
        """
        Run NER on *text* and return a list of
            (ent, [cleaned_span, ...])
        tuples.

        Short spans yield a single-element list with the raw text.
        Long spans yield one or more enriched phrases from noun chunks.
        """
        if not text or not text.strip():
            return []

        results: List[Tuple] = []
        seen_spans: set      = set()

        for clause in self.CLAUSE_SPLIT_RE.split(text):
            clause = clause.strip()
            if not clause:
                continue

            doc = self.nlp(clause)
            for ent in doc.ents:
                if ent.label_ != "SYMPTOM":
                    continue

                raw        = ent.text.strip()
                word_count = len(raw.split())

                if word_count < LONG_SPAN_WORD_THRESHOLD:
                    cleaned = [re.sub(r"\s+", " ", raw)]
                else:
                    cleaned = self._decompose_long_span(raw)

                unique_cleaned = []
                for phrase in cleaned:
                    if phrase not in seen_spans:
                        seen_spans.add(phrase)
                        unique_cleaned.append(phrase)

                if unique_cleaned:
                    results.append((ent, unique_cleaned))

        return results


# ══════════════════════════════════════════════════════════════════════════════
# Stage 2 — Extractor
# ══════════════════════════════════════════════════════════════════════════════

class Extractor:
    """
    BioBERT-powered symptom matcher.

    Takes the (ent, [cleaned_spans]) output from SymptomPreprocessor,
    scores each cleaned phrase against a standard symptom vocabulary,
    and returns structured result dicts with tier assignments.

    For long spans that were decomposed into multiple phrases, all phrases
    are scored and the best-scoring one is kept (highest similarity wins).
    """

    def __init__(
        self,
        vocab: List[str],
        biobert_model: str  = BIOBERT_MODEL,
        device: str         = "cpu",
        confirmed_threshold = CONFIRMED_THRESHOLD,
        ambiguous_threshold = AMBIGUOUS_THRESHOLD,
    ) -> None:
        self.vocab               = vocab
        self.biobert_model       = biobert_model
        self.device              = device
        self.confirmed_threshold = confirmed_threshold
        self.ambiguous_threshold = ambiguous_threshold

        self._encoder          = None
        self._vocab_embeddings = None
        self._util             = None

    # ── Lazy BioBERT loading ──────────────────────────────────────────────────

    def _load_biobert(self) -> None:
        if self._encoder is not None:
            return
        from sentence_transformers import SentenceTransformer, util
        self._util             = util
        self._encoder          = SentenceTransformer(self.biobert_model, device=self.device)
        self._vocab_embeddings = self._encoder.encode(
            self.vocab,
            convert_to_tensor=True,
            show_progress_bar=False,
        )

    # ── Scoring ───────────────────────────────────────────────────────────────

    def _score_phrases(self, phrases: List[str]) -> List[Tuple[str, float]]:
        """Score a list of phrases against vocab. Returns [(best_term, score), ...]."""
        self._load_biobert()
        embeddings    = self._encoder.encode(phrases, convert_to_tensor=True, show_progress_bar=False)
        cosine_scores = self._util.cos_sim(embeddings, self._vocab_embeddings)

        results = []
        for i in range(len(phrases)):
            best_idx   = cosine_scores[i].argmax().item()
            best_score = round(cosine_scores[i][best_idx].item(), 4)
            results.append((self.vocab[best_idx], best_score))
        return results

    def _best_match(self, phrases: List[str]) -> Tuple[str, str, float]:
        """
        Score all candidate phrases and return
        (winning_phrase, matched_vocab_term, score).
        """
        scored = self._score_phrases(phrases)
        best_i = max(range(len(scored)), key=lambda i: scored[i][1])
        return phrases[best_i], scored[best_i][0], scored[best_i][1]

    # ── Tiering ───────────────────────────────────────────────────────────────

    def _tier(self, score: float) -> str:
        if score >= self.confirmed_threshold:
            return "confirmed"
        elif score >= self.ambiguous_threshold:
            return "ambiguous"
        return "rejected"

    # ── Result builder ────────────────────────────────────────────────────────

    def _build_result(
        self,
        ent,
        raw_span: str,
        matched_symptom: str,
        score: float,
        tier: str,
        user_confirmed=None,
    ) -> dict:
        return {
            "raw":             raw_span,
            "matched_symptom": matched_symptom,
            "score":           score,
            "tier":            tier,
            "user_confirmed":  user_confirmed,
            "start":           ent.start_char,
            "end":             ent.end_char,
        }

    # ── Public API ────────────────────────────────────────────────────────────

    def score(self, preprocessed: List[Tuple]) -> dict:
        """
        Score all (ent, [phrases]) tuples and return a tiered dict:
            {
                "confirmed": [...],
                "ambiguous": [...],
                "rejected":  [...],
            }
        """
        if not preprocessed:
            return {"confirmed": [], "ambiguous": [], "rejected": []}

        result = {"confirmed": [], "ambiguous": [], "rejected": []}

        for ent, phrases in preprocessed:
            best_phrase, matched, score = self._best_match(phrases)
            tier = self._tier(score)
            result[tier].append(
                self._build_result(ent, best_phrase, matched, score, tier)
            )

        return result


# ══════════════════════════════════════════════════════════════════════════════
# Orchestrator — SymptomPipeline
# ══════════════════════════════════════════════════════════════════════════════

class SymptomPipeline:
    """
    Wires SymptomPreprocessor and Extractor together.

    Public API
    ----------
    extract(text)
        Automatic only — returns List[dict] of confirmed symptoms.

    extract_tiered(text)
        Returns {"confirmed": [...], "ambiguous": [...], "rejected": [...]}
        with no user interaction.

    extract_interactive(text)
        Prompts user for ambiguous spans via CLI.
        Returns (confirmed: List[dict], ambiguous: List[dict]).

        confirmed  — auto-confirmed + user-confirmed items
        ambiguous  — only the items that were originally ambiguous tier
                     and the user accepted (also present in confirmed)

    extract_batch(texts)
        Automatic batch — returns List[List[dict]].
    """

    def __init__(
        self,
        ner_model_path      = DEFAULT_NER_PATH,
        vocab_path          = DEFAULT_VOCAB,
        device              = "cpu",
        confirmed_threshold = CONFIRMED_THRESHOLD,
        ambiguous_threshold = AMBIGUOUS_THRESHOLD,
    ):
        ner_model_path = Path(ner_model_path)
        vocab_path     = Path(vocab_path)

        if not ner_model_path.exists():
            raise FileNotFoundError(f"NER model not found at {ner_model_path}.")
        if not vocab_path.exists():
            raise FileNotFoundError(f"Vocab file not found at {vocab_path}.")

        with open(vocab_path, "r", encoding="utf-8") as f:
            vocab = json.load(f)

        self.preprocessor = SymptomPreprocessor(ner_model_path)
        self.extractor    = Extractor(
            vocab               = vocab,
            device              = device,
            confirmed_threshold = confirmed_threshold,
            ambiguous_threshold = ambiguous_threshold,
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def extract(self, text: str) -> List[dict]:
        """Fully automatic — returns only confirmed symptoms."""
        preprocessed = self.preprocessor.process(text)
        tiered       = self.extractor.score(preprocessed)
        return tiered["confirmed"]

    def extract_tiered(self, text: str) -> dict:
        """Returns all three tiers without user interaction."""
        preprocessed = self.preprocessor.process(text)
        return self.extractor.score(preprocessed)

    def extract_interactive(self, text: str) -> Tuple[List[dict], List[dict]]:
        """
        Full three-tier pipeline with CLI yes/no prompts for ambiguous spans.

        Returns
        -------
        (confirmed, ambiguous)

        confirmed : List[dict]
            All auto-confirmed symptoms + any ambiguous ones the user accepted.

        ambiguous : List[dict]
            Only the items that were originally in the ambiguous tier and
            the user accepted. Empty list if none were accepted or there
            were no ambiguous items.
        """
        tiered    = self.extract_tiered(text)
        confirmed = list(tiered["confirmed"])   # start with auto-confirmed
        ambiguous = []                           # user-accepted ambiguous items

        for item in tiered["ambiguous"]:
            print("\n  Possible symptom detected:")
            print(f"    Patient said : \"{item['raw']}\"")
            print(f"    Closest match: \"{item['matched_symptom']}\" (similarity: {item['score']})")

            while True:
                answer = input("  Is this a symptom? (y/n): ").strip().lower()
                if answer in ("y", "yes"):
                    item["user_confirmed"] = True
                    item["tier"]           = "confirmed"
                    confirmed.append(item)   # goes into confirmed
                    ambiguous.append(item)   # also tracked separately
                    break
                elif answer in ("n", "no"):
                    item["user_confirmed"] = False
                    item["tier"]           = "rejected"
                    break
                else:
                    print("  Please enter y or n.")

        return confirmed, ambiguous

    def extract_batch(self, texts: List[str]) -> List[List[dict]]:
        """Automatic batch extraction — no user interaction."""
        return [self.extract(t) for t in texts]


# ══════════════════════════════════════════════════════════════════════════════
# Test runner
# ══════════════════════════════════════════════════════════════════════════════

# if __name__ == "__main__":
#     pipe = SymptomPipeline()

#     tests = [
#         # ── Long spans — should trigger decomposition ──────────────────────
#         "feel like absolute garbage today, stomach is killing me and im freezing",
#         "my throat is on fire and i keep coughing up stuff",
#         "i get this weird pressure behind my eyes when i stand up",

#         # ── Previously failing — NER gaps / colloquial ─────────────────────
#         "omg my head is literally pounding i cant take it anymore",
#         "I have had diarrhea for 3 days straight",
#         "my lower back has been in agony since yesterday morning",
#         "I keep having panic attacks out of nowhere",
#         "cant even get out of bed im so weak and dizzy",

#         # ── Clear multi-symptom ────────────────────────────────────────────
#         "I have been having chest pain and shortness of breath for the past two days",
#         "my stomach hurts really bad and i keep throwing up",
#         "I have a fever of 103 and my whole body aches",
#         "been getting really bad migraines and my vision goes blurry",

#         # ── Single dominant symptom ────────────────────────────────────────
#         "I am having trouble sleeping, been awake for two days",
#         "my right ear has been ringing nonstop for a week",
#         "been losing weight without trying and im always tired",
#         "my hands go numb when i wake up every morning",

#         # ── Negative cases — expect no output ─────────────────────────────
#         "I just wanted to know if I should take ibuprofen or paracetamol",
#         "my doctor said my blood work came back normal",
#     ]

#     for text in tests:
#         print(f"\n{'='*60}")
#         print(f"Input: {text}")

#         confirmed, ambiguous = pipe.extract_interactive(text)

#         if confirmed:
#             print("\n  Confirmed symptoms:")
#             for r in confirmed:
#                 tag = "(auto)" if r["user_confirmed"] is None else "(user)"
#                 print(f"{tag} '{r['raw']}' → '{r['matched_symptom']}' ({r['score']})")

#         if ambiguous:
#             print("\n  User-confirmed ambiguous symptoms:")
#             for r in ambiguous:
#                 print(f"'{r['raw']}' → '{r['matched_symptom']}' ({r['score']})")

#         if not confirmed:
#             print("  No symptoms extracted.")