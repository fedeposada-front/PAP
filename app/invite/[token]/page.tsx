"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Mail, ShieldCheck, Store } from "lucide-react";

import { Badge, Button, Logo } from "../../../src/app/components/ds";
import { useAuth } from "../../../src/app/components/AuthContext";
import type {
  AcceptShopInvitationResult,
  AssignableShopMemberRole,
  ShopInvitationPreview,
} from "../../../src/app/services/server/shopInvitations";

const ROLE_LABELS: Record<AssignableShopMemberRole, string> = {
  manager: "Gestion",
  support: "Support",
  catalog: "Catalogue",
  content: "Contenu",
};

function formatRoleLabel(role: AssignableShopMemberRole) {
  return ROLE_LABELS[role] ?? role;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const { isAuthenticated, isLoading, accessToken, user, logout } = useAuth();
  const [preview, setPreview] = useState<ShopInvitationPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<AcceptShopInvitationResult | null>(null);

  const nextPath = useMemo(() => (token ? `/invite/${token}` : "/invite"), [token]);

  useEffect(() => {
    if (!token) {
      setErrorMessage("Invitation introuvable.");
      setIsLoadingPreview(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setIsLoadingPreview(true);
        setErrorMessage(null);
        const response = await fetch(`/api/shop-members/invitations/${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string; invitation?: ShopInvitationPreview }
          | null;

        if (!response.ok || !payload?.invitation) {
          throw new Error(payload?.message ?? "Invitation introuvable.");
        }

        if (!cancelled) {
          setPreview(payload.invitation);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Invitation introuvable.");
          setPreview(null);
        }
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleLoginRedirect = () => {
    router.push(`/auth?next=${encodeURIComponent(nextPath)}`);
  };

  const handleUseAnotherAccount = () => {
    const run = async () => {
      try {
        setIsSwitchingAccount(true);
        await logout();
        router.push(`/auth?next=${encodeURIComponent(nextPath)}`);
      } finally {
        setIsSwitchingAccount(false);
      }
    };

    void run();
  };

  const handleAccept = () => {
    if (!isAuthenticated || !accessToken) {
      handleLoginRedirect();
      return;
    }

    const run = async () => {
      try {
        setIsAccepting(true);
        setErrorMessage(null);
        const response = await fetch("/api/shop-members/invitations/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string; result?: AcceptShopInvitationResult }
          | null;

        if (!response.ok || !payload?.result) {
          throw new Error(payload?.message ?? "Impossible d'accepter l'invitation.");
        }

        setSuccess(payload.result);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Impossible d'accepter l'invitation."
        );
      } finally {
        setIsAccepting(false);
      }
    };

    void run();
  };

  if (isLoadingPreview || (isLoading && !success)) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center text-center">
          <Logo size="xl" href="/home" />
          <LoaderCircle className="mt-8 h-8 w-8 animate-spin text-coral" />
          <p className="mt-4 text-muted-foreground">Chargement de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center text-center">
          <Logo size="xl" href="/home" />
          <div className="mt-10 w-full rounded-3xl border border-border bg-white p-8 shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green" />
            <h1 className="mt-5">Invitation acceptee</h1>
            <p className="mt-3 text-muted-foreground">
              Votre compte est maintenant rattache a <strong>{success.shopName}</strong>.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {success.roles.map((role) => (
                <Badge key={role} variant="outline">
                  {formatRoleLabel(role)}
                </Badge>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="accent" onClick={() => router.push("/home")}>
                Aller a l'accueil
              </Button>
              <Button variant="outline" onClick={() => router.push("/messages")}>
                Ouvrir la messagerie
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Les ecrans equipe dedies arrivent ensuite. Pour l'instant, l'invitation est bien enregistree.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col">
        <div className="flex justify-center">
          <Logo size="xl" href="/home" />
        </div>

        <div className="mx-auto mt-10 w-full rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-light text-coral">
              <Store className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h1>Rejoindre une entreprise sur LOVCAL</h1>
              <p className="mt-2 text-muted-foreground">
                Vous avez ete invite a rejoindre <strong>{preview?.shopName ?? "cette entreprise"}</strong>.
              </p>
            </div>
          </div>

          {preview && (
            <>
              <div className="mt-6 rounded-2xl bg-input-background p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Invitation envoyee a</p>
                    <p>{preview.invitedEmailMasked}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Acces proposes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {preview.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {formatRoleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {preview.status !== "pending" && (
                <p className="mt-5 text-sm text-muted-foreground">
                  {preview.status === "accepted"
                    ? "Cette invitation a deja ete acceptee."
                    : preview.status === "expired"
                      ? "Cette invitation a expire."
                      : "Cette invitation n'est plus disponible."}
                </p>
              )}
            </>
          )}

          {errorMessage && (
            <p className="mt-5 text-sm text-destructive">{errorMessage}</p>
          )}

          {isAuthenticated && user && (
            <div className="mt-5 rounded-2xl border border-border bg-white/60 p-4">
              <p className="text-sm text-muted-foreground">Compte actuellement connecté</p>
              <p className="mt-1 text-sm font-medium">{user.email}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Si ce n&apos;est pas l&apos;adresse email invitée, déconnectez-vous puis continuez avec le bon compte.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            {!isAuthenticated ? (
              <>
                <Button variant="accent" onClick={handleLoginRedirect}>
                  Se connecter ou créer un compte
                </Button>
                <Button variant="outline" onClick={() => router.push("/home")}>
                  Plus tard
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="accent"
                  onClick={handleAccept}
                  disabled={isAccepting || preview?.status !== "pending"}
                >
                  {isAccepting ? "Acceptation..." : "Accepter l'invitation"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUseAnotherAccount}
                  disabled={isAccepting || isSwitchingAccount}
                >
                  {isSwitchingAccount ? "Déconnexion..." : "Utiliser un autre compte"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
