#  Niramaya (AI-HealthCare-Tool) 

**HealthCare+** is a cutting-edge, hybrid AI medical assistant that combines local Machine Learning (NER & Classification) with Google's state-of-the-art **Gemma 3** (via Gemini API) to provide intelligent symptom analysis, disease prediction, and conversational medical guidance.

> **Medical Disclaimer**: This tool is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

---

## ✨ Key Features

- 🧠 **Hybrid Prediction Engine**: Combines custom-trained spaCy NER models with ML classifiers for 100% offline-capable symptom extraction.
- 🤖 **Gemini Enrichment**: Uses `gemma-3-27b-it` to analyze ML results, providing plain-English explanations, recommended actions, and safety warnings.
- 💬 **Conversational AI**: A natural medical chat interface that understands context and explains complex conditions simply.
- 🚨 **Emergency Detection**: Sophisticated safety grounding that identifies high-risk symptoms (chest pain, breathing issues) and triggers urgent alerts.
- 📊 **Health Dashboard**: Real-time visualization of health metrics (heart rate, BP, steps) and weekly progression.
- 🎨 **Modern Interface**: A sleek, dark-mode-first UI built with React, Shadcn/UI, and Tailwind CSS.

---

## Tech Stack

### Frontend
- **Framework**: [Vite](https://vitejs.dev/) + [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Icons & Charts**: [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/)

### Backend
- **Framework**: [Flask](https://flask.palletsprojects.com/) (Python)
- **AI/LLM**: [Google Gemini API](https://ai.google.dev/) (`gemma-3-27b-it`)
- **NLP Pipeline**: [spaCy](https://spacy.io/) (Custom NER model)
- **ML Engine**: Scikit-Learn (Disease Classification)

---

## Working

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key

### Backend Setup
1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Create and activate a virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env`:
   ```env
   GEMINI_API_KEY=your_api_key_here
   PORT=5000
   SECRET_KEY=your_secret_key
   ```
5. Start the server:
   ```powershell
   python app.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the development server:
   ```powershell
   npm run dev
   ```

---

## Structure

```text
AI-HealthCare-Tool/
├── backend/                # Flask API & ML Logic
│   ├── ML-Model/           # Trained disease classification models
│   ├── symptom_ner/        # spaCy NER models and datasets
│   ├── HAAHAHAHAHAHAH/     # Core prediction & pipeline logic
│   ├── app.py              # Main API entry point
│   └── gemini_helper.py    # Gemini LLM integration & safety rules
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # UI Components (Shadcn/UI)
│   │   ├── pages/          # Chat & Dashboard views
│   │   └── lib/            # Utilities (API clients, validators)
└── README.md
```

---

## Feel free to open issues or submit pull requests to improve the clinical accuracy or UI/UX of the tool.

**Developed with ❤️ for Advanced Healthcare Intelligence.**
