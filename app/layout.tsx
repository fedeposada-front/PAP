import type { Metadata } from "next";
import "../src/styles/index.css";
import { AppProviders } from "./providers";
import { AppBottomNav } from "../src/app/components/AppBottomNav";

export const metadata: Metadata = {
  title: "Lovcal",
  description: "Plateforme de decouverte locale pour trouver un cadeau pres de chez vous.",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders>
          <div className="pb-16 lg:pb-0">
            {children}
          </div>
          <AppBottomNav />
        </AppProviders>
      </body>
    </html>
  );
}
