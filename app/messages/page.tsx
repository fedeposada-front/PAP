export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { MessagesScreenNext } from "../../src/app/components/screens/MessagesScreenNext";

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesScreenNext />
    </Suspense>
  );
}
