"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Clock,
  AlertCircle,
  Shield,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { Button, Input, Badge, Header } from "../ds";
import { useAuth } from "../AuthContext";
import { AddressAutocompleteInput } from "../AddressAutocompleteInput";

type SiretState = "input" | "checking" | "verified" | "identity";

interface VerifiedSiretData {
  siret: string;
  companyName: string;
  address: string;
  city: string;
}

export function SiretScreenNext() {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { isAuthenticated, user, switchRole, verifySiret, updateProfile } = useAuth();
  const [state, setState] = useState<SiretState>("input");
  const [siret, setSiret] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<VerifiedSiretData | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [isManagerConfirmed, setIsManagerConfirmed] = useState(false);
  const [isSubmittingIdentity, setIsSubmittingIdentity] = useState(false);
  const [prefilledUserId, setPrefilledUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      push("/auth?role=seller");
      return;
    }
    if (user?.siretVerified) {
      push("/settings");
    }
  }, [isAuthenticated, user?.siretVerified, push]);

  // Prefill identity only once per connected user, to avoid overwriting manual edits.
  useEffect(() => {
    if (!user?.id) return;
    if (prefilledUserId === user.id) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setPrefilledUserId(user.id);
  }, [user?.id, user?.firstName, user?.lastName, prefilledUserId]);

  const handleVerify = () => {
    const normalized = siret.replace(/\s/g, "");
    if (!/^\d{14}$/.test(normalized)) {
      setErrorMessage("Le SIRET doit contenir exactement 14 chiffres.");
      return;
    }
    setErrorMessage(null);
    setState("checking");

    const run = async () => {
      try {
        const response = await fetch("/api/siret/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siret: normalized }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string; siret?: string; companyName?: string; address?: string; city?: string }
          | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message ?? "SIRET invalide.");
        }

        setVerifiedData({
          siret: payload.siret ?? normalized,
          companyName: payload.companyName ?? "Entreprise",
          address: payload.address ?? "",
          city: payload.city ?? "",
        });
        const rawName = (payload.companyName ?? "").trim();
        const rawAddress = (payload.address ?? "").trim();
        setCompanyName(rawName.includes("NON-DIFFUSIBLE") ? "" : rawName);
        setCompanyAddress(rawAddress.includes("NON-DIFFUSIBLE") ? "" : rawAddress);
        setIsManagerConfirmed(false);
        setSiret(payload.siret ?? normalized);
        setState("verified");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible de verifier le SIRET.";
        setErrorMessage(message);
        setState("input");
      }
    };

    void run();
  };

  const handleCompleteIdentity = () => {
    const run = async () => {
      const nextFirst = firstName.trim();
      const nextLast = lastName.trim();
      if (!nextFirst || !nextLast) {
        setErrorMessage("Le prénom et le nom sont requis.");
        return;
      }
      if (!verifiedData) {
        setErrorMessage("Aucun SIRET vérifié.");
        return;
      }
      const nextCompanyName = companyName.trim();
      const nextCompanyAddress = companyAddress.trim();
      if (!nextCompanyName || !nextCompanyAddress) {
        setErrorMessage("Le nom de l'entreprise et l'adresse sont requis.");
        return;
      }
      if (!isManagerConfirmed) {
        setErrorMessage("Vous devez confirmer être dirigeant ou responsable.");
        return;
      }

      setIsSubmittingIdentity(true);
      setErrorMessage(null);
      try {
        await updateProfile({ firstName: nextFirst, lastName: nextLast });
        await verifySiret({
          siretNumber: verifiedData.siret,
          shopName: nextCompanyName,
          shopAddress: nextCompanyAddress,
          sellerAttested: true,
        });
        push("/onboarding?next=/settings");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible de finaliser la vérification.";
        const normalizedMessage = message.toLowerCase();
        if (
          normalizedMessage.includes("duplicate key") ||
          normalizedMessage.includes("uniq_profiles_siret_number") ||
          normalizedMessage.includes("siret déjà utilisé") ||
          normalizedMessage.includes("siret deja utilise")
        ) {
          setErrorMessage("Ce SIRET est déjà utilisé par un autre compte.");
        } else if (message.includes("siret_number") || message.includes("siret_verified")) {
          setErrorMessage(
            "La base Supabase n'est pas à jour. Rejoue `supabase/schema.sql` puis réessaie."
          );
        } else {
          setErrorMessage(message);
        }
      } finally {
        setIsSubmittingIdentity(false);
      }
    };
    void run();
  };

  const handleContinueAsBuyer = () => {
    const run = async () => {
      try {
        await switchRole("buyer");
      } finally {
        push("/home");
      }
    };
    void run();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Vérification SIRET" onBack={() => router.back()} />

      <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
        {state === "input" && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7 text-green" />
              </div>
              <h2 className="mb-2">Vérifiez votre entreprise</h2>
              <p className="text-sm text-muted-foreground">
                Pour vendre sur Lovcal, votre entreprise doit être
                enregistrée avec un numéro SIRET valide.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm mb-1.5 block">Numéro SIRET</label>
                <Input
                  placeholder="Saisissez votre SIRET"
                  value={siret}
                  onChange={setSiret}
                  icon={<Building2 className="w-4 h-4" />}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  14 chiffres – disponible sur votre extrait Kbis ou sur
                  societe.com
                </p>
                {errorMessage && (
                  <p className="text-xs text-destructive mt-1.5">{errorMessage}</p>
                )}
              </div>

              <Button
                fullWidth
                size="lg"
                variant="accent"
                onClick={handleVerify}
                disabled={!isAuthenticated || siret.replace(/\s/g, "").length < 14}
              >
                Vérifier mon SIRET
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={handleContinueAsBuyer}
              >
                Continuer en mode acheteur
              </Button>
            </div>

            <div className="mt-8 bg-bleu-light rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-bleu flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="mb-1">Pourquoi le SIRET ?</p>
                  <p className="text-muted-foreground">
                    C'est une garantie pour les acheteurs : ils savent qu'ils
                    achètent auprès d'un vrai commerce local et enregistré.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground justify-center">
              <Shield className="w-3.5 h-3.5" />
              <span>Vos données sont sécurisées et confidentielles</span>
            </div>
          </>
        )}

        {state === "checking" && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="w-16 h-16 border-4 border-green border-t-transparent rounded-full mb-6"
            />
            <h2 className="mb-2">Vérification en cours</h2>
            <p className="text-sm text-muted-foreground text-center">
              Nous vérifions votre numéro SIRET auprès de l'INSEE...
            </p>

            <div className="mt-8 w-full bg-white rounded-2xl p-4 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-bleu" />
                <Badge variant="warning">En cours de vérification</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>SIRET : {siret || "-"}</p>
                <p>Délai estimé : quelques secondes</p>
              </div>
            </div>
          </div>
        )}

        {state === "verified" && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="w-20 h-20 bg-green-light rounded-full flex items-center justify-center mb-6"
            >
              <Check className="w-10 h-10 text-green" />
            </motion.div>
            <h2 className="mb-2">Entreprise vérifiée !</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Votre entreprise a été validée. Vous pouvez maintenant créer votre
              vitrine et ajouter des produits.
            </p>

            <div className="w-full bg-white rounded-2xl p-4 border border-border/50 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="w-5 h-5 text-green" />
                <Badge variant="success">
                  <Check className="w-3 h-3" /> Vérifié
                </Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Raison sociale</span>
                  <span>{verifiedData?.companyName ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SIRET</span>
                  <span>{siret || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ville</span>
                  <span>{verifiedData?.city || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <span className="text-green">Active</span>
                </div>
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              variant="accent"
              onClick={() => {
                setErrorMessage(null);
                setState("identity");
              }}
              className="gap-2"
            >
              Continuer
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {state === "identity" && (
          <div className="flex-1 flex flex-col">
            <div className="text-center mb-6">
              <h2 className="mb-2">Identité du responsable</h2>
              <p className="text-sm text-muted-foreground">
                Renseignez les informations de la personne physique responsable.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-border/50 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Entreprise</p>
              <Input
                placeholder="Nom de l'entreprise"
                value={companyName}
                onChange={(value) => {
                  setCompanyName(value);
                  setErrorMessage(null);
                }}
              />
              <div className="mt-3">
                <AddressAutocompleteInput
                  placeholder="Adresse de l'entreprise"
                  value={companyAddress}
                  onChange={(value) => {
                    setCompanyAddress(value);
                    setErrorMessage(null);
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Prénom"
                value={firstName}
                onChange={(value) => {
                  setFirstName(value);
                  setErrorMessage(null);
                }}
              />
              <Input
                placeholder="Nom"
                value={lastName}
                onChange={(value) => {
                  setLastName(value);
                  setErrorMessage(null);
                }}
              />
            </div>

            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={isManagerConfirmed}
                onChange={(e) => {
                  setIsManagerConfirmed(e.target.checked);
                  setErrorMessage(null);
                }}
                className="mt-1 w-4 h-4"
              />
              <span>
                Je confirme être la dirigeante ou le responsable légal de cette entreprise.
              </span>
            </label>

            {errorMessage && (
              <p className="text-sm text-destructive mt-3">{errorMessage}</p>
            )}

            <div className="mt-auto pt-6">
              <Button
                fullWidth
                size="lg"
                variant="accent"
                onClick={handleCompleteIdentity}
                disabled={isSubmittingIdentity}
              >
                {isSubmittingIdentity ? "Finalisation..." : "Activer ma boutique"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
