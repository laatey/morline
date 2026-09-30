import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Rocket, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, type ApiError } from "@/lib/api";
import { useEnvId } from "@/lib/workspace";

export type StagedChange = { id: string; serviceId: string; serviceName?: string; type: string; summary: string; createdAt?: string };

/** Changes saved on services (variables, settings…) that are not live until the next deploy. */
export function usePendingChanges() {
  const envId = useEnvId();
  return useQuery({
    queryKey: ["staged-changes", envId],
    queryFn: async () => {
      try {
        return (await api<{ data: StagedChange[] }>(`/environments/${envId}/staged-changes`)).data ?? [];
      } catch (e) {
        if ((e as ApiError).status === 404) return [];
        throw e;
      }
    },
    enabled: !!envId,
    refetchInterval: 10000,
  });
}

export function PendingChangesBar() {
  const envId = useEnvId();
  const qc = useQueryClient();
  const { data: changes = [] } = usePendingChanges();
  const [busy, setBusy] = useState<"deploy" | "discard" | null>(null);
  if (!changes.length || !envId) return null;
  const services = new Set(changes.map((c) => c.serviceId)).size;
  const key = ["staged-changes", envId];

  const act = async (kind: "deploy" | "discard") => {
    setBusy(kind);
    const prev = qc.getQueryData<StagedChange[]>(key);
    qc.setQueryData(key, []);
    try {
      await api(`/environments/${envId}/staged-changes${kind === "deploy" ? "/deploy" : ""}`, { method: kind === "deploy" ? "POST" : "DELETE" });
      toast.success(kind === "deploy" ? `Deploying ${services} service${services > 1 ? "s" : ""}` : "Changes discarded");
      void qc.invalidateQueries({ queryKey: ["canvas", envId] });
      void qc.invalidateQueries({ queryKey: ["variables"] });
      void qc.invalidateQueries({ queryKey: ["deployments", envId] });
    } catch (e) {
      qc.setQueryData(key, prev);
      toast.error((e as ApiError).message ?? "Could not apply changes");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl border bg-card/95 py-1.5 pl-3.5 pr-1.5 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      <p className="text-xs">
        <span className="font-medium">{changes.length} unapplied change{changes.length > 1 ? "s" : ""}</span>
        <span className="text-muted-foreground"> · {services} service{services > 1 ? "s" : ""}</span>
      </p>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" disabled={!!busy} onClick={() => void act("discard")}><Undo2 className="h-3.5 w-3.5" />Discard</Button>
        <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" disabled={!!busy} onClick={() => void act("deploy")}><Rocket className="h-3.5 w-3.5" />Deploy</Button>
      </div>
    </div>
  );
}
