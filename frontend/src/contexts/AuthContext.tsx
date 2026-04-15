import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
export interface SymptomEntry {
  id: string;
  symptoms: string[];
  timestamp: string; // ISO string
}

interface StoredUser {
  email: string;
  // We store a simple hash (not crypto-secure, but suitable for local demo)
  passwordHash: string;
  name: string;
  symptomHistory: SymptomEntry[];
}

interface AuthContextType {
  currentUser: StoredUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (name: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "healthcare_users";
const SESSION_KEY = "healthcare_session";

/** Very lightweight hash — suitable for a local-storage demo only. */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function loadUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function loadSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function saveSession(email: string | null) {
  if (email) localStorage.setItem(SESSION_KEY, email);
  else localStorage.removeItem(SESSION_KEY);
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAuthenticated: false,
  login: () => ({ success: false }),
  register: () => ({ success: false }),
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<StoredUser[]>(loadUsers);
  const [currentEmail, setCurrentEmail] = useState<string | null>(loadSession);

  const currentUser = users.find((u) => u.email === currentEmail) ?? null;

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (data.success) {
          setCurrentEmail(data.user.email);
          saveSession(data.user.email);
          // In a real app, we'd store the mock user list or fetch from /api/me
          setUsers((prev) => {
            if (prev.find((u) => u.email === data.user.email)) return prev;
            return [...prev, data.user];
          });
          return { success: true };
        }
        return { success: false, error: data.error || "Login failed" };
      } catch (err) {
        return { success: false, error: "Network error" };
      }
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await response.json();
        if (data.success) {
          setCurrentEmail(data.user.email);
          saveSession(data.user.email);
          setUsers((prev) => [...prev, data.user]);
          return { success: true };
        }
        return { success: false, error: data.error || "Registration failed" };
      } catch (err) {
        return { success: false, error: "Network error" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setCurrentEmail(null);
      saveSession(null);
    }
  }, []);


  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentEmail,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
