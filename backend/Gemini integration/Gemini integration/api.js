import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function medicalAnalysis(symptomslist, normalizedsymptoms, predictions) {
  const response = await ai.models.generateContent({
    model: "gemma-3-27b-it",
    config: {
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 1024,
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
You are a medical assistant AI.

Constraints:
- Do NOT make assumptions.
- Use only provided inputs.
- Clearly separate high-risk vs low-risk.
- Flag emergencies explicitly.
- Keep output structured and concise.
- Output ONLY raw valid JSON. No markdown, no backticks, no explanation.

Output JSON schema:
{
  "conditions": [
    {
      "name": "",
      "probability": "",
      "severity": "low | medium | high",
      "explanation": ""
    }
  ],
  "emergencyflag": true/false,
  "emergencyreason": "",
  "recommendedactions": [],
  "medications": [
    {
      "name": "",
      "type": "otc | consultdoctor",
      "note": ""
    }
  ],
  "precautions": [],
  "disclaimer": ""
}

User Symptoms:
${symptomslist}

Extracted Symptoms:
${normalizedsymptoms.join(", ")}

Predicted Conditions:
${JSON.stringify(predictions, null, 2)}

Instructions:
1. Use "confidence_score" as probability.
2. Respect given "rank" order.
3. Use "symptom_contributions" ONLY for explanation.
4. Assign severity (low/medium/high).
5. Detect emergencies ONLY if explicitly present.
6. Output ONLY raw valid JSON. No markdown, no backticks, no preamble.
`
          }
        ]
      }
    ]
  });

  // strip markdown fences if model wraps output anyway
  const raw = response.text.replace(/```json|```/g, "").trim();
  return raw;
}

// -------- TEST INPUT --------
const symptomslist = "burning abdominal pain, vomiting, headache";
const normalizedsymptoms = ["burning abdominal pain", "vomiting", "headache"];
const predictions = [
  {
    confidence_score: "57.95%",
    disease_name: "infectious gastroenteritis",
    rank: 1,
    symptom_contributions: [
      { boost_score: "51.0%", direction: "+", symptom: "burning abdominal pain" },
      { boost_score: "39.4%", direction: "+", symptom: "vomiting" },
      { boost_score: "9.6%", direction: "+", symptom: "headache" }
    ]
  },
  {
    confidence_score: "41.45%",
    disease_name: "gastritis",
    rank: 2,
    symptom_contributions: [
      { boost_score: "63.6%", direction: "+", symptom: "headache" },
      { boost_score: "25.6%", direction: "+", symptom: "burning abdominal pain" },
      { boost_score: "10.8%", direction: "+", symptom: "vomiting" }
    ]
  },
  {
    confidence_score: "0.50%",
    disease_name: "acute stress reaction",
    rank: 3,
    symptom_contributions: [
      { boost_score: "49.5%", direction: "-", symptom: "vomiting" },
      { boost_score: "36.7%", direction: "+", symptom: "burning abdominal pain" },
      { boost_score: "13.8%", direction: "+", symptom: "headache" }
    ]
  }
];

(async () => {
  try {
    const result = await medicalAnalysis(symptomslist, normalizedsymptoms, predictions);

    console.log("RAW OUTPUT:\n", result);

    try {
      const parsed = JSON.parse(result);
      console.log("\nPARSED OUTPUT:\n", JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error("\nInvalid JSON returned:", e.message);
    }

  } catch (error) {
    console.error("Error:", error);
  }
})();