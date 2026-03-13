"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Header, Input, Button } from "../../src/app/components/ds";
import { useAuth } from "../../src/app/components/AuthContext";
import { getPasswordRuleMessage } from "../../src/app/utils/passwordRules";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    const run = async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!password.trim() || !confirmPassword.trim()) {
        setErrorMessage("Veuillez renseigner les deux champs.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Les mots de passe ne correspondent pas.");
        return;
      }
      const passwordError = getPasswordRuleMessage(password);
      if (passwordError) {
        setErrorMessage(passwordError);
        return;
      }

      setIsSubmitting(true);
      try {
        await updatePassword(password);
        setSuccessMessage("Mot de passe mis a jour. Vous pouvez maintenant vous connecter.");
        setTimeout(() => router.replace("/auth"), 900);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Impossible de mettre a jour le mot de passe.";
        setErrorMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    };

    void run();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Nouveau mot de passe" onBack={() => router.replace("/auth")} />
      <div className="flex-1 w-full max-w-md mx-auto px-6 py-8">
        <p className="text-sm text-muted-foreground mb-4">
          Entrez votre nouveau mot de passe pour finaliser la reinitialisation.
        </p>

        <div className="space-y-3">
          <div className="relative">
            <Input
              placeholder="Nouveau mot de passe"
              type={showPassword ? "text" : "password"}
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={setPassword}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Input
            placeholder="Confirmer le mot de passe"
            type={showPassword ? "text" : "password"}
            icon={<Lock className="w-4 h-4" />}
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        </div>

        <Button
          fullWidth
          size="lg"
          className="mt-6"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Mise a jour..." : "Mettre a jour le mot de passe"}
        </Button>

        {errorMessage && (
          <p className="text-sm text-destructive mt-3 text-center">{errorMessage}</p>
        )}
        {successMessage && (
          <p className="text-sm text-green mt-3 text-center">{successMessage}</p>
        )}
      </div>
    </div>
  );
}
