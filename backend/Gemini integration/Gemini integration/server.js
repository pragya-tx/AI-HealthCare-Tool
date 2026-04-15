import express from "express";
import dotenv from "dotenv";
import { medicalAnalysis } from "./gemini.js";
import { validateResponse } from "./validator.js";
import { applySafetyRules } from "./rules.js";

// for main backend code
dotenv.config();

const app = express();
app.use(express.json());

app.post("/api/analyze", async (req, res) => {
  try {
    const inputData = req.body;

    const rawResponse = await medicalAnalysis(inputData);

    let parsed;

    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      return res.status(500).json({
        error: "Invalid JSON from model"
      });
    }

    if (!validateResponse(parsed)) {
      return res.status(500).json({
        error: "Invalid response structure"
      });
    }

    const finalResponse = applySafetyRules(inputData, parsed);
    res.json(finalResponse);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});