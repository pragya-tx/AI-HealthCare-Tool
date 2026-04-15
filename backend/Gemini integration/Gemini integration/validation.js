export function validateResponse(json) {
  if (!json) return false;

  if (!Array.isArray(json.conditions)) return false;
  if (typeof json.emergencyflag !== "boolean") return false;
  if (!Array.isArray(json.recommendedactions)) return false;
  if (!Array.isArray(json.medications)) return false;

  return true;
}