import type { Metadata } from "next";
import "../src/styles/index.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "MonCadeauLocal",
  description: "Plateforme de decouverte locale pour trouver un cadeau pres de chez vous.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
