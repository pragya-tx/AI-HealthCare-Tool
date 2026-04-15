// Symptom Analysis Engine — local, no API needed

export interface ConditionDef {
  id: string;
  name: string;
  category: string;
  description: string;
  /** symptom label → weight (higher = stronger signal) */
  symptomWeights: Record<string, number>;
  /** minimum normalized score (0–100) to appear in results */
  minScore: number;
  isEmergency: boolean;
  emergencyMessage?: string;
  suggestedActions: string[];
  medications: Array<{ name: string; note: string }>;
  homeRemedies: string[];
}

export interface RankedCondition extends ConditionDef {
  score: number; // 0–100
  matchedSymptoms: string[];
  symptomContributions: Record<string, number>; // symptom → % of score
}

export interface AnalysisResult {
  conditions: RankedCondition[];
  hasEmergency: boolean;
  emergencyMessages: string[];
  inputSymptoms: string[];
  generalActions: string[];
}

// ── Emergency combos ────────────────────────────────────────────────────────
const EMERGENCY_COMBOS: Array<{ symptoms: string[]; message: string }> = [
  {
    symptoms: ["Chest Pain", "Rapid Heartbeat", "Difficulty Breathing"],
    message: "Possible cardiac emergency — chest pain with breathing difficulty. Call emergency services immediately.",
  },
  {
    symptoms: ["Chest Pain", "Shortness of Breath"],
    message: "Chest pain combined with shortness of breath can indicate a serious cardiac or pulmonary event. Seek emergency care now.",
  },
  {
    symptoms: ["Coughing Blood"],
    message: "Coughing up blood requires immediate medical evaluation. Please visit an emergency room.",
  },
  {
    symptoms: ["Difficulty Breathing"],
    message: "Severe difficulty breathing requires urgent medical attention.",
  },
  {
    symptoms: ["Fainting", "Chest Pain"],
    message: "Fainting with chest pain can signal a serious cardiac condition. Seek emergency care.",
  },
];

