import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeSymptoms, type RankedCondition, type AnalysisResult } from "@/lib/symptomEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, ChevronDown, ChevronUp, ArrowLeft, Stethoscope,
  Pill, Leaf, Lightbulb, CheckCircle2, MessageCircle,
  Shield, Activity,
} from "lucide-react";

// ── Animated Progress Bar ────────────────────────────────────────────────────
function AnimatedBar({ score, color = "bg-primary" }: { score: number; color?: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 120);
    return () => clearTimeout(t);
  }, [score]);

  const barColor =
    score >= 70 ? "bg-red-500" :
    score >= 45 ? "bg-amber-500" :
    "bg-emerald-500";

  return (
    <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ── Emergency Banner ─────────────────────────────────────────────────────────
function EmergencyBanner({ messages }: { messages: string[] }) {
  return (
    <div className="rounded-2xl border-2 border-red-500 bg-red-500/10 p-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-500 flex items-center justify-center shrink-0 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-red-600 dark:text-red-400 text-base mb-1">
            ⚠️ Emergency Warning
          </h3>
          {messages.map((msg, i) => (
            <p key={i} className="text-sm text-red-700 dark:text-red-300 leading-relaxed mb-1">
              {msg}
            </p>
          ))}
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2 font-semibold">
            Call emergency services: 112 (India) / 911 (US) / 999 (UK)
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Collapsible Section ──────────────────────────────────────────────────────
function CollapsibleSection({
  title, icon: Icon, children, defaultOpen = false, variant = "default",
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: "default" | "warning";
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      variant === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-border/50"
    }`}>
      <button
        onClick={() => setOpen((s) => !s)}
        className={`w-full flex items-center gap-2.5 p-3.5 text-left transition-colors hover:bg-muted/40 ${
          variant === "warning" ? "hover:bg-amber-500/10" : ""
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${variant === "warning" ? "text-amber-500" : "text-primary"}`} />
        <span className="text-sm font-semibold flex-1">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border/30 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Condition Card ───────────────────────────────────────────────────────────
function ConditionCard({ condition, rank }: { condition: RankedCondition; rank: number }) {
  const [expanded, setExpanded] = useState(rank === 1); // top result expanded by default

  const scoreColor =
    condition.score >= 70 ? "text-red-500" :
    condition.score >= 45 ? "text-amber-500" :
    "text-emerald-600 dark:text-emerald-400";

  const categoryColor =
    condition.isEmergency ? "bg-red-500/15 text-red-600 border-red-500/20" :
    condition.score >= 70 ? "bg-amber-500/15 text-amber-700 border-amber-500/20" :
    "bg-primary/10 text-primary border-primary/20";

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden card-elevated transition-all duration-200 ${
      condition.isEmergency ? "border-red-500/50" : "border-border/50"
    }`}>
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold text-muted-foreground">#{rank}</span>
              <h3 className="font-bold text-card-foreground text-base">{condition.name}</h3>
              {condition.isEmergency && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">URGENT</span>
              )}
            </div>
            <Badge variant="outline" className={`text-xs ${categoryColor}`}>
              {condition.category}
            </Badge>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-extrabold ${scoreColor}`}>{condition.score}%</p>
            <p className="text-[10px] text-muted-foreground">match</p>
          </div>
        </div>

        {/* Progress bar */}
        <AnimatedBar score={condition.score} />

        {/* Matched symptoms */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {condition.matchedSymptoms.map((s) => (
            <span key={s} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {s}
            </span>
          ))}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Collapse details" : "View details"}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border/40 px-5 pb-5 pt-4 space-y-3 animate-fade-in">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{condition.description}</p>

          {/* Symptom contribution */}
          <CollapsibleSection title="Symptom Contribution Breakdown" icon={Activity} defaultOpen={true}>
            <div className="space-y-2 mt-1">
              {Object.entries(condition.symptomContributions)
                .sort(([, a], [, b]) => b - a)
                .map(([symptom, pct]) => (
                  <div key={symptom}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{symptom}</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CollapsibleSection>

          {/* Suggested Actions */}
          <CollapsibleSection title="Suggested Actions" icon={CheckCircle2} defaultOpen={true}>
            <ul className="space-y-2 mt-1">
              {condition.suggestedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-foreground/80">{action}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          {/* Medications */}
          <CollapsibleSection title="Medication Suggestions (Informational Only)" icon={Pill} variant="warning">
            <div className="mt-2 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                ⚠️ These suggestions are for informational purposes only. Always consult a licensed doctor or pharmacist before taking any medication.
              </p>
            </div>
            <div className="space-y-2.5">
              {condition.medications.map((med, i) => (
                <div key={i} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-sm font-semibold text-foreground">{med.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{med.note}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Home Remedies */}
          <CollapsibleSection title="Home Remedies & Self-Care" icon={Leaf}>
            <ul className="space-y-2 mt-1">
              {condition.homeRemedies.map((remedy, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Leaf className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-foreground/80">{remedy}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

// ── Main Analysis Page ───────────────────────────────────────────────────────
export default function Analysis() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Get symptoms from navigation state OR last auth history entry
  const stateSymptoms: string[] | undefined = location.state?.symptoms;
  const historySymptoms = currentUser?.symptomHistory?.[0]?.symptoms ?? [];
  const symptoms = stateSymptoms ?? historySymptoms;

  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (symptoms.length > 0) setResult(analyzeSymptoms(symptoms));
  }, [symptoms.join(",")]);

  if (symptoms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Stethoscope className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">No symptoms to analyze</h1>
        <p className="text-muted-foreground">Go back to the Symptoms page and select your symptoms first.</p>
        <Button onClick={() => navigate("/symptoms")} className="hero-gradient border-0 mt-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Symptoms
        </Button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Analyzing your symptoms…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/symptoms")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Symptoms
        </button>
        <h1 className="text-2xl font-bold text-foreground">Symptom Analysis Results</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Analyzed <strong>{symptoms.length}</strong> symptom{symptoms.length !== 1 ? "s" : ""} •{" "}
          <strong>{result.conditions.length}</strong> possible condition{result.conditions.length !== 1 ? "s" : ""} identified
        </p>
      </div>

      {/* Emergency Banner */}
      {result.hasEmergency && <EmergencyBanner messages={result.emergencyMessages} />}

      {/* Analyzed Symptoms Summary */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 card-elevated">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-card-foreground">Symptoms Analyzed</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {symptoms.map((s) => (
            <span key={s} className="text-sm bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-medium">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* No matches */}
      {result.conditions.length === 0 && (
        <div className="bg-card rounded-2xl border border-border/50 p-8 text-center card-elevated">
          <p className="text-muted-foreground">No strong condition matches found for the selected symptoms.</p>
          <p className="text-sm text-muted-foreground mt-1">Try selecting more specific symptoms or consult a doctor.</p>
        </div>
      )}

      {/* Ranked Conditions */}
      {result.conditions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Possible Conditions (Ranked by Match)</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Low
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block ml-1" /> Medium
              <span className="h-2 w-2 rounded-full bg-red-500 inline-block ml-1" /> High
            </div>
          </div>
          {result.conditions.map((cond, i) => (
            <ConditionCard key={cond.id} condition={cond} rank={i + 1} />
          ))}
        </div>
      )}

      {/* General Disclaimer + Actions */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 card-elevated">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="font-semibold text-sm text-card-foreground">Important Disclaimer</h3>
            {result.generalActions.map((action, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">{action}</p>
            ))}
          </div>
        </div>
      </div>

      {/* CTA: Chat with AI Doctor */}
      <div className="hero-gradient rounded-2xl p-6 text-primary-foreground flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-bold text-lg">Discuss with AI Doctor</h3>
          <p className="text-primary-foreground/80 text-sm">
            Get personalized guidance about your symptoms in our AI chat.
          </p>
        </div>
        <Button
          onClick={() => navigate("/chat", { state: { symptoms } })}
          className="bg-primary-foreground/20 hover:bg-primary-foreground/30 border border-primary-foreground/30 text-primary-foreground shrink-0"
        >
          <MessageCircle className="h-4 w-4 mr-1.5" /> Open AI Chat
        </Button>
      </div>

      {/* Health Tip */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 flex gap-3 items-start card-elevated">
        <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Remember:</strong> A symptom checker is not a substitute for a medical professional. 
          These results are meant to inform, not diagnose. Please always consult a licensed doctor for proper evaluation and treatment.
        </p>
      </div>
    </div>
  );
}
