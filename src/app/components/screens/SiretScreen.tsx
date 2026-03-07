import { useState } from "react";
import { useNavigate } from "react-router";
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

type SiretState = "input" | "checking" | "verified";

export function SiretScreen() {
  const navigate = useNavigate();
  const [state, setState] = useState<SiretState>("input");
  const [siret, setSiret] = useState("");

  const handleVerify = () => {
    setState("checking");
    setTimeout(() => setState("verified"), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Vérification SIRET" onBack={() => navigate(-1)} />

      <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
        {state === "input" && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7 text-green" />
              </div>
              <h2 className="mb-2">Vérifiez votre entreprise</h2>
              <p className="text-sm text-muted-foreground">
                Pour vendre sur MonCadeauLocal, votre entreprise doit être
                enregistrée avec un numéro SIRET valide.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm mb-1.5 block">Numéro SIRET</label>
                <Input
                  placeholder="123 456 789 00012"
                  value={siret}
                  onChange={setSiret}
                  icon={<Building2 className="w-4 h-4" />}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  14 chiffres – disponible sur votre extrait Kbis ou sur
                  societe.com
                </p>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="accent"
                onClick={handleVerify}
                disabled={siret.length < 5}
              >
                Vérifier mon SIRET
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
                <p>SIRET : {siret || "123 456 789 00012"}</p>
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
                  <span>Boulangerie Maison Dupont</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SIRET</span>
                  <span>{siret || "123 456 789 00012"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ville</span>
                  <span>Lyon (69002)</span>
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
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              Créer ma vitrine
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}