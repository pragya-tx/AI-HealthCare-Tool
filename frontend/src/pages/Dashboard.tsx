import { useLanguage } from "@/contexts/LanguageContext";
import { Heart, Activity, Moon, Footprints } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const weeklyData = [
  { day: "Mon", heartRate: 72, steps: 6200, sleep: 7.2 },
  { day: "Tue", heartRate: 75, steps: 8100, sleep: 6.8 },
  { day: "Wed", heartRate: 70, steps: 5400, sleep: 7.5 },
  { day: "Thu", heartRate: 78, steps: 9300, sleep: 6.5 },
  { day: "Fri", heartRate: 74, steps: 7600, sleep: 7.0 },
  { day: "Sat", heartRate: 68, steps: 4200, sleep: 8.1 },
  { day: "Sun", heartRate: 71, steps: 3800, sleep: 8.4 },
];

const monthlyData = [
  { week: "W1", consultations: 2, symptoms: 5 },
  { week: "W2", consultations: 1, symptoms: 3 },
  { week: "W3", consultations: 3, symptoms: 7 },
  { week: "W4", consultations: 1, symptoms: 2 },
];

export default function Dashboard() {
  const { t } = useLanguage();

  const stats = [
    { icon: Heart, label: t.heartRate, value: "72 bpm", color: "bg-stat-rose/15 text-stat-rose" },
    { icon: Activity, label: t.bloodPressure, value: "120/80", color: "bg-stat-blue/15 text-stat-blue" },
    { icon: Moon, label: t.sleepHours, value: "7.5 hrs", color: "bg-stat-amber/15 text-stat-amber" },
    { icon: Footprints, label: t.stepsToday, value: "8,240", color: "bg-stat-green/15 text-stat-green" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.analyticsTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.analyticsSub}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border/50 p-4 card-elevated">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-card-foreground mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly Chart */}
      <div className="bg-card rounded-xl border border-border/50 p-5 card-elevated">
        <h3 className="font-semibold text-card-foreground mb-4">{t.weeklyTrend}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Line type="monotone" dataKey="heartRate" stroke="hsl(var(--stat-rose))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sleep" stroke="hsl(var(--stat-amber))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Chart */}
      <div className="bg-card rounded-xl border border-border/50 p-5 card-elevated">
        <h3 className="font-semibold text-card-foreground mb-4">{t.monthlyOverview}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="consultations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="symptoms" fill="hsl(var(--stat-blue))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
