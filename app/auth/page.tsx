export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AuthScreenNext } from "../../src/app/components/screens/AuthScreenNext";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthScreenNext />
    </Suspense>
  );
}
