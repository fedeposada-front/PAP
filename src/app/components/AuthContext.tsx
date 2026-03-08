import React, { createContext, useContext, useEffect, useState } from "react";

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
  shop_address: string | null;
  siret_number: string | null;
  siret_verified: boolean | null;
  seller_attested: boolean | null;
  seller_vacation_mode: boolean | null;
  seller_deactivated: boolean | null;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  roles: Role[];
  shopName?: string;
  shopAddress?: string;
  siretNumber?: string;
  siretVerified: boolean;
  sellerAttested: boolean;
  sellerVacationMode: boolean;
  sellerDeactivated: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  signIn: (params: { email: string; password: string; preferredRole?: Role }) => Promise<void>;
  signInWithGoogle: (preferredRole?: Role) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    preferredRole: Role;
    shopName?: string;
  }) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  verifySiret: (params: {
    siretNumber: string;
    shopName?: string;
    shopAddress?: string;
    sellerAttested?: boolean;
  }) => Promise<void>;
  updateSellerStatus: (data: { vacationMode: boolean; deactivated: boolean }) => Promise<void>;
  updateProfile: (data: { firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  accessToken: null,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signUp: async () => {},
  switchRole: async () => {},
  verifySiret: async () => {},
  updateSellerStatus: async () => {},
  updateProfile: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SESSION_KEY = "mcl.auth.session";
const OAUTH_ROLE_KEY = "mcl.auth.oauth.role";

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

function isJwtExpiredError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /jwt expired|token.*expired/i.test(error.message);
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

function persistOAuthPreferredRole(role?: Role) {
  if (typeof window === "undefined") return;
  if (!role) {
    window.localStorage.removeItem(OAUTH_ROLE_KEY);
    return;
  }
  window.localStorage.setItem(OAUTH_ROLE_KEY, role);
}

function getStoredOAuthPreferredRole(): Role | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(OAUTH_ROLE_KEY);
  return raw === "buyer" || raw === "seller" ? raw : undefined;
}

function getOAuthSessionFromUrl(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(window.location.search);

  const accessToken = hashParams.get("access_token") ?? searchParams.get("access_token");
  if (!accessToken) return null;
  const refreshToken = hashParams.get("refresh_token") ?? searchParams.get("refresh_token") ?? undefined;
  return { access_token: accessToken, refresh_token: refreshToken };
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

    let profile: AuthProfileRow | null = null;
    try {
      const profileRows = await requestJson<AuthProfileRow[]>(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${authUser.id}&select=id,first_name,last_name,roles,active_role,shop_name,shop_address,siret_number,siret_verified,seller_attested,seller_vacation_mode,seller_deactivated`,
        { method: "GET" },
        { requiresAuth: true, accessToken }
      );
      profile = profileRows[0] ?? null;
    } catch {
      profile = null;
    }

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
      shop_address: profile?.shop_address ?? null,
      siret_number: profile?.siret_number ?? null,
      siret_verified: profile?.siret_verified ?? false,
      seller_attested: profile?.seller_attested ?? false,
      seller_vacation_mode: profile?.seller_vacation_mode ?? false,
      seller_deactivated: profile?.seller_deactivated ?? false,
    };

    try {
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
    } catch {
      // Keep auth functional even if profile table/policies are not yet ready.
    }

    const hydratedUser: User = {
      id: authUser.id,
      email: authUser.email,
      firstName: profilePayload.first_name ?? "",
      lastName: profilePayload.last_name ?? "",
      roles,
      role,
      shopName: profilePayload.shop_name ?? undefined,
      shopAddress: profilePayload.shop_address ?? undefined,
      siretNumber: profilePayload.siret_number ?? undefined,
      siretVerified: Boolean(profilePayload.siret_verified),
      sellerAttested: Boolean(profilePayload.seller_attested),
      sellerVacationMode: Boolean(profilePayload.seller_vacation_mode),
      sellerDeactivated: Boolean(profilePayload.seller_deactivated),
    };

    setUser(hydratedUser);
    return hydratedUser;
  };

  const setActiveSession = (nextSession: AuthSession | null) => {
    setSession(nextSession);
    persistSession(nextSession);
  };

  const refreshAccessToken = async (): Promise<AuthSession> => {
    if (!session?.refresh_token) {
      throw new Error("Session expiree. Merci de vous reconnecter.");
    }

    const refreshed = await requestJson<{
      access_token: string;
      refresh_token?: string;
    }>(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    const nextSession: AuthSession = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? session.refresh_token,
    };
    setActiveSession(nextSession);
    return nextSession;
  };

  const withSessionRetry = async <T,>(requestWithToken: (accessToken: string) => Promise<T>): Promise<T> => {
    if (!session?.access_token) {
      throw new Error("Session invalide.");
    }

    try {
      return await requestWithToken(session.access_token);
    } catch (error) {
      if (!isJwtExpiredError(error)) throw error;
      const nextSession = await refreshAccessToken();
      return requestWithToken(nextSession.access_token);
    }
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

  const signInWithGoogle: AuthContextType["signInWithGoogle"] = async (preferredRole) => {
    if (!hasSupabaseConfig()) {
      throw new Error("Configuration Supabase manquante.");
    }
    if (typeof window === "undefined") return;

    persistOAuthPreferredRole(preferredRole);

    const redirectUrl = new URL(`${window.location.origin}/auth`);
    if (preferredRole) {
      redirectUrl.searchParams.set("role", preferredRole);
    }

    const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", redirectUrl.toString());

    window.location.assign(authorizeUrl.toString());
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

    try {
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
            shop_address: null,
            siret_number: null,
            siret_verified: false,
            seller_attested: false,
            seller_vacation_mode: false,
            seller_deactivated: false,
          }),
        },
        { requiresAuth: true, accessToken: nextSession.access_token }
      );
    } catch {
      // Ignore profile write errors in signup; fallback happens in fetchCurrentUser.
    }

    await fetchCurrentUser(nextSession.access_token, preferredRole);
  };

  const switchRole: AuthContextType["switchRole"] = async (role) => {
    if (!user) return;
    if (!user.roles.includes(role)) return;

    await withSessionRetry((accessToken) =>
      requestJson(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
        {
          method: "PATCH",
          headers: {
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ active_role: role }),
        },
        { requiresAuth: true, accessToken }
      )
    );

    setUser((prev) => (prev ? { ...prev, role } : prev));
  };

  const verifySiret: AuthContextType["verifySiret"] = async ({
    siretNumber,
    shopName,
    shopAddress,
    sellerAttested,
  }) => {
    if (!user) {
      throw new Error("Session invalide.");
    }

    await withSessionRetry((accessToken) =>
      requestJson(
        `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`,
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify([{
            id: user.id,
            roles: user.roles.includes("seller") ? user.roles : [...user.roles, "seller"],
            active_role: "seller",
            shop_name: (shopName ?? user.shopName ?? null),
            shop_address: (shopAddress ?? user.shopAddress ?? null),
            siret_number: siretNumber,
            siret_verified: true,
            seller_attested: Boolean(sellerAttested),
            seller_vacation_mode: user.sellerVacationMode ?? false,
            seller_deactivated: user.sellerDeactivated ?? false,
          }]),
        },
        { requiresAuth: true, accessToken }
      )
    );

    setUser((prev) =>
      prev
        ? {
            ...prev,
            roles: prev.roles.includes("seller") ? prev.roles : [...prev.roles, "seller"],
            role: "seller",
            shopName: shopName ?? prev.shopName,
            shopAddress: shopAddress ?? prev.shopAddress,
            siretNumber,
            siretVerified: true,
            sellerAttested: Boolean(sellerAttested),
            sellerVacationMode: prev.sellerVacationMode ?? false,
            sellerDeactivated: prev.sellerDeactivated ?? false,
          }
        : prev
    );
  };

  const updateSellerStatus: AuthContextType["updateSellerStatus"] = async ({ vacationMode, deactivated }) => {
    if (!user) {
      throw new Error("Session invalide.");
    }

    await withSessionRetry((accessToken) =>
      requestJson(
        `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`,
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify([{
            id: user.id,
            seller_vacation_mode: vacationMode,
            seller_deactivated: deactivated,
          }]),
        },
        { requiresAuth: true, accessToken }
      )
    );

    setUser((prev) =>
      prev
        ? {
            ...prev,
            sellerVacationMode: vacationMode,
            sellerDeactivated: deactivated,
          }
        : prev
    );
  };

  const updateProfile: AuthContextType["updateProfile"] = async ({ firstName, lastName }) => {
    if (!user) {
      throw new Error("Session invalide.");
    }

    await withSessionRetry((accessToken) =>
      requestJson(
        `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`,
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify([{
            id: user.id,
            first_name: firstName || null,
            last_name: lastName || null,
          }]),
        },
        { requiresAuth: true, accessToken }
      )
    );

    setUser((prev) =>
      prev
        ? {
            ...prev,
            firstName,
            lastName,
          }
        : prev
    );
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
        const oauthSession = getOAuthSessionFromUrl();
        const existing = oauthSession ?? getStoredSession();
        if (!existing?.access_token) {
          setUser(null);
          return;
        }
        if (oauthSession && typeof window !== "undefined") {
          const current = new URL(window.location.href);
          current.hash = "";
          current.searchParams.delete("access_token");
          current.searchParams.delete("refresh_token");
          current.searchParams.delete("expires_in");
          current.searchParams.delete("token_type");
          current.searchParams.delete("provider_token");
          current.searchParams.delete("provider_refresh_token");
          window.history.replaceState({}, document.title, `${current.pathname}${current.search}`);
        }
        setActiveSession(existing);

        const roleFromUrl =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("role")
            : null;
        const preferredRoleFromUrl =
          roleFromUrl === "buyer" || roleFromUrl === "seller" ? roleFromUrl : undefined;
        const preferredRole = preferredRoleFromUrl ?? getStoredOAuthPreferredRole();

        await fetchCurrentUser(existing.access_token, preferredRole);
        persistOAuthPreferredRole(undefined);
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

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    accessToken: session?.access_token ?? null,
    signIn,
    signInWithGoogle,
    signUp,
    switchRole,
    verifySiret,
    updateSellerStatus,
    updateProfile,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
