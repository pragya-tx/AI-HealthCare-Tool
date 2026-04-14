import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Bot, User, Sparkles } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  loading?: boolean;
}

// ── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.sender === "user";
  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? "bg-secondary" : "bg-primary/10"
      }`}>
        {isUser ? <User className="h-4 w-4 text-secondary-foreground" /> : <Bot className="h-4 w-4 text-primary" />}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
        isUser
          ? "hero-gradient text-primary-foreground rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm"
      }`}>
        {msg.loading ? (
          <div className="flex gap-1 items-center py-1">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-2 w-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
        )}
      </div>
    </div>
  );
}

// ── Main Chat Page ───────────────────────────────────────────────────────────
export default function Chat() {
  const { currentUser } = useAuth();
  const firstName = currentUser?.name?.split(" ")[0] ?? "there";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello ${firstName}! 👋 I'm your health assistant.\n\nYou can describe your symptoms, ask about conditions, or share how you're feeling. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: "user" };
    const loadingMsg: Message = { id: "loading", text: "", sender: "ai", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: Date.now().toString(),
          sender: "ai",
          text: "Thank you for sharing that. Please remember that I'm not a substitute for professional medical advice. If your symptoms are severe or persistent, consider consulting a healthcare provider.",
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  const quickPrompts = [
    "What should I do for a headache?",
    "Home remedies for a cold?",
    "How do I know if I need to see a doctor?",
  ];

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Health Assistant
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">Your personal health companion</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompt chips */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap border-t border-border/30 pt-3">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => setInput(p)}
                className="text-xs px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-medium"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/50 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Describe your symptoms or ask a health question…"
            disabled={isLoading}
            className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-10 w-10 rounded-xl hero-gradient flex items-center justify-center text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-muted-foreground mt-2">
        Responses are for informational purposes only • Not a substitute for professional medical advice
      </p>
    </div>
  );
}
