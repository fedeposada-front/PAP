"use client";

import { useRouter } from "next/navigation";
import { Header } from "../ds";

export type PublicInfoSection = {
  title: string;
  paragraphs: string[];
};

export function PublicInfoScreenNext({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: PublicInfoSection[];
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header title={title} onBack={() => router.push("/home")} />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <p className="text-base leading-7 text-foreground">{intro}</p>
        </section>

        <div className="mt-5 space-y-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-border bg-white p-6 shadow-sm"
            >
              <h3 className="mb-3">{section.title}</h3>
              <div className="space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
