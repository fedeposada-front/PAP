"use client";

import dynamic from "next/dynamic";

const LegacyApp = dynamic(() => import("../src/app/App"), {
  ssr: false,
});

export default function ClientApp() {
  return <LegacyApp />;
}
