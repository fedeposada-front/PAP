"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, ChevronRight, Layers3, ShoppingBag } from "lucide-react";
import { Button, Logo } from "../../src/app/components/ds";
import { useAuth } from "../../src/app/components/AuthContext";
import { fetchShopSettings, saveShopBusinessType } from "../../src/app/services/shopSettings";
import type { BusinessType } from "../../src/app/types/catalog";

function sanitizeRedirectPath(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
  if (normalized === "/onboarding") return null;
  return normalized;
}

const BUSINESS_TYPE_OPTIONS: Array<{
  value: BusinessType;
  title: string;
  description: string;
  icon: typeof ShoppingBag;
  accentClass: string;
}> = [
  {
    value: "product",
    title: "Produits",
    description: "Je vends des articles physiques, en boutique, en retrait ou en livraison.",
    icon: ShoppingBag,
    accentClass: "bg-coral-light text-coral",
  },
  {
    value: "service",
    title: "Services",
    description: "Je propose des prestations, rendez-vous, accompagnements ou interventions.",
    icon: Briefcase,
    accentClass: "bg-green-light text-green",
  },
  {
    value: "hybrid",
    title: "Les deux",
    description: "Je vends à la fois des produits et des services sur LOVCAL.",
    icon: Layers3,
    accentClass: "bg-bleu-light text-bleu",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, accessToken } = useAuth();
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditMode = searchParams.get("edit") === "1";

  const nextPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("next")) ?? "/settings",
    [searchParams]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth?role=seller");
      return;
    }
    if (!user?.roles.includes("seller")) {
      router.replace("/auth?role=seller");
      return;
    }
    if (!user.siretVerified) {
      router.replace("/siret");
      return;
    }
    if (!user.id || !accessToken) return;

    let cancelled = false;
    const run = async () => {
      try {
        const shop = await fetchShopSettings(user.id, accessToken);
        if (cancelled) return;

        if (shop?.business_type) {
          setSelectedType(
            shop.business_type === "service" || shop.business_type === "hybrid"
              ? shop.business_type
              : "product"
          );
        }

        if (shop?.business_type_configured && !isEditMode) {
          router.replace(nextPath === "/onboarding" ? "/dashboard" : nextPath);
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Impossible de charger le type d'activité."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, accessToken, router, nextPath, isEditMode]);

  const handleSave = () => {
    if (!user?.id || !accessToken || !selectedType) {
      setErrorMessage("Choisissez d'abord ce que vous proposez sur LOVCAL.");
      return;
    }

    const run = async () => {
      setIsSaving(true);
      setErrorMessage(null);
      try {
        await saveShopBusinessType({
          userId: user.id,
          accessToken,
          businessType: selectedType,
        });
        router.push(nextPath === "/onboarding" ? "/dashboard" : nextPath);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Impossible d'enregistrer votre activité."
        );
      } finally {
        setIsSaving(false);
      }
    };

    void run();
  };

  if (isLoading || !isAuthenticated || !user?.roles.includes("seller") || !user.siretVerified) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col">
        <div className="flex justify-center">
          <Logo size="xl" href="/home" />
        </div>

        <div className="mx-auto mt-10 w-full max-w-2xl text-center">
          <h1>{isEditMode ? "Modifiez votre type d'activité" : "Que proposez-vous sur LOVCAL&nbsp;?"}</h1>
          <p className="mt-3 text-muted-foreground">
            Cette étape nous aide à adapter votre espace entreprise, vos formulaires et vos futures
            offres. Vous pourrez modifier ce choix plus tard.
          </p>
        </div>

        <div className="mx-auto mt-10 grid w-full max-w-3xl gap-4 md:grid-cols-3">
          {BUSINESS_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = selectedType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedType(option.value);
                  setErrorMessage(null);
                }}
                className={`rounded-3xl border bg-white p-5 text-left shadow-sm transition-all ${
                  isActive
                    ? "border-coral ring-2 ring-coral/20"
                    : "border-border hover:border-coral/30 hover:shadow-md"
                }`}
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${option.accentClass}`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-xl">{option.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-border bg-white p-5 text-sm text-muted-foreground shadow-sm">
          <p>
            `Produits` convient aux commerces classiques. `Services` convient aux indépendants,
            freelances et prestataires. `Les deux` convient aux entreprises hybrides.
          </p>
        </div>

        {errorMessage && (
          <p className="mx-auto mt-4 w-full max-w-2xl text-center text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <div className="mx-auto mt-auto flex w-full max-w-2xl flex-col gap-3 pt-10">
          <Button
            fullWidth
            size="lg"
            variant="accent"
            onClick={handleSave}
            disabled={!selectedType || isSaving}
            className="gap-2"
          >
            {isSaving ? "Enregistrement..." : isEditMode ? "Enregistrer" : "Continuer"}
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            fullWidth
            variant="outline"
            onClick={() => router.push(isEditMode ? nextPath : "/siret")}
            disabled={isSaving}
          >
            {isEditMode ? "Retour" : "Retour à la vérification SIRET"}
          </Button>
        </div>
      </div>
    </div>
  );
}