// ── Condition Database ───────────────────────────────────────────────────────
export const CONDITIONS: ConditionDef[] = [
  {
    id: "common-cold",
    name: "Common Cold",
    category: "Respiratory",
    description:
      "A viral upper respiratory infection caused by rhinoviruses. Very common and usually self-limiting, resolving in 7–10 days.",
    symptomWeights: {
      "Runny Nose": 3, "Nasal Congestion": 3, "Sore Throat": 2.5,
      "Cough": 2, "Hoarseness": 1.5, "Fever": 1, "Fatigue": 1.5,
      "Headache": 1, "Loss of Appetite": 0.5,
    },
    minScore: 18,
    isEmergency: false,
    suggestedActions: [
      "Rest and stay well-hydrated (8+ glasses of water daily)",
      "Use saline nasal spray to relieve congestion",
      "Monitor temperature — see a doctor if fever exceeds 39°C (102°F)",
      "Avoid close contact with others to prevent spread",
    ],
    medications: [
      { name: "Paracetamol / Acetaminophen", note: "Relieves fever and aches — follow package dosage" },
      { name: "Decongestant nasal spray", note: "Short-term use (≤3 days) for nasal congestion" },
      { name: "Throat lozenges", note: "Soothe sore throat — OTC, follow instructions" },
    ],
    homeRemedies: [
      "Steam inhalation (bowl of hot water + towel over head) for congestion",
      "Honey + ginger + lemon tea — natural antiviral soothing drink",
      "Gargle with warm salt water 3× daily for sore throat",
      "Chicken broth — anti-inflammatory and hydrating",
      "Elevate your head when sleeping to ease nasal drip",
    ],
  },
  {
    id: "influenza",
    name: "Influenza (Flu)",
    category: "Viral Infection",
    description:
      "A contagious respiratory illness caused by influenza viruses. Symptoms are typically more severe and sudden than the common cold.",
    symptomWeights: {
      "Fever": 3, "Chills": 3, "Fatigue": 3, "Muscle Aches": 3,
      "General Pain": 2.5, "Headache": 2, "Cough": 2, "Weakness": 2,
      "Loss of Appetite": 1.5, "Sore Throat": 1.5, "Runny Nose": 1,
      "Night Sweats": 1.5,
    },
    minScore: 20,
    isEmergency: false,
    suggestedActions: [
      "Rest at home and isolate from others for at least 5 days",
      "Drink plenty of fluids — water, broth, electrolyte drinks",
      "Consult a doctor within 48 hours for antiviral treatment (oseltamivir)",
      "Seek emergency care if you have trouble breathing or persistent chest pain",
    ],
    medications: [
      { name: "Oseltamivir (Tamiflu)", note: "Antiviral — requires prescription, most effective within 48 hrs" },
      { name: "Paracetamol / Ibuprofen", note: "For fever and body pain — consult pharmacist for dosage" },
      { name: "Cough suppressants", note: "For persistent dry cough — OTC available" },
    ],
    homeRemedies: [
      "Complete bed rest for the first 72 hours",
      "Warm ginger and turmeric tea — anti-inflammatory",
      "Cool damp cloth on forehead for fever management",
      "Broths and soups to stay hydrated and nourished",
      "Elderberry syrup — some evidence of shortening flu duration",
    ],
  },
  {
    id: "allergic-rhinitis",
    name: "Allergic Rhinitis (Hay Fever)",
    category: "Allergy",
    description:
      "An allergic response causing cold-like symptoms triggered by allergens such as pollen, dust mites, or pet dander.",
    symptomWeights: {
      "Runny Nose": 3, "Nasal Congestion": 2.5, "Eye Redness": 2.5,
      "Itching": 2.5, "Fatigue": 1.5, "Headache": 1, "Hoarseness": 0.5,
    },
    minScore: 20,
    isEmergency: false,
    suggestedActions: [
      "Identify and avoid known allergen triggers",
      "Keep windows closed during high pollen seasons",
      "Use air purifiers indoors",
      "Consult an allergist for skin-prick testing",
    ],
    medications: [
      { name: "Antihistamines (e.g. cetirizine, loratadine)", note: "First-line OTC treatment — take once daily" },
      { name: "Intranasal corticosteroids (e.g. fluticasone)", note: "Most effective for nasal symptoms — OTC and Rx options available" },
      { name: "Decongestants", note: "Short-term relief — do not use more than 3 days" },
    ],
    homeRemedies: [
      "Saline nasal rinse (neti pot) to flush allergens",
      "Local raw honey — may help desensitize to local pollens",
      "Keep indoor humidity between 30–50% to reduce dust mites",
      "Shower and change clothes after spending time outdoors",
    ],
  },
  {
    id: "sinusitis",
    name: "Sinusitis",
    category: "Respiratory",
    description:
      "Inflammation of the sinuses, often following a cold. Can be viral (most cases) or bacterial, causing facial pressure and nasal congestion.",
    symptomWeights: {
      "Nasal Congestion": 3, "Headache": 2.5, "Facial Pain": 3,
      "Runny Nose": 2, "Fever": 1.5, "Fatigue": 1.5, "Jaw Pain": 1.5,
      "Difficulty Swallowing": 0.5,
    },
    minScore: 20,
    isEmergency: false,
    suggestedActions: [
      "Use saline nasal irrigation to clear sinuses",
      "Apply warm compress to face to relieve sinus pressure",
      "Stay well-hydrated to thin mucus",
      "See a doctor if symptoms last more than 10 days or worsen — may need antibiotics",
    ],
    medications: [
      { name: "Saline nasal spray", note: "Helps keep sinuses moist and clears mucus" },
      { name: "Decongestants (pseudoephedrine)", note: "Short-term use only — consult pharmacist" },
      { name: "Amoxicillin (if bacterial)", note: "Requires prescription — only for confirmed bacterial sinusitis" },
    ],
    homeRemedies: [
      "Inhale steam from a hot shower for 10 minutes",
      "Neti pot with sterile saline solution",
      "Turmeric milk (golden milk) — anti-inflammatory",
      "Sleep with head elevated to help sinus drainage",
      "Apple cider vinegar diluted in warm water — may thin mucus",
    ],
  },
  {
    id: "strep-throat",
    name: "Strep Throat",
    category: "Bacterial Infection",
    description:
      "A bacterial throat infection caused by Streptococcus pyogenes. Unlike viral sore throat, strep requires antibiotic treatment.",
    symptomWeights: {
      "Sore Throat": 4, "Fever": 3, "Difficulty Swallowing": 3,
      "Swollen Lymph Nodes": 3, "Fatigue": 2, "Headache": 1.5,
      "General Pain": 1.5, "Loss of Appetite": 1,
    },
    minScore: 25,
    isEmergency: false,
    suggestedActions: [
      "See a doctor for a strep test — do not self-diagnose",
      "Complete the full antibiotic course if prescribed",
      "Rest your voice and avoid irritants like smoke",
      "Stay home for 24 hours after starting antibiotics",
    ],
    medications: [
      { name: "Penicillin / Amoxicillin", note: "First-line treatment — requires prescription" },
      { name: "Azithromycin", note: "For penicillin allergy — requires prescription" },
      { name: "Paracetamol / Ibuprofen", note: "For pain and fever relief" },
    ],
    homeRemedies: [
      "Warm salt water gargling every 2 hours",
      "Honey and warm water - natural antibacterial soothing effect",
      "Chamomile tea with honey to reduce inflammation",
      "Cold foods (ice cream, cold water) to numb throat pain",
      "Peppermint oil diluted in water — natural pain reliever",
    ],
  },
  {
    id: "pneumonia",
    name: "Pneumonia",
    category: "Lung Infection",
    description:
      "An infection that inflames air sacs in one or both lungs. Can be viral, bacterial, or fungal. Severe cases require hospitalization.",
    symptomWeights: {
      "Cough": 3, "Fever": 3, "Difficulty Breathing": 4, "Chills": 2.5,
      "Chest Pain": 3, "Fatigue": 2.5, "Shortness of Breath": 3.5,
      "Coughing Blood": 2, "General Pain": 1.5, "Loss of Appetite": 1,
    },
    minScore: 25,
    isEmergency: true,
    emergencyMessage: "Pneumonia symptoms detected. If you have difficulty breathing or chest pain, seek emergency care immediately.",
    suggestedActions: [
      "⚠️ Seek medical care URGENTLY — do not delay",
      "If breathing is very difficult, call emergency services",
      "A chest X-ray is needed for diagnosis",
      "Hospitalization may be required for severe cases",
    ],
    medications: [
      { name: "Antibiotics (if bacterial)", note: "Requires prescription — type depends on causative organism" },
      { name: "Antiviral medications", note: "If viral pneumonia is confirmed — discussed with doctor" },
      { name: "Oxygen therapy", note: "May be required in hospital setting" },
    ],
    homeRemedies: [
      "Rest completely — do not exert yourself",
      "Drink fluids constantly to stay hydrated",
      "Use a humidifier to ease breathing",
      "Deep breathing exercises as tolerated",
    ],
  },
  {
    id: "asthma",
    name: "Asthma",
    category: "Respiratory",
    description:
      "A chronic condition in which airways narrow and produce extra mucus. Can be triggered by allergens, exercise, air pollution, or infections.",
    symptomWeights: {
      "Wheezing": 4, "Shortness of Breath": 3.5, "Chest Tightness": 3.5,
      "Cough": 3, "Persistent Cough": 3, "Difficulty Breathing": 3,
      "Fatigue": 1, "Night Sweats": 1,
    },
    minScore: 22,
    isEmergency: false,
    suggestedActions: [
      "Use your prescribed rescue inhaler if symptoms occur",
      "Identify and avoid personal asthma triggers",
      "Follow your Asthma Action Plan as guided by your doctor",
      "Seek emergency care if rescue inhaler doesn't help within 20 minutes",
    ],
    medications: [
      { name: "Short-acting bronchodilators (e.g. salbutamol)", note: "Rescue inhaler — for immediate symptom relief" },
      { name: "Inhaled corticosteroids", note: "Long-term controller — requires prescription" },
      { name: "Montelukast", note: "Leukotriene modifier for allergy-triggered asthma — Rx required" },
    ],
    homeRemedies: [
      "Pursed-lip breathing technique to reduce breathlessness",
      "Ginger tea — natural bronchodilator properties",
      "Keep indoor air clean with HEPA filter purifier",
      "Breathing exercises (diaphragmatic breathing) daily",
      "Avoid tobacco smoke and strong chemical fumes",
    ],
  },
  {
    id: "gerd",
    name: "Acid Reflux / GERD",
    category: "Digestive",
    description:
      "Gastroesophageal reflux disease occurs when stomach acid frequently flows back into the esophagus, causing heartburn and discomfort.",
    symptomWeights: {
      "Heartburn": 4, "Indigestion": 3.5, "Nausea": 2, "Hoarseness": 1.5,
      "Sore Throat": 1, "Cough": 1.5, "Chest Pain": 1.5, "Bloating": 1.5,
      "Loss of Appetite": 1,
    },
    minScore: 20,
    isEmergency: false,
    suggestedActions: [
      "Avoid eating 2–3 hours before bedtime",
      "Elevate the head of your bed by 15–20 cm",
      "Avoid trigger foods: spicy, fatty, citrus, caffeine, alcohol",
      "Maintain a healthy weight — excess weight worsens reflux",
    ],
    medications: [
      { name: "Antacids (e.g. Gaviscon, Tums)", note: "Fast relief — OTC, for occasional use" },
      { name: "H2 Blockers (e.g. famotidine)", note: "Reduce acid production — OTC and Rx available" },
      { name: "Proton Pump Inhibitors (e.g. omeprazole)", note: "Most effective for frequent reflux — consult doctor" },
    ],
    homeRemedies: [
      "Aloe vera juice — soothes esophageal lining",
      "Baking soda in water (1/2 tsp) — neutralizes acid temporarily",
      "Ginger tea before meals — natural digestive aid",
      "Chew sugar-free gum after meals — stimulates saliva to neutralize acid",
      "DGL licorice supplements — may reduce symptoms",
    ],
  },
  {
    id: "gastroenteritis",
    name: "Gastroenteritis (Stomach Flu)",
    category: "Digestive",
    description:
      "Inflammation of the stomach and intestines, usually caused by a viral or bacterial infection. Highly contagious.",
    symptomWeights: {
      "Nausea": 3.5, "Vomiting": 4, "Diarrhea": 4, "Abdominal Pain": 3,
      "Fever": 2, "Cramping": 3, "Fatigue": 2, "Dehydration": 3,
      "Loss of Appetite": 2, "General Pain": 1,
    },
    minScore: 22,
    isEmergency: false,
    suggestedActions: [
      "Stay hydrated — sip clear fluids frequently (ORS/electrolyte solutions)",
      "Follow BRAT diet: Bananas, Rice, Applesauce, Toast",
      "Rest at home and avoid preparing food for others",
      "Seek medical care if vomiting lasts >48 hrs or blood appears in stool",
    ],
    medications: [
      { name: "Oral Rehydration Solution (ORS)", note: "Critical for preventing dehydration — OTC available" },
      { name: "Loperamide (Imodium)", note: "For diarrhea — do not use if fever/bloody stool present" },
      { name: "Ondansetron", note: "Anti-nausea — requires prescription" },
    ],
    homeRemedies: [
      "Clear broth to replenish fluids and electrolytes",
      "Ginger tea to settle the stomach",
      "Probiotic yogurt once vomiting stops — restores gut flora",
      "Peppermint tea for cramp relief",
      "Plain rice water (kanji) — binding and hydrating",
    ],
  },
  {
    id: "migraine",
    name: "Migraine",
    category: "Neurological",
    description:
      "A neurological condition characterized by intense, throbbing headaches, often accompanied by nausea and sensitivity to light and sound.",
    symptomWeights: {
      "Headache": 4, "Migraine": 5, "Nausea": 2.5, "Vomiting": 2,
      "Blurred Vision": 2, "Fatigue": 1.5, "Dizziness": 1.5,
      "Sensitivity to Light": 2,
    },
    minScore: 20,
    isEmergency: false,
    suggestedActions: [
      "Rest in a dark, quiet room during an attack",
      "Apply a cold or warm compress to the head/neck",
      "Keep a migraine diary to identify triggers",
      "Consult a neurologist for preventive medications",
    ],
    medications: [
      { name: "Triptans (e.g. sumatriptan)", note: "Most effective migraine-specific treatment — requires prescription" },
      { name: "Ibuprofen / Paracetamol", note: "For mild-to-moderate migraines — OTC" },
      { name: "Anti-nausea medication", note: "If nausea is significant — discuss with doctor" },
    ],
    homeRemedies: [
      "Peppermint oil on temples and forehead during onset",
      "Lavender oil aromatherapy — may reduce severity",
      "Stay hydrated — dehydration is a common trigger",
      "Caffeine in small amounts may abort early migraine attacks",
      "Magnesium-rich foods (dark chocolate, pumpkin seeds) for prevention",
    ],
  },
  {
    id: "anemia",
    name: "Anemia",
    category: "Blood",
    description:
      "A condition where you lack enough healthy red blood cells to carry adequate oxygen to your body's tissues. Iron deficiency is the most common type.",
    symptomWeights: {
      "Fatigue": 4, "Weakness": 3.5, "Dizziness": 3, "Cold Hands": 3,
      "Headache": 2, "Shortness of Breath": 2, "Pale Skin": 2,
      "Lack of Focus": 1.5, "Low Motivation": 1,
    },
    minScore: 20,
    isEmergency: false,
    suggestedActions: [
      "Get a blood test (CBC) to confirm and identify the type of anemia",
      "Eat iron-rich foods: red meat, spinach, lentils, tofu",
      "Consume Vitamin C alongside iron-rich foods to enhance absorption",
      "Avoid coffee/tea with meals — they inhibit iron absorption",
    ],
    medications: [
      { name: "Iron supplements (ferrous sulfate)", note: "For iron-deficiency anemia — confirm with doctor first" },
      { name: "Vitamin B12 supplements", note: "For B12-deficiency anemia — OTC available" },
      { name: "Folic acid", note: "For folate-deficiency anemia — consult doctor for dosage" },
    ],
    homeRemedies: [
      "Pomegranate juice — rich in iron and antioxidants",
      "Beetroot juice — boosts iron levels naturally",
      "Eat spinach with lemon juice to maximize iron absorption",
      "Black sesame seeds with honey — traditional iron tonic",
      "Cook in cast iron pans — increases iron content of food",
    ],
  },
  {
    id: "diabetes-t2",
    name: "Type 2 Diabetes (Indicators)",
    category: "Metabolic",
    description:
      "A chronic condition affecting how your body metabolizes sugar. These symptoms may indicate undiagnosed or uncontrolled diabetes.",
    symptomWeights: {
      "Excessive Thirst": 4, "Frequent Urination": 4, "Fatigue": 3,
      "Blurred Vision": 2.5, "Slow Healing": 3, "Tingling": 2,
      "Weight Loss": 2, "Weakness": 2, "Loss of Appetite": 1,
    },
    minScore: 22,
    isEmergency: false,
    suggestedActions: [
      "See a doctor immediately for a fasting blood glucose test",
      "Monitor blood sugar levels regularly if diagnosed",
      "Adopt a low-glycaemic diet — reduce refined sugars and carbohydrates",
      "Exercise at least 150 minutes per week",
    ],
    medications: [
      { name: "Metformin", note: "First-line medication for T2D — requires prescription" },
      { name: "SGLT-2 inhibitors / GLP-1 agonists", note: "Newer classes with additional benefits — consult endocrinologist" },
      { name: "Insulin", note: "For advanced or uncontrolled diabetes — prescribed by doctor" },
    ],
    homeRemedies: [
      "Cinnamon in warm water — may improve insulin sensitivity",
      "Bitter melon (karela) juice — traditional blood sugar lowering remedy",
      "Fenugreek seeds soaked overnight — helps with glycaemic control",
      "Apple cider vinegar (1 tbsp in water before meals)",
      "Increase dietary fiber: oats, legumes, vegetables",
    ],
  },
  {
    id: "anxiety",
    name: "Anxiety Disorder",
    category: "Mental Health",
    description:
      "A mental health condition characterized by persistent excessive worry, fear, and physical symptoms. Very common and highly treatable.",
    symptomWeights: {
      "Anxiety": 5, "Palpitations": 3, "Restlessness": 3.5, "Insomnia": 3,
      "Rapid Heartbeat": 2.5, "Panic Attacks": 4, "Lack of Focus": 2.5,
      "Dizziness": 1.5, "Fatigue": 1.5, "Shortness of Breath": 1.5,
      "Chest Tightness": 1.5, "Muscle Aches": 1, "Headache": 1,
    },
    minScore: 22,
    isEmergency: false,
    suggestedActions: [
      "Speak with a mental health professional (therapist or psychiatrist)",
      "Practice mindfulness and deep breathing exercises daily",
      "Limit caffeine and alcohol — both worsen anxiety",
      "Establish a consistent sleep schedule",
    ],
    medications: [
      { name: "SSRIs (e.g. sertraline, escitalopram)", note: "First-line treatment — requires psychiatrist prescription" },
      { name: "Buspirone", note: "Non-addictive anti-anxiety — requires prescription" },
      { name: "Benzodiazepines (short-term only)", note: "For acute anxiety — requires prescription, risk of dependence" },
    ],
    homeRemedies: [
      "4-7-8 breathing: Inhale 4s, hold 7s, exhale 8s",
      "Chamomile tea — natural mild anxiolytic",
      "Regular aerobic exercise — proven to reduce anxiety",
      "Lavender aromatherapy — reduces cortisol levels",
      "Journaling — helps process anxious thoughts",
      "Ashwagandha supplements — adaptogen with anxiety-reducing evidence",
    ],
  },
  {
    id: "depression",
    name: "Major Depressive Disorder",
    category: "Mental Health",
    description:
      "A serious mood disorder marked by persistent feelings of sadness, hopelessness, and loss of interest in activities.",
    symptomWeights: {
      "Depression": 5, "Low Motivation": 4, "Fatigue": 3.5, "Insomnia": 3,
      "Weight Loss": 2, "Weight Gain": 2, "Loss of Appetite": 2.5,
      "Lack of Focus": 2.5, "Mood Swings": 2, "Irritability": 2,
      "Memory Issues": 1.5,
    },
    minScore: 22,
    isEmergency: false,
    suggestedActions: [
      "Talk to a doctor or mental health professional as soon as possible",
      "If you have thoughts of self-harm, call a crisis helpline immediately",
      "Try to maintain a daily routine even when difficult",
      "Reach out to trusted friends or family — do not isolate",
    ],
    medications: [
      { name: "SSRIs (e.g. fluoxetine, sertraline)", note: "Most common antidepressants — requires psychiatrist prescription" },
      { name: "SNRIs (e.g. venlafaxine)", note: "Alternative class for depression — requires prescription" },
      { name: "Therapy (CBT)", note: "Cognitive Behavioral Therapy is highly effective alongside medication" },
    ],
    homeRemedies: [
      "Sunlight exposure 20–30 minutes daily — boosts serotonin",
      "Regular exercise (especially outdoor walking) — proven antidepressant effect",
      "Omega-3 fatty acids (fish oil) — associated with improved mood",
      "St John's Wort (Hypericum) — evidence for mild depression, check drug interactions",
      "Social connection — even brief positive social interactions help",
    ],
  },
  {
    id: "back-strain",
    name: "Lumbar Strain / Back Pain",
    category: "Musculoskeletal",
    description:
      "Muscle or ligament strain of the lower back. The most common cause of back pain, often triggered by improper lifting or poor posture.",
    symptomWeights: {
      "Back Pain": 5, "Muscle Aches": 3, "Stiffness": 3, "General Pain": 2,
      "Weakness": 1.5, "Numbness": 1.5, "Tingling": 1.5,
    },
    minScore: 25,
    isEmergency: false,
    suggestedActions: [
      "Rest for 1–2 days but avoid prolonged bed rest",
      "Apply ice for the first 48 hours, then switch to heat",
      "Consider physiotherapy for chronic or recurring pain",
      "See a doctor if pain radiates down the leg (possible sciatica)",
    ],
    medications: [
      { name: "Ibuprofen / Naproxen", note: "NSAIDs for pain and inflammation — OTC with meals" },
      { name: "Muscle relaxants (e.g. cyclobenzaprine)", note: "For acute muscle spasm — requires prescription" },
      { name: "Topical diclofenac gel", note: "Applied directly to painful area — OTC available" },
    ],
    homeRemedies: [
      "Ice pack wrapped in cloth, 20 minutes on/off, for acute pain",
      "Heat pad or warm bath for muscle relaxation after 48 hours",
      "Turmeric milk — natural anti-inflammatory",
      "Gentle yoga stretches (cat-cow, child pose) once acute pain subsides",
      "Magnesium supplements — may help with muscle cramps",
    ],
  },
  {
    id: "arthritis",
    name: "Osteoarthritis",
    category: "Musculoskeletal",
    description:
      "Degenerative joint disease causing cartilage breakdown. Most common type of arthritis, often affecting knees, hips, and hands.",
    symptomWeights: {
      "Joint Pain": 5, "Stiffness": 4, "Swelling": 3, "Knee Pain": 3.5,
      "Hip Pain": 3.5, "Shoulder Pain": 2.5, "Ankle Swelling": 2,
      "General Pain": 2, "Weakness": 1.5, "Fatigue": 1,
    },
    minScore: 22,
    isEmergency: false,
    suggestedActions: [
      "Consult a rheumatologist for diagnosis and management plan",
      "Exercise regularly — low-impact: swimming, cycling, walking",
      "Maintain a healthy weight to reduce joint strain",
      "Physical therapy to strengthen muscles around affected joints",
    ],
    medications: [
      { name: "Paracetamol", note: "First-line for mild joint pain — OTC" },
      { name: "NSAIDs (ibuprofen/naproxen)", note: "For moderate pain and inflammation — consult doctor for long-term use" },
      { name: "Glucosamine + Chondroitin", note: "Supplements with some evidence for joint health — OTC" },
    ],
    homeRemedies: [
      "Warm castor oil massage on affected joints",
      "Turmeric (curcumin) supplements — strong anti-inflammatory evidence",
      "Epsom salt baths — magnesium absorbed through skin eases joint pain",
      "Omega-3 rich diet (salmon, walnuts, flaxseed)",
      "Cold packs during flare-ups to reduce inflammation",
    ],
  },
  {
    id: "uti",
    name: "Urinary Tract Infection (UTI)",
    category: "Urological",
    description:
      "A bacterial infection affecting any part of the urinary system. Most commonly affects the bladder (cystitis). More common in women.",
    symptomWeights: {
      "Frequent Urination": 4, "Blood in Urine": 4, "Abdominal Pain": 2.5,
      "General Pain": 2, "Fever": 2, "Fatigue": 1.5, "Loss of Appetite": 1,
    },
    minScore: 22,
    isEmergency: false,
    suggestedActions: [
      "See a doctor for a urine test — UTI requires antibiotics",
      "Drink plenty of water to flush bacteria",
      "Avoid holding urine — urinate frequently",
      "Seek urgent care if you have fever + back pain (possible kidney infection)",
    ],
    medications: [
      { name: "Trimethoprim / Nitrofurantoin", note: "Common UTI antibiotics — requires prescription" },
      { name: "Phenazopyridine", note: "Pain relief for urinary burning — OTC, turns urine orange" },
      { name: "Cranberry extract", note: "May help prevent recurrent UTIs — OTC supplement" },
    ],
    homeRemedies: [
      "Drink 2–3 litres of water daily to flush bacteria",
      "Unsweetened cranberry juice — prevents bacterial adhesion",
      "D-Mannose powder in water — binds E.coli and flushes it out",
      "Avoid caffeine, alcohol, and spicy foods until resolved",
      "Probiotics to restore healthy urinary microbiome",
    ],
  },
  {
    id: "cardiac-emergency",
    name: "Possible Cardiac Event",
    category: "Cardiovascular (Emergency)",
    description:
      "The combination of symptoms you've reported may indicate a serious cardiovascular event such as a heart attack or angina. This requires immediate medical evaluation.",
    symptomWeights: {
      "Chest Pain": 5, "Rapid Heartbeat": 4, "Palpitations": 3.5,
      "Shortness of Breath": 4, "Difficulty Breathing": 4,
      "Fatigue": 2, "Dizziness": 2.5, "Fainting": 3,
      "General Pain": 2, "Weakness": 2,
    },
    minScore: 30,
    isEmergency: true,
    emergencyMessage: "⚠️ URGENT: Chest pain with breathing difficulty and rapid heartbeat can indicate a heart attack. Call emergency services (112/911) immediately.",
    suggestedActions: [
      "🚨 Call emergency services (112 / 911) IMMEDIATELY",
      "Chew one regular aspirin (325mg) if not allergic and instructed",
      "Sit or lie down in a comfortable position",
      "Do NOT drive yourself to the hospital",
      "Unlock the front door so paramedics can enter",
    ],
    medications: [
      { name: "Aspirin 325mg (chewed)", note: "Only if not allergic and advised by emergency dispatcher" },
      { name: "Nitroglycerin (sublingual)", note: "Only if prescribed for you previously" },
    ],
    homeRemedies: [
      "⛔ NO home remedies — this is a medical emergency. Call 112/911 now.",
    ],
  },
];

