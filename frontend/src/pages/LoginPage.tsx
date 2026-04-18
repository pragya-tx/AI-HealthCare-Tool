import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Stethoscope, Eye, EyeOff, ShieldCheck, Activity, Brain } from "lucide-react";

type Mode = "signin" | "register";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      await new Promise((r) => setTimeout(r, 400)); // tiny delay for UX
      const result = await (
        mode === "signin"
          ? login(email, password)
          : register(name, email, password)
      );
      setLoading(false);
      if (!result.success) setError(result.error ?? "Something went wrong.");
    },
    [mode, name, email, password, login, register]
  );

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  const features = [
    { icon: Activity, text: "Track symptoms & health trends" },
    { icon: Brain, text: "AI-powered health insights" },
    { icon: ShieldCheck, text: "Private & secure — data stays on your device" },
  ];

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* ── Left Panel (hero) ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden hero-gradient flex-col items-center justify-center p-12 text-primary-foreground">
        {/* Decorative blobs */}
        <div className="absolute top-[-8rem] left-[-8rem] w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[-6rem] w-80 h-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight">Niramaya</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Your personal<br />health companion
          </h1>
          <p className="text-primary-foreground/75 mb-10 leading-relaxed text-lg">
            Log symptoms, chat with our AI doctor, and monitor your wellness — all in one beautiful dashboard.
          </p>

          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-primary-foreground/90 text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* ── Right Panel (form) ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl hero-gradient flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-extrabold text-primary">Niramaya</span>
        </div>

        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 mb-8">
            {(["signin", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === "signin" ? "Welcome back 👋" : "Get started today 🚀"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "signin"
                ? "Sign in to continue to your health dashboard."
                : "Create a free account — no credit card required."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "register" && (
              <div className="space-y-1.5 animate-fade-in">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
                  className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full hero-gradient text-primary-foreground rounded-xl py-3 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Your data is stored locally on this device and never sent to a server.
          </p>
        </div>
      </div>
    </div>
  );
}
