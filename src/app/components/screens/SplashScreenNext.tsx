"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "../ds";
import { useAuth } from "../AuthContext";

export function SplashScreenNext() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const isRecoveryLink =
        searchParams.get("type") === "recovery" ||
        hashParams.get("type") === "recovery";

      if (isRecoveryLink) {
        const hash = window.location.hash || "";
        router.replace(`/auth?flow=recovery${hash}`);
        return;
      }
    }

    if (isLoading) return;

    const targetPath = isAuthenticated
      ? (user?.role === "seller" ? "/dashboard" : "/home")
      : "/auth";

    const timer = setTimeout(() => router.push(targetPath), 1200);
    return () => clearTimeout(timer);
  }, [router, isLoading, isAuthenticated, user?.role]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Logo size="lg" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-4 text-muted-foreground text-sm"
      >
        Le cadeau local, en un clic
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-10"
      >
        <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </motion.div>
    </div>
  );
}