// ── Scoring Engine ───────────────────────────────────────────────────────────

export function analyzeSymptoms(inputSymptoms: string[]): AnalysisResult {
  if (inputSymptoms.length === 0) {
    return { conditions: [], hasEmergency: false, emergencyMessages: [], inputSymptoms: [], generalActions: [] };
  }

  const inputSet = new Set(inputSymptoms);

  // Score each condition
  const ranked: RankedCondition[] = CONDITIONS.map((cond) => {
    const weights = cond.symptomWeights;
    const maxPossible = Object.values(weights).reduce((a, b) => a + b, 0);
    
    const matchedSymptoms: string[] = [];
    let rawScore = 0;
    
    for (const symptom of inputSymptoms) {
      if (weights[symptom] !== undefined) {
        matchedSymptoms.push(symptom);
        rawScore += weights[symptom];
      }
    }

    if (matchedSymptoms.length === 0) return null as unknown as RankedCondition;

    // Normalized 0–100 score, with bonus for matching many symptoms
    const overlapRatio = matchedSymptoms.length / Object.keys(weights).length;
    const normalizedScore = Math.min(100, Math.round((rawScore / maxPossible) * 100 * (1 + overlapRatio * 0.3)));

    // Symptom contributions
    const symptomContributions: Record<string, number> = {};
    for (const s of matchedSymptoms) {
      symptomContributions[s] = Math.round((weights[s] / rawScore) * 100);
    }

    return {
      ...cond,
      score: normalizedScore,
      matchedSymptoms,
      symptomContributions,
    };
  })
  .filter((c) => c !== null && c.score >= c.minScore)
  .sort((a, b) => b.score - a.score)
  .slice(0, 6); // top 6 results

  // Detect emergencies
  const emergencyMessages: string[] = [];
  for (const combo of EMERGENCY_COMBOS) {
    const allMatch = combo.symptoms.every((s) => inputSet.has(s));
    if (allMatch) emergencyMessages.push(combo.message);
  }
  // Also add emergency messages from emergency conditions if they score
  for (const cond of ranked) {
    if (cond.isEmergency && cond.emergencyMessage && !emergencyMessages.includes(cond.emergencyMessage)) {
      emergencyMessages.unshift(cond.emergencyMessage);
    }
  }

  const hasEmergency = emergencyMessages.length > 0;

  const generalActions = [
    "This analysis is for informational purposes only and does not constitute medical advice.",
    "Always consult a qualified healthcare professional for diagnosis and treatment.",
    "In case of severe or worsening symptoms, seek medical attention promptly.",
    "If you are unsure about any symptom, err on the side of caution and see a doctor.",
  ];

  return { conditions: ranked, hasEmergency, emergencyMessages, inputSymptoms, generalActions };
}
