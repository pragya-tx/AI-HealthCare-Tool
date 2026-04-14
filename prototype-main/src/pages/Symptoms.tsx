import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

const symptomCategories = {
  general: [
    "Fever", "Fatigue", "Weight Loss", "Weight Gain", "Chills",
    "Night Sweats", "Loss of Appetite", "Dehydration", "Weakness",
    "Dizziness", "Fainting", "Swollen Lymph Nodes", "General Pain",
  ],
  headNeck: [
    "Headache", "Migraine", "Sore Throat", "Stiff Neck", "Ear Pain",
    "Blurred Vision", "Eye Redness", "Runny Nose", "Nasal Congestion",
    "Jaw Pain", "Difficulty Swallowing", "Hoarseness",
  ],
  chestLungs: [
    "Cough", "Shortness of Breath", "Chest Pain", "Wheezing",
    "Rapid Heartbeat", "Palpitations", "Chest Tightness",
    "Coughing Blood", "Difficulty Breathing", "Persistent Cough",
  ],
  abdomen: [
    "Nausea", "Vomiting", "Diarrhea", "Constipation", "Bloating",
    "Abdominal Pain", "Heartburn", "Loss of Appetite", "Bloody Stool",
    "Cramping", "Indigestion", "Gas",
  ],
  musculoskeletal: [
    "Back Pain", "Joint Pain", "Muscle Aches", "Swelling",
    "Stiffness", "Numbness", "Tingling", "Cramps", "Knee Pain",
    "Shoulder Pain", "Hip Pain", "Ankle Swelling",
  ],
  skinHair: [
    "Rash", "Itching", "Dry Skin", "Acne", "Bruising",
    "Hives", "Hair Loss", "Skin Discoloration", "Moles Change",
    "Blisters", "Eczema", "Psoriasis",
  ],
  mental: [
    "Anxiety", "Depression", "Insomnia", "Stress", "Mood Swings",
    "Memory Issues", "Confusion", "Irritability", "Panic Attacks",
    "Lack of Focus", "Restlessness", "Low Motivation",
  ],
  other: [
    "Frequent Urination", "Blood in Urine", "Menstrual Issues",
    "Sexual Dysfunction", "Swollen Feet", "Cold Hands",
    "Excessive Thirst", "Slow Healing", "Bruising Easily",
    "Snoring", "Teeth Grinding",
  ],
};

type Category = keyof typeof symptomCategories;

export default function Symptoms() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("general");

  const categoryLabels: Record<Category, string> = {
    general: t.general,
    headNeck: t.headNeck,
    chestLungs: t.chestLungs,
    abdomen: t.abdomen,
    musculoskeletal: t.musculoskeletal,
    skinHair: t.skinHair,
    mental: t.mental,
    other: t.other,
  };

  const toggle = (s: string) =>
    setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.selectSymptoms}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.selectSymptomsSub}</p>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-card-foreground">
              {t.selectedSymptoms} ({selected.length})
            </h3>
            <button onClick={() => setSelected([])} className="text-xs text-destructive hover:underline">
              {t.clearAll}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggle(s)}>
                {s} <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
          <Button className="mt-4 hero-gradient border-0" size="sm">
            <Search className="h-3.5 w-3.5 mr-1" /> {t.analyzeSymptoms}
          </Button>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(symptomCategories) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "hero-gradient text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary"
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Symptom grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {symptomCategories[activeCategory].map((symptom) => {
          const isSelected = selected.includes(symptom);
          return (
            <button
              key={symptom}
              onClick={() => toggle(symptom)}
              className={`rounded-xl border p-3 text-sm font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-card text-card-foreground hover:border-primary/30 card-elevated"
              }`}
            >
              {symptom}
            </button>
          );
        })}
      </div>
    </div>
  );
}
