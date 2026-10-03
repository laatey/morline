import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { Canvas, useCanvasState } from "@/components/moor/canvas";
import { Inspector } from "@/components/moor/inspector";
import { NewServiceDialog } from "@/components/moor/new-service";
import { AiAssistant } from "@/components/moor/ai-assistant";
import { StatusDot } from "@/components/moor/primitives";
import { cn } from "@/lib/utils";
import { api, type ApiError } from "@/lib/api";
import { selectProject, useProject } from "@/lib/workspace";
import type { Kind, LogoKey } from "@/lib/platform-data";
import { PendingChangesBar } from "@/components/moor/pending-changes";

export const Route = createFileRoute("/project/$projectId")({
  beforeLoad: ({ params }) => {
    if (params.projectId) {
      selectProject(params.projectId);
    }
  },
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
  const { projectId } = Route.useParams();
  if (projectId) {
    selectProject(projectId);
  }
  const navigate = useNavigate();
  const state = useCanvasState();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState<{ text: string; key: number } | null>(null);
  const service = state.services.find((s) => s.id === selected);
  const projectName = useProject().data?.name;

  useEffect(() => {
    if (projectId) selectProject(projectId);
  }, [projectId]);

  useEffect(() => {
    const onAsk = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text;
      if (!text) return;
      setSelected(null);
      setAssistantPrompt({ text, key: Date.now() });
      setAssistantOpen(true);
    };
    window.addEventListener("morline:assistant", onAsk);
    return () => window.removeEventListener("morline:assistant", onAsk);
  }, []);

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

  // Drops a placeholder card on the canvas immediately, then swaps in the real service.
  const addService = async (name: string, logo: LogoKey, kind: Kind, body: Record<string, unknown>, note: string) => {
    setAdding(false);
    if (!state.envId) return;
    const maxY = state.services.length ? Math.max(...state.services.map((s) => s.y)) : -100;
    const position = { x: 80, y: maxY + 180 };
    const tempId = `tmp_${crypto.randomUUID()}`;
    const isRepo = (body['source'] as { type?: string } | undefined)?.type === "github";
    state.setServices((all) => [...all, { id: tempId, name, kind, logo, status: isRepo ? "idle" : "deploying", x: position.x, y: position.y, source: name, region: "us-east", replicas: 1, cpu: 0, mem: 0, lastDeploy: "just now" }]);
    try {
      const res = await api<{ service?: { id: string; name: string }; id?: string; name?: string; data?: { id: string; name: string } }>(`/environments/${state.envId}/services`, { method: "POST", body: { ...body, position } });
      const created = res?.service ?? res?.data ?? (res?.id ? { id: res.id, name: res.name ?? name } : null);
      await state.refresh();
      if (created?.id) setSelected(created.id);
      toast.success(`${created?.name ?? name} added — ${note}`);
    } catch (e) {
      toast.error((e as ApiError)?.message ?? `Could not add ${name}`);
    } finally {
      state.setServices((all) => all.filter((s) => s.id !== tempId));
    }
  };

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
        </Button>
      </div>
      {state.loading ? (
        <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center" aria-label="Loading services">
          <div className="h-32 w-[280px] rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
              <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-5 h-3 w-40 animate-pulse rounded bg-muted/70" />
            <div className="mt-2.5 h-2.5 w-24 animate-pulse rounded bg-muted/50" />
          </div>
        </div>
      ) : null}
      <PendingChangesBar />
      {service ? <Inspector service={service} onClose={() => setSelected(null)} /> : null}
      {assistantOpen && !service ? <AiAssistant initialPrompt={assistantPrompt} onClose={() => { setAssistantOpen(false); setAssistantPrompt(null); }} /> : null}
      <NewServiceDialog
        open={adding}
        onOpenChange={setAdding}
        onPick={(t) => void addService(t.name, t.logo, t.kind, { templateId: t.id, source: { type: "template", templateId: t.id } }, "first deploy started")}
        onPickRepo={(r) => void addService(r.fullName.split("/")[1] ?? r.fullName, "github", "app", { name: r.fullName.split("/")[1], source: { type: "github", repo: r.fullName, branch: r.defaultBranch, ...(r.url ? { url: r.url } : {}) } }, "configure variables and settings, then deploy")}
      />

    </WorkspaceShell>
  );
}
