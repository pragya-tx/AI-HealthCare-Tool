import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Clock, FileText, Stethoscope } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Profile() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  const history = currentUser?.symptomHistory ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t.userProfile}</h1>

      {/* Avatar & Info */}
      <div className="bg-card rounded-xl border border-border/50 p-6 card-elevated">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full hero-gradient flex items-center justify-center">
            <User className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-card-foreground">
              {currentUser?.name ?? "—"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.symptomEntries}: {history.length}
            </p>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-card-foreground mb-3">{t.personalInfo}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: User,  label: t.name,  value: currentUser?.name  ?? "—" },
            { icon: Mail,  label: t.email, value: currentUser?.email ?? "—" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Symptom History */}
      <div className="bg-card rounded-xl border border-border/50 p-6 card-elevated">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-card-foreground">{t.symptomHistory}</h3>
          {history.length > 0 && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {history.length} {history.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t.noHistory}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => (
              <div key={entry.id}>
                <div className="flex items-start gap-3 py-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <p className="text-sm font-medium text-card-foreground">{t.symptomCheck}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.symptoms.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {i < history.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
