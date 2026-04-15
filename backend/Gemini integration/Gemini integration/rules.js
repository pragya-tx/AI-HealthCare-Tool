export function applySafetyRules(data, response) {
  const symptoms = data.normalizedsymptoms.toLowerCase();

  const emergencyTriggers = [ //few risk factors - immediately consult doctor
    "chest pain",
    "breathing difficulty",
    "unconscious",
    "severe bleeding"
  ];

  for (let trigger of emergencyTriggers) {
    if (symptoms.includes(trigger)) {
      response.emergencyflag = true;
      response.emergencyreason = `Detected: ${trigger}`;
      response.recommendedactions.push("Seek immediate medical attention");
      break;
    }
  }

  return response;
}