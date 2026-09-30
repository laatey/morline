import type { ReactNode } from "react";

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b px-4 py-6 md:grid-cols-[220px_1fr]">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="max-w-xl space-y-3">{children}</div>
    </section>
  );
}
