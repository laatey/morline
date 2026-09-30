import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { DeploymentList } from "@/components/moor/panels";
import { Logo } from "@/components/moor/primitives";
import { useEnvironments, useEnvId, useServices } from "@/lib/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/deployments")({
  head: () => ({
    meta: [
      { title: "Deployments — Morline" },
      { name: "description", content: "Every build and release across the environment, with rollbacks one click away." },
      { property: "og:title", content: "Deployments — Morline" },
      { property: "og:description", content: "Every build and release across the environment, with rollbacks one click away." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeploymentsPage,
});

function DeploymentsPage() {
  const [svc, setSvc] = useState<string | undefined>();
  const services = useServices().data ?? [];
  const envId = useEnvId();
  const envName = useEnvironments().data?.find((e) => e.id === envId)?.name ?? "this environment";
  return (
    <WorkspaceShell title="Deployments">
      <div className="flex h-full">
        <aside className="hidden w-56 shrink-0 border-r py-2 md:block">
          <p className="label-caps px-4 py-2">Services</p>
          <FilterBtn active={!svc} onClick={() => setSvc(undefined)}>All services</FilterBtn>
          {services.map((s) => (
            <FilterBtn key={s.id} active={svc === s.id} onClick={() => setSvc(s.id)}><Logo k={s.logo} className="h-3.5 w-3.5" />{s.name}</FilterBtn>
          ))}
        </aside>
        <div className="scroll-area min-w-0 flex-1 overflow-y-auto">
          <div className="border-b px-4 py-5">
            <h1 className="text-xl font-semibold">Deployments</h1>
            <p className="mt-1 text-sm text-muted-foreground">Builds triggered by pushes, manual redeploys and rollbacks in {envName}.</p>
          </div>
          <DeploymentList serviceId={svc} />
        </div>
      </div>
    </WorkspaceShell>
  );
}

function FilterBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground", active && "bg-accent text-foreground")}>
      {children}
    </button>
  );
}
