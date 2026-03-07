import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Button, Logo } from "../ds";
import { ONBOARDING_SLIDES } from "../../data/mock-data";
import giftIcon from "../../../assets/gift-icon.png";

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const slide = ONBOARDING_SLIDES[step];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6">
        <Logo size="sm" />
        <button
          onClick={() => navigate("/location")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Passer
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-md"
          >
            {slide.emoji === "gift-custom" ? (
              <img src={giftIcon} alt="Cadeau" className="w-20 h-20 mx-auto mb-8 object-contain" />
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
          {ONBOARDING_SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-coral" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
        {step < ONBOARDING_SLIDES.length - 1 ? (
          <Button fullWidth size="lg" onClick={() => setStep(step + 1)}>
            Suivant
          </Button>
        ) : (
          <Button fullWidth size="lg" onClick={() => navigate("/location")}>
            Commencer
          </Button>
        )}
      </div>
    </div>
  );
}
