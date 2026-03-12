"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Button, Logo } from "../../src/app/components/ds";
import { ONBOARDING_SLIDES } from "../../src/app/data/catalog";
import giftIcon from "../../src/assets/gift-icon.png";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = ONBOARDING_SLIDES[step];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-end px-5 pt-6">
        <button
          onClick={() => router.push("/location")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Passer
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {step === 0 && (
          <div className="mb-8 flex justify-center w-full">
            <Logo size="2xl" />
          </div>
        )}
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
              <img
                src={giftIcon.src}
                alt="Cadeau"
                className="w-20 h-20 mx-auto mb-8 object-contain"
              />
            ) : (
              <span className="text-7xl mb-8 block">{slide.emoji}</span>
            )}
            <h1 className="mb-4">{slide.title}</h1>
            <p className="text-muted-foreground">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

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
          <Button fullWidth size="lg" onClick={() => router.push("/location")}>
            Commencer
          </Button>
        )}
      </div>
    </div>
  );
}
