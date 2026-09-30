import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { timeAgo, useProject, useSelection } from "@/lib/workspace";

type ApiActivity = { id: string; type: string; actor: { name: string } | null; actorType?: string; summary: string; createdAt?: string; at?: string; detail?: string | null };
const kindOf = (t: string) => t.startsWith("deploy") ? "deploy" : t.startsWith("variable") || t.startsWith("service") || t.startsWith("project") ? "config" : t.startsWith("domain") || t.startsWith("connection") ? "network" : t.startsWith("environment") ? "env" : t.startsWith("team") || t.startsWith("member") || t.startsWith("invite") ? "team" : "alert";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Morline" },
      { name: "description", content: "An audit trail of deploys, config changes, alerts and team events." },
      { property: "og:title", content: "Activity — Morline" },
      { property: "og:description", content: "An audit trail of deploys, config changes, alerts and team events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

const kinds = ["all", "deploy", "config", "alert", "network", "env", "team"] as const;
const kindTone: Record<string, string> = { deploy: "bg-primary", config: "bg-chart-5", alert: "bg-destructive", network: "bg-score", env: "bg-score-mid", team: "bg-muted-foreground" };

function ActivityPage() {
  const [kind, setKind] = useState<(typeof kinds)[number]>("all");
  const { projectId } = useSelection();
  const projectName = useProject().data?.name ?? "this project";
  const q = useQuery({ queryKey: ["activity", projectId], queryFn: async () => (await api<{ data: ApiActivity[] }>(`/projects/${projectId}/activity?limit=100`)).data, enabled: !!projectId, refetchInterval: 15000 });
  const rows = (q.data ?? []).map((a) => ({ id: a.id, kind: kindOf(a.type), who: a.actor?.name ?? "Morline", summary: a.summary, detail: a.detail ?? a.type, when: timeAgo(a.createdAt ?? a.at) })).filter((a) => kind === "all" || a.kind === kind);
  return (
    <WorkspaceShell title="Activity">
      <div className="scroll-area h-full overflow-y-auto">
        <div className="border-b px-4 py-5">
          <h1 className="text-xl font-semibold">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything that changed in {projectName}, newest first.</p>
        </div>
        <div className="flex flex-wrap gap-1 border-b px-4 py-2">
          {kinds.map((k) => <button key={k} onClick={() => setKind(k)} className={cn("rounded-md px-2.5 py-1 text-xs capitalize text-muted-foreground hover:bg-accent", kind === k && "bg-accent text-foreground")}>{k}</button>)}
        </div>
        <ol className="relative px-4 py-4">
          <span aria-hidden className="absolute bottom-4 left-[23px] top-4 w-px bg-border" />
          {rows.map((a) => (
            <li key={a.id} className="relative flex gap-3 py-2.5">
              <span className={cn("relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-background", kindTone[a.kind])} />
              <div className="min-w-0 flex-1 text-sm">
                <p><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.summary}</span></p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{a.detail}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{a.when}</span>
            </li>
          ))}
          {q.isLoading ? <li aria-busy className="space-y-2 py-4">{[0,1,2,3].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-muted/60" />)}</li> : !rows.length ? <li className="py-8 text-center text-sm text-muted-foreground">{kind === "all" ? "Nothing has happened yet." : `No ${kind} events.`}</li> : null}
        </ol>
      </div>
    </WorkspaceShell>
  );
}
