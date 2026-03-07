import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Role = "buyer" | "seller";

interface AuthSession {
  access_token: string;
  refresh_token?: string;
}

interface AuthProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  roles: Role[] | null;
  active_role: Role | null;
  shop_name: string | null;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  roles: Role[];
  shopName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (params: { email: string; password: string; preferredRole?: Role }) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    preferredRole: Role;
    shopName?: string;
  }) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  signIn: async () => {},
  signUp: async () => {},
  switchRole: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SESSION_KEY = "mcl.auth.session";

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function parseAuthError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const maybeMessage = (payload as { msg?: string; message?: string; error_description?: string }).message
      ?? (payload as { msg?: string; message?: string; error_description?: string }).msg
      ?? (payload as { msg?: string; message?: string; error_description?: string }).error_description;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  }
  return fallback;
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  options?: { requiresAuth?: boolean; accessToken?: string }
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("apikey", SUPABASE_ANON_KEY);
  if (options?.requiresAuth) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseAuthError(payload, "Une erreur est survenue."));
  }

  return payload as T;
}

function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  const updateUser = (data: Partial<User>) =>
    setUser((prev) => (prev ? { ...prev, ...data } : null));

  const fetchCurrentUser = async (accessToken: string, preferredRole?: Role) => {
    const authUser = await requestJson<{
      id: string;
      email: string;
      user_metadata?: { first_name?: string; last_name?: string };
    }>(`${SUPABASE_URL}/auth/v1/user`, {
      method: "GET",
    }, { requiresAuth: true, accessToken });

    const profileRows = await requestJson<AuthProfileRow[]>(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${authUser.id}&select=id,first_name,last_name,roles,active_role,shop_name`,
      { method: "GET" },
      { requiresAuth: true, accessToken }
    );

    const profile = profileRows[0] ?? null;

    const existingRoles = Array.isArray(profile?.roles) && profile?.roles.length > 0
      ? profile.roles
      : ["buyer"];

    const roles: Role[] = [...new Set([...(existingRoles as Role[]), ...(preferredRole ? [preferredRole] : [])])];
    const role: Role = preferredRole ?? profile?.active_role ?? (roles.includes("seller") ? "seller" : "buyer");

    const profilePayload = {
      id: authUser.id,
      first_name: profile?.first_name ?? authUser.user_metadata?.first_name ?? null,
      last_name: profile?.last_name ?? authUser.user_metadata?.last_name ?? null,
      roles,
      active_role: role,
      shop_name: profile?.shop_name ?? null,
    };

    await requestJson<AuthProfileRow[]>(
      `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`,
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(profilePayload),
      },
      { requiresAuth: true, accessToken }
    );

    const hydratedUser: User = {
      id: authUser.id,
      email: authUser.email,
      firstName: profilePayload.first_name ?? "",
      lastName: profilePayload.last_name ?? "",
      roles,
      role,
      shopName: profilePayload.shop_name ?? undefined,
    };

    setUser(hydratedUser);
    return hydratedUser;
  };

  const setActiveSession = (nextSession: AuthSession | null) => {
    setSession(nextSession);
    persistSession(nextSession);
  };

  const signIn: AuthContextType["signIn"] = async ({ email, password, preferredRole }) => {
    if (!hasSupabaseConfig()) {
      throw new Error("Configuration Supabase manquante.");
    }

    const auth = await requestJson<{
      access_token: string;
      refresh_token: string;
    }>(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const nextSession: AuthSession = {
      access_token: auth.access_token,
      refresh_token: auth.refresh_token,
    };
    setActiveSession(nextSession);
    await fetchCurrentUser(nextSession.access_token, preferredRole);
  };

  const signUp: AuthContextType["signUp"] = async ({
    email,
    password,
    firstName,
    lastName,
    preferredRole,
    shopName,
  }) => {
    if (!hasSupabaseConfig()) {
      throw new Error("Configuration Supabase manquante.");
    }

    const signup = await requestJson<{
      user?: { id: string };
      session?: { access_token: string; refresh_token: string } | null;
    }>(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: { first_name: firstName, last_name: lastName },
      }),
    });

    if (!signup.session?.access_token) {
      // If email confirmation is enabled, signup may not return a session.
      // In that case, try direct sign-in for local/dev configurations.
      await signIn({ email, password, preferredRole });
      return;
    }

    const nextSession: AuthSession = {
      access_token: signup.session.access_token,
      refresh_token: signup.session.refresh_token,
    };
    setActiveSession(nextSession);

    await requestJson<AuthProfileRow[]>(
      `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`,
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: signup.user?.id,
          first_name: firstName,
          last_name: lastName,
          roles: preferredRole === "seller" ? ["buyer", "seller"] : ["buyer"],
          active_role: preferredRole,
          shop_name: preferredRole === "seller" ? (shopName || null) : null,
        }),
      },
      { requiresAuth: true, accessToken: nextSession.access_token }
    );

    await fetchCurrentUser(nextSession.access_token, preferredRole);
  };

  const switchRole: AuthContextType["switchRole"] = async (role) => {
    if (!session?.access_token || !user) return;
    if (!user.roles.includes(role)) return;

    await requestJson(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ active_role: role }),
      },
      { requiresAuth: true, accessToken: session.access_token }
    );

    setUser((prev) => (prev ? { ...prev, role } : prev));
  };

  const logout: AuthContextType["logout"] = async () => {
    if (session?.access_token) {
      try {
        await requestJson(
          `${SUPABASE_URL}/auth/v1/logout`,
          { method: "POST" },
          { requiresAuth: true, accessToken: session.access_token }
        );
      } catch {
        // ignore logout API errors and clear local session anyway
      }
    }
    setUser(null);
    setActiveSession(null);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        if (!hasSupabaseConfig()) {
          setUser(null);
          return;
        }
        const existing = getStoredSession();
        if (!existing?.access_token) {
          setUser(null);
          return;
        }
        setSession(existing);
        await fetchCurrentUser(existing.access_token);
      } catch {
        if (!cancelled) {
          setUser(null);
          setActiveSession(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    switchRole,
    logout,
    updateUser,
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
