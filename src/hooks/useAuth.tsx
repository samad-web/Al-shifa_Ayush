
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AppRole = "ADMIN" | "ADMIN_DOCTOR" | "DOCTOR" | "THERAPIST" | "PATIENT" | "PHARMACIST";

interface AuthContextType {
  user: { id: string; email: string } | null;
  role: AppRole | null;
  profile: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function getStoredTokens() {
  return {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
  };
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from backend
  const fetchProfile = async (shouldThrow = false) => {
    const { accessToken } = getStoredTokens();
    console.log("[useAuth] fetchProfile called, accessToken exists:", !!accessToken);
    if (!accessToken) {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      console.log("[useAuth] Fetching /api/user/me...");
      const res = await fetch(`${API_BASE_URL}/api/user/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("[useAuth] /me response status:", res.status);
      if (!res.ok) {
        throw new Error(`Profile fetch failed: ${res.status}`);
      }
      const data = await res.json();
      console.log("[useAuth] Profile data received, role:", data.role);

      // Update all auth states atomically
      setUser({ id: data.id, email: data.email });
      setRole(data.role as AppRole);
      setProfile(data);
    } catch (err) {
      console.error("[useAuth] fetchProfile error:", err);
      setUser(null);
      setRole(null);
      setProfile(null);
      if (shouldThrow) throw err;
    } finally {
      console.log("[useAuth] fetchProfile finished, setting loading to false");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("[useAuth] signIn called for:", email);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("[useAuth] Login failed:", data.error);
        setLoading(false);
        return { error: new Error(data.error || "Login failed") };
      }
      const data = await res.json();
      console.log("[useAuth] Login success, tokens received");
      storeTokens(data.accessToken, data.refreshToken);

      // Fetch profile and wait for it to complete. Throw if it fails.
      await fetchProfile(true);
      console.log("[useAuth] signIn flow complete");
      return { error: null };
    } catch (error) {
      console.error("[useAuth] signIn network error:", error);
      setLoading(false);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    clearTokens();
    setUser(null);
    setRole(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, signIn, signOut, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
