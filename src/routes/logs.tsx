import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { LogStream } from "@/components/moor/panels";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Logs — Morline" },
      { name: "description", content: "Live, searchable logs from every service in the environment." },
      { property: "og:title", content: "Logs — Morline" },
      { property: "og:description", content: "Live, searchable logs from every service in the environment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <WorkspaceShell title="Logs">
      <LogStream />
    </WorkspaceShell>
  ),
});
