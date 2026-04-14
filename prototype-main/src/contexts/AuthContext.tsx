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
    (email: string, password: string): { success: boolean; error?: string } => {
      const allUsers = loadUsers();
      const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
      if (!user) return { success: false, error: "No account found with this email." };
      if (user.passwordHash !== simpleHash(password))
        return { success: false, error: "Incorrect password." };
      setUsers(allUsers);
      setCurrentEmail(user.email);
      saveSession(user.email);
      return { success: true };
    },
    []
  );

  const register = useCallback(
    (name: string, email: string, password: string): { success: boolean; error?: string } => {
      const trimEmail = email.toLowerCase().trim();
      const allUsers = loadUsers();
      if (allUsers.find((u) => u.email === trimEmail))
        return { success: false, error: "An account with this email already exists." };
      if (password.length < 6)
        return { success: false, error: "Password must be at least 6 characters." };
      const newUser: StoredUser = {
        email: trimEmail,
        passwordHash: simpleHash(password),
        name: name.trim() || trimEmail.split("@")[0],
        symptomHistory: [],
      };
      const updated = [...allUsers, newUser];
      saveUsers(updated);
      setUsers(updated);
      setCurrentEmail(trimEmail);
      saveSession(trimEmail);
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentEmail(null);
    saveSession(null);
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
