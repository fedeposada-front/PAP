import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, Store } from "lucide-react";
import { Button, Logo } from "../ds";
import { ONBOARDING_SLIDES, SELLER_ONBOARDING_SLIDES } from "../../data/mock-data";
import giftIcon from "../../../assets/gift-icon.png";

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState<"buyer" | "seller" | null>(null);
  const [step, setStep] = useState(0);
  const slides = audience === "seller" ? SELLER_ONBOARDING_SLIDES : ONBOARDING_SLIDES;
  const slide = slides[step];

  const handleSkip = () => {
    if (audience === "seller") {
      navigate("/auth?role=seller");
      return;
    }
    navigate("/location");
  };

  const handleStart = () => {
    if (audience === "seller") {
      navigate("/auth?role=seller");
      return;
    }
    navigate("/location");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6">
        <Logo size="lg" />
        {audience ? (
          <button
            onClick={() => {
              setAudience(null);
              setStep(0);
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Changer
          </button>
        ) : (
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Passer
          </button>
        )}
      </div>

      {!audience ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
          <h2 className="text-center mb-2">Bienvenue !</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">
            Vous êtes client ou commerçant ?
          </p>

          <div className="w-full space-y-4">
            <button
              onClick={() => {
                setAudience("buyer");
                setStep(0);
              }}
              className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-coral/30 transition-all"
            >
              <div className="w-14 h-14 bg-coral-light rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-7 h-7 text-coral" />
              </div>
              <div className="text-left">
                <p>Je suis client</p>
                <p className="text-sm text-muted-foreground">
                  Trouver un cadeau local rapidement
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setAudience("seller");
                setStep(0);
              }}
              className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-green/30 transition-all"
            >
              <div className="w-14 h-14 bg-green-light rounded-2xl flex items-center justify-center flex-shrink-0">
                <Store className="w-7 h-7 text-green" />
              </div>
              <div className="text-left">
                <p>Je suis commerçant</p>
                <p className="text-sm text-muted-foreground">
                  Développer ma visibilité locale
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <>
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${audience}-${step}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-md"
          >
            {slide.emoji === "gift-custom" ? (
              <img src={giftIcon.src} alt="Cadeau" className="w-20 h-20 mx-auto mb-8 object-contain" />
            ) : (
              <span className="text-7xl mb-8 block">{slide.emoji}</span>
            )}
            <h1 className="mb-4">{slide.title}</h1>
            <p className="text-muted-foreground">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots + CTA */}
      <div className="px-6 pb-10">
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-coral" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
        {step < slides.length - 1 ? (
          <Button fullWidth size="lg" onClick={() => setStep(step + 1)}>
            Suivant
          </Button>
        ) : (
          <Button fullWidth size="lg" onClick={handleStart}>
            Commencer
          </Button>
        )}
      </div>
        </>
      )}
    </div>
  );
}
