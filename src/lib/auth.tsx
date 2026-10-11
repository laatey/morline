import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api, getSession, setSession, type Session } from "./api";

export interface User {
  id: string;
  email: string;
  emailVerified?: boolean;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  plan?: "hobby" | "pro" | "team";
  role?: "owner" | "admin" | "member" | "viewer";
  memberCount?: number;
}

export interface Me extends User {
  teams?: Team[];
  defaultTeamId?: string | null;
  onboarding?: {
    teamCreated?: boolean;
    githubConnected?: boolean;
    firstProjectCreated?: boolean;
    firstDeploySucceeded?: boolean;
    dismissed?: boolean;
  };
  githubConnected?: boolean;
}

interface AuthState {
  status: "loading" | "signed-in" | "signed-out";
  user: Me | null;
  teams: Team[];
  activeTeamId: string | null;
  setActiveTeamId: (id: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ requiresEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ACTIVE_TEAM_KEY = "morline.activeTeamId";

function resolveActiveTeam(me: Me): string | null {
  if (!me.teams?.length) return me.defaultTeamId ?? null;
  const stored = localStorage.getItem(ACTIVE_TEAM_KEY);
  if (stored && me.teams.some((t) => t.id === stored)) return stored;
  return me.defaultTeamId ?? me.teams[0]!.id;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>(() =>
    getSession() ? "signed-in" : "loading",
  );
  const [user, setUser] = useState<Me | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const applyMe = useCallback((me: Me) => {
    setUser(me);
    const id = resolveActiveTeam(me);
    setActiveTeamId(id);
    if (id) localStorage.setItem(ACTIVE_TEAM_KEY, id);
  }, []);

  const refresh = useCallback(async () => {
    if (!getSession()) {
      setUser(null);
      setStatus("signed-out");
      return;
    }
    try {
      const me = await api<Me>("/me");
      applyMe(me);
      setStatus("signed-in");
    } catch {
      setUser(null);
      setStatus("signed-out");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api<{ user: User; session: Session }>("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      setSession(result.session);
      const me = await api<Me>("/me");
      applyMe(me);
      setStatus("signed-in");
    },
    [applyMe],
  );

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await api<{
      user: User;
      session: Session | null;
      requiresEmailVerification: boolean;
    }>("/auth/signup", {
      method: "POST",
      auth: false,
      body: { name, email, password },
    });
    if (result.session) {
      setSession(result.session);
      const me = await api<Me>("/me");
      applyMe(me);
      setStatus("signed-in");
    }
    return { requiresEmailVerification: result.requiresEmailVerification };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // session may already be gone — sign out locally regardless
    }
    setSession(null);
    setUser(null);
    setStatus("signed-out");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        teams: user?.teams ?? [],
        activeTeamId,
        setActiveTeamId,
        signIn,
        signUp,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Wraps workspace screens: redirects signed-out visitors to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (status === "signed-out") navigate({ to: "/login", replace: true });
  }, [status, navigate]);
  if (status !== "signed-in") {
    return <div className="min-h-screen bg-surface" />;
  }
  return <>{children}</>;
}
