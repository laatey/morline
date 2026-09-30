import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { Canvas, useCanvasState } from "@/components/moor/canvas";
import { Inspector } from "@/components/moor/inspector";
import { NewServiceDialog } from "@/components/moor/new-service";
import { AiAssistant } from "@/components/moor/ai-assistant";
import { Kbd, StatusDot } from "@/components/moor/primitives";
import { cn } from "@/lib/utils";
import { api, type ApiError } from "@/lib/api";
import { useProject } from "@/lib/workspace";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { name: "theme-color", content: "#171717" },
      { title: "Canvas — Morline" },
      { name: "description", content: "Visual map of every service, database and connection in your environment." },
      { property: "og:title", content: "Canvas — Morline" },
      { property: "og:description", content: "Visual map of every service, database and connection in your environment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CanvasPage,
});

function CanvasPage() {
  const state = useCanvasState();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const service = state.services.find((s) => s.id === selected);
  const projectName = useProject().data?.name;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setAdding(true); }
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = state.services.reduce<Record<string, number>>((a, s) => ({ ...a, [s.status]: (a[s.status] ?? 0) + 1 }), {});

  return (
    <WorkspaceShell title="Canvas" onAssistant={() => setAssistantOpen((open) => !open)}>
      <Canvas state={state} selected={selected} onSelect={setSelected} />
      {!state.loading && state.envId && !state.services.length ? (
        <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center">
          <div className="pointer-events-auto max-w-xs rounded-xl border bg-card/95 p-5 text-center shadow-sm backdrop-blur">
            <p className="label-caps">{projectName ?? "Project"} · empty</p>
            <p className="mt-2 font-display text-lg font-semibold">Drop your first service</p>
            <p className="mt-1 text-sm text-muted-foreground">Start from a database, a starter or an app template. It deploys as soon as it lands.</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />Add a service</Button>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-2 rounded-lg border bg-card/95 px-2.5 py-1 font-mono text-[10px] shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:gap-3 sm:px-3 sm:py-1.5 sm:text-[11px]">
        <span className="text-foreground">{state.services.length} services</span>
        <span className="hidden items-center gap-2 sm:flex">
          {(["online", "deploying", "crashed"] as const).map((k) => counts[k] ? (
            <span key={k} className="flex items-center gap-1.5 text-muted-foreground"><StatusDot status={k} />{counts[k]} {k}</span>
          ) : null)}
        </span>
      </div>
      <div
        className={cn(
          "absolute top-2 z-10 flex items-center gap-1.5 transition-all sm:top-3 sm:gap-2",
          service ? "hidden sm:flex" : "right-2 sm:right-3"
        )}
        style={service ? { right: 584 } : undefined}
      >
        
        <Button size="sm" className="h-7 gap-1 px-2.5 text-xs sm:h-8 sm:gap-1.5 sm:px-3" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
          <Kbd className="hidden sm:inline-block">N</Kbd>
        </Button>
      </div>
      {service ? <Inspector service={service} onClose={() => setSelected(null)} /> : null}
      {assistantOpen && !service ? <AiAssistant onClose={() => setAssistantOpen(false)} /> : null}
      <NewServiceDialog
        open={adding}
        onOpenChange={setAdding}
        onPick={async (t) => {
          setAdding(false);
          if (!state.envId) return;
          const maxY = state.services.length ? Math.max(...state.services.map((s) => s.y)) : -100;
          try {
            const res = await api<{ service: { id: string; name: string } }>(`/environments/${state.envId}/services`, {
              method: "POST",
              body: { templateId: t.id, source: { type: "template", templateId: t.id }, position: { x: 80, y: maxY + 180 } },
            });
            await state.refresh();
            setSelected(res.service.id);
            toast.success(`${res.service.name} added — first deploy started`);
          } catch (e) {
            toast.error((e as ApiError).message ?? `Could not add ${t.name}`);
          }
        }}
        onPickRepo={async (r) => {
          setAdding(false);
          if (!state.envId) return;
          const maxY = state.services.length ? Math.max(...state.services.map((s) => s.y)) : -100;
          try {
            const res = await api<{ service: { id: string; name: string } }>(`/environments/${state.envId}/services`, {
              method: "POST",
              body: { name: r.fullName.split("/")[1], source: { type: "github", repo: r.fullName, branch: r.defaultBranch }, position: { x: 80, y: maxY + 180 } },
            });
            await state.refresh();
            setSelected(res.service.id);
            toast.success(`${res.service.name} added — first build started`);
          } catch (e) {
            toast.error((e as ApiError).message ?? `Could not deploy ${r.fullName}`);
          }
        }}
      />
    </WorkspaceShell>
  );
}
