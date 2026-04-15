import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function medicalAnalysis(data) {
  const {
    symptomslist,
    normalizedsymptoms,
    predictionswithprobabilities,
    medicationdata,
  } = data;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro",

    config: {
      temperature: 0.2,         // ager kuch faltu output de then change to 0.3
      topP: 0.8,
      maxOutputTokens: 1024,
      responseMimeType: "application/json" 
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
${normalizedsymptoms}

Predicted Conditions:
${JSON.stringify(predictionswithprobabilities)}

Medication Mapping:
${JSON.stringify(medicationdata)}

Instructions:
1. Rank conditions by probability.
2. Assign severity (low/medium/high).
3. Detect emergency symptoms (chest pain, breathing issues, unconsciousness).
4. Suggest doctor visit or OTC meds only if safe.
5. Output ONLY valid JSON.
`
          }
        ]
      }
    ]
  });

  return response.text;
}