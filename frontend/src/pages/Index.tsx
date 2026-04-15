import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Stethoscope, MessageCircle, LayoutDashboard, Lightbulb, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Index() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const firstName = currentUser?.name?.split(" ")[0] ?? "there";

  const recentHistory = (currentUser?.symptomHistory ?? []).slice(0, 3);

  const actions = [
    { icon: Stethoscope, title: t.checkSymptoms, sub: t.checkSymptomsSub, path: "/symptoms", color: "bg-primary/10 text-primary" },
    { icon: MessageCircle, title: t.chatDoctor, sub: t.chatDoctorSub, path: "/chat", color: "bg-accent text-accent-foreground" },
    { icon: LayoutDashboard, title: t.viewDashboard, sub: t.viewDashboardSub, path: "/dashboard", color: "bg-secondary text-secondary-foreground" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="hero-gradient rounded-2xl p-8 md:p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_hsl(190_60%_55%_/_0.3),_transparent_60%)]" />
        <div className="relative z-10 max-w-lg">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Hello, {firstName} 👋
          </h1>
          <p className="text-primary-foreground/80 mb-6 leading-relaxed">{t.welcomeSub}</p>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/symptoms")}
              className="bg-primary-foreground/20 hover:bg-primary-foreground/30 border border-primary-foreground/20 backdrop-blur-sm"
            >
              {t.getStarted} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t.quickActions}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="card-elevated bg-card rounded-xl p-5 text-left transition-all group border border-border/50"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${a.color}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-card-foreground mb-1">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Health Tip */}
      <div className="bg-card rounded-xl border border-border/50 p-5 flex gap-4 items-start card-elevated">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Lightbulb className="h-5 w-5 text-secondary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-card-foreground mb-1">{t.healthTip}</h3>
          <p className="text-sm text-muted-foreground">{t.healthTipText}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border border-border/50 p-5">
        <h3 className="font-semibold text-card-foreground mb-3">{t.recentActivity}</h3>
        {recentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noActivity}</p>
        ) : (
          <div className="space-y-3">
            {recentHistory.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-sm font-medium text-card-foreground">{t.symptomCheck}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelative(entry.timestamp)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.symptoms.slice(0, 4).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                    {entry.symptoms.length > 4 && (
                      <Badge variant="outline" className="text-xs">+{entry.symptoms.length - 4} more</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
