import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader, Rocket, Undo } from "fluid-icons/react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, type ApiError } from "@/lib/api";
import { useEnvId } from "@/lib/workspace";

export type StagedChange = {
  id: string;
  serviceId: string;
  serviceName?: string;
  type: string;
  summary: string;
  createdAt?: string;
};

/** Changes saved on services (variables, settings…) that are not live until the next deploy. */
export function usePendingChanges() {
  const envId = useEnvId();
  const qc = useQueryClient();
  // Refresh right after any write instead of waiting for the poll.
  useEffect(() => {
    if (!envId) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = (e: Event) => {
      const path = (e as CustomEvent<{ path: string }>).detail?.path ?? "";
      if (path.includes("staged-changes")) return;
      clearTimeout(t);
      t = setTimeout(() => void qc.invalidateQueries({ queryKey: ["staged-changes", envId] }), 150);
    };
    window.addEventListener("morline:mutated", on);
    return () => {
      clearTimeout(t);
      window.removeEventListener("morline:mutated", on);
    };
  }, [envId, qc]);
  return useQuery({
    queryKey: ["staged-changes", envId],
    queryFn: async () => {
      try {
        return (
          (await api<{ data: StagedChange[] }>(`/environments/${envId}/staged-changes`)).data ?? []
        );
      } catch (e) {
        if ((e as ApiError).status === 404) return [];
        throw e;
      }
    },
    enabled: !!envId,
    refetchInterval: 8000,
  });
}

/** Changes detected → Ready to deploy → Deploying (handed off to the deployments list). */
export function PendingChangesBar() {
  const envId = useEnvId();
  const qc = useQueryClient();
  const { data: changes = [] } = usePendingChanges();
  const [busy, setBusy] = useState<"deploy" | "discard" | null>(null);
  if (!envId || (!changes.length && !busy)) return null;
  const services = new Set(changes.map((c) => c.serviceId)).size || 1;
  const key = ["staged-changes", envId];
  const names = [...new Set(changes.map((c) => c.serviceName).filter(Boolean))]
    .slice(0, 2)
    .join(", ");

  const act = async (kind: "deploy" | "discard") => {
    if (busy) return;
    setBusy(kind);
    const prev = qc.getQueryData<StagedChange[]>(key);
    try {
      await api(`/environments/${envId}/staged-changes${kind === "deploy" ? "/deploy" : ""}`, {
        method: kind === "deploy" ? "POST" : "DELETE",
      });
      qc.setQueryData(key, []);
      toast.success(
        kind === "deploy"
          ? `Deploying ${services} service${services > 1 ? "s" : ""}`
          : "Changes discarded",
      );
      void qc.invalidateQueries({ queryKey: ["canvas", envId] });
      void qc.invalidateQueries({ queryKey: ["variables"] });
      void qc.invalidateQueries({ queryKey: ["deployments"] });
    } catch (e) {
      qc.setQueryData(key, prev);
      toast.error((e as ApiError).message ?? "Could not apply changes");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      role="status"
      className="absolute bottom-4 left-1/2 z-20 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-primary/50 bg-card py-2 pl-3.5 pr-2 shadow-[0_10px_40px_-10px_oklch(0_0_0/0.6)] ring-4 ring-primary/10 animate-in fade-in slide-in-from-bottom-3 duration-150"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
        <span className="relative h-2 w-2 rounded-full bg-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-tight">
          {busy === "deploy" ? "Starting deploy…" : "Ready to deploy"}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {changes.length} change{changes.length === 1 ? "" : "s"} not live yet
          {names ? ` · ${names}` : ` · ${services} service${services > 1 ? "s" : ""}`}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1 px-2 text-xs"
        disabled={!!busy}
        onClick={() => void act("discard")}
      >
        {busy === "discard" ? (
          <Loader className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Undo className="h-3.5 w-3.5" />
        )}
        Discard
      </Button>
      <Button
        size="sm"
        className="h-8 gap-1.5 px-3 text-xs"
        disabled={!!busy}
        onClick={() => void act("deploy")}
      >
        {busy === "deploy" ? (
          <Loader className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Rocket className="h-3.5 w-3.5" />
        )}
        Deploy
      </Button>
    </div>
  );
}
