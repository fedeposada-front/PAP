import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Mail, Lock, Eye, EyeOff, ShoppingBag, Store } from "lucide-react";
import { Button, Input, Logo, Header } from "../ds";
import { useAuth } from "../AuthContext";

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function AuthScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, isAuthenticated, isLoading, user, logout } = useAuth();
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-select role from URL params (e.g. /auth?role=seller)
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "seller" || roleParam === "buyer") {
      setRole(roleParam);
    }
  }, [searchParams]);

  // If authenticated seller, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role === "seller") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // If user is already logged in, show profile
  if (isAuthenticated && user) {
    // Seller is being redirected to dashboard
    if (user.role === "seller") return null;

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header title="Mon profil" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center px-6 py-8 max-w-md mx-auto w-full">
          <div className="w-20 h-20 bg-coral-light rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">
              {user.firstName[0]}{user.lastName[0]}
            </span>
          </div>
          <h2 className="mb-1">{user.firstName} {user.lastName}</h2>
          <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
          <p className="text-xs text-muted-foreground mb-8">Compte acheteur</p>

          <div className="w-full space-y-3">
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate("/home")}
            >
              Explorer les boutiques
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate("/cart")}
            >
              Mon panier
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate("/messages")}
            >
              Mes messages
            </Button>
            <div className="pt-4">
              <Button
                fullWidth
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  await logout();
                  setRole(null);
                }}
              >
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
          <Logo size="xl" />
          <h2 className="mt-6 mb-2 text-center">Bienvenue !</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">
            Comment souhaitez-vous utiliser Mon cadeau local ?
          </p>

          <div className="w-full space-y-4">
            <button
              onClick={() => setRole("buyer")}
              className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-coral/30 transition-all"
            >
              <div className="w-14 h-14 bg-coral-light rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-7 h-7 text-coral" />
              </div>
              <div className="text-left">
                <p>Je cherche un cadeau</p>
                <p className="text-sm text-muted-foreground">
                  Découvrir les boutiques et acheter localement
                </p>
              </div>
            </button>

            <button
              onClick={() => setRole("seller")}
              className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-green/30 transition-all"
            >
              <div className="w-14 h-14 bg-green-light rounded-2xl flex items-center justify-center flex-shrink-0">
                <Store className="w-7 h-7 text-green" />
              </div>
              <div className="text-left">
                <p>Je suis commerçant</p>
                <p className="text-sm text-muted-foreground">
                  Vendre mes produits sur la plateforme
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAuth = () => {
    const run = async () => {
      if (!role) return;
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        if (mode === "signup") {
          await signUp({
            email: email.trim(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            preferredRole: role,
            shopName: role === "seller" ? shopName.trim() : undefined,
          });
        } else {
          await signIn({
            email: email.trim(),
            password,
            preferredRole: role,
          });
        }

        if (role === "seller") {
          navigate("/siret");
        } else {
          navigate("/home");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Impossible de se connecter pour le moment.";
        setErrorMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    };

    void run();
  };

  const isFormInvalid = !email.trim() || !password.trim() || (mode === "signup" && (!firstName.trim() || !lastName.trim()));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        title={mode === "login" ? "Connexion" : "Inscription"}
        onBack={() => setRole(null)}
      />

      <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
        {isLoading && (
          <p className="text-sm text-muted-foreground mb-4 text-center">Chargement du compte...</p>
        )}
        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 ${
              role === "seller" ? "bg-green-light" : "bg-coral-light"
            } rounded-2xl flex items-center justify-center mx-auto mb-4`}
          >
            {role === "seller" ? (
              <Store className="w-7 h-7 text-green" />
            ) : (
              <ShoppingBag className="w-7 h-7 text-coral" />
            )}
          </div>
          <h2>
            {mode === "login" ? "Ravis de vous revoir" : "Créer votre compte"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "seller"
              ? "Commencez à vendre vos produits localement"
              : "Découvrez les trésors de vos commerçants"}
          </p>
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-3">
              <Input
                placeholder="Prénom"
                value={firstName}
                onChange={setFirstName}
              />
              <Input
                placeholder="Nom"
                value={lastName}
                onChange={setLastName}
              />
            </div>
          )}
          <Input
            placeholder="Adresse e-mail"
            type="email"
            icon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={setEmail}
          />
          <div className="relative">
            <Input
              placeholder="Mot de passe"
              type={showPassword ? "text" : "password"}
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={setPassword}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {mode === "signup" && role === "seller" && (
            <Input
              placeholder="Nom de votre entreprise"
              icon={<Store className="w-4 h-4" />}
              value={shopName}
              onChange={setShopName}
            />
          )}
        </div>

        <Button
          fullWidth
          size="lg"
          className="mt-6"
          variant={role === "seller" ? "accent" : "primary"}
          onClick={handleAuth}
          disabled={isSubmitting || isLoading || isFormInvalid}
        >
          {isSubmitting ? "Chargement..." : mode === "login" ? "Se connecter" : "S'inscrire"}
        </Button>

        {errorMessage && (
          <p className="text-sm text-destructive mt-3 text-center">{errorMessage}</p>
        )}

        <div className="relative my-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="flex-1 h-px bg-border" />
            <span>ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAuth}
            disabled={isSubmitting || isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-border rounded-xl px-5 py-3.5 hover:bg-muted hover:shadow-sm transition-all group"
          >
            <GoogleIcon />
            <span>Continuer avec Google</span>
          </button>
          <button
            onClick={handleAuth}
            disabled={isSubmitting || isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-border rounded-xl px-5 py-3.5 hover:bg-muted hover:shadow-sm transition-all group"
          >
            <AppleIcon />
            <span>Continuer avec Apple</span>
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-coral"
              >
                S'inscrire
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-coral"
              >
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
