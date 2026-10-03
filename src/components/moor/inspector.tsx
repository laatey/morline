import { useState } from "react";
import { ExternalLink, Loader2, Rocket, RotateCcw, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Service } from "@/lib/platform-data";
import { Logo, StatusDot } from "./primitives";
import { DatabaseBackups, DatabaseConnect, DatabaseData } from "./database-panels";
import { DeploymentList, LogStream, MetricsGrid, NetworkingPanel, ServiceSettings, VariablesTable, deployState, normalizeDeployments } from "./panels";
import { DeploymentPanel, DiagnosisCard } from "./deployment-panel";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { useDeployments, useEnvId, type ApiDeployment } from "@/lib/workspace";

const appTabs = ["Deploys", "Variables", "Metrics", "Logs", "Network", "Settings"] as const;
const dbTabs = ["Data", "Connect", "Backups", "Variables", "Metrics", "Logs", "Settings"] as const;
type Tab = (typeof appTabs)[number] | (typeof dbTabs)[number];

export function Inspector({ service, onClose }: { service: Service; onClose: () => void }) {
  const isDb = service.kind === "database";
  const tabs: readonly Tab[] = isDb ? dbTabs : appTabs;
  const [tab, setTab] = useState<Tab>(isDb ? "Data" : "Deploys");
  const [openDeploy, setOpenDeploy] = useState<ApiDeployment | null>(null);
  const qc = useQueryClient();
  const envId = useEnvId();
  const latest = normalizeDeployments(useDeployments(service.id).data ?? [])[0];
  const [deploying, setDeploying] = useState(false);
  const [stopStep, setStopStep] = useState<"idle" | "confirm" | "busy">("idle");
  const idle = service.status === "idle";
  const redeploy = async () => {
    if (deploying) return;
    setDeploying(true);
    try {
      await api(`/services/${service.id}/deployments`, { method: "POST", body: {} });
      toast.success(idle ? `Deploying ${service.name}` : `Redeploying ${service.name}`);
      void qc.invalidateQueries({ queryKey: ["deployments"] });
      void qc.invalidateQueries({ queryKey: ["canvas"] });
      void qc.invalidateQueries({ queryKey: ["staged-changes", envId] });
    } catch (e) { toast.error((e as ApiError).message ?? "Could not deploy"); }
    finally { setDeploying(false); }
  };
  // Real backend call; the canvas only flips once the server confirms.
  const stop = async () => {
    if (stopStep === "busy") return;
    setStopStep("busy");
    try {
      await api(`/services/${service.id}/stop`, { method: "POST", body: {} });
      toast.success(`${service.name} stopped`);
      await qc.invalidateQueries({ queryKey: ["canvas"] });
      void qc.invalidateQueries({ queryKey: ["deployments"] });
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.status === 404 ? "Stopping services isn't available yet" : err.message ?? "Could not stop the service");
    } finally { setStopStep("idle"); }
  };
  const canStop = service.status === "online" || service.status === "deploying";
  const shell = "absolute inset-x-0 bottom-0 top-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border-t bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:inset-auto sm:bottom-3 sm:right-3 sm:top-3 sm:z-10 sm:w-[calc(100%-1.5rem)] sm:max-w-[560px] sm:rounded-xl sm:border sm:slide-in-from-right-8";
  if (openDeploy) {
    return <aside className={shell}><DeploymentPanel key={openDeploy.id} service={service} deployment={openDeploy} onBack={() => setOpenDeploy(null)} onClose={onClose} /></aside>;
  }
  return (
    <aside className={shell}>
      <div className="flex items-start gap-2.5 px-3.5 pb-2.5 pt-3.5 sm:gap-3 sm:px-4 sm:pb-3 sm:pt-4">
        <span className="grid h-8 w-8 place-items-center rounded-md border bg-surface sm:h-9 sm:w-9"><Logo k={service.logo} className="h-4 w-4 sm:h-5 sm:w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold leading-tight sm:text-lg">{service.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[10px] text-muted-foreground sm:gap-x-3 sm:gap-y-1 sm:text-[11px]">
            <StatusDot status={service.status} withLabel />
            <span>{service.source}</span>
            <span>{service.region}</span>
          </div>
        </div>
        {canStop ? (
          stopStep === "idle" ? (
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => setStopStep("confirm")}><Square className="h-3 w-3" /><span className="hidden sm:inline">Stop</span></Button>
          ) : (
            <div className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-0.5">
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={stopStep === "busy"} onClick={() => setStopStep("idle")}>Keep</Button>
              <Button size="sm" variant="destructive" className="h-6 gap-1 px-2 text-xs" disabled={stopStep === "busy"} onClick={() => void stop()}>
                {stopStep === "busy" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}Stop service
              </Button>
            </div>
          )
        ) : null}
        {!idle && stopStep === "idle" ? <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs sm:px-2.5" disabled={deploying} onClick={redeploy}>{deploying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}<span className="hidden sm:inline">Redeploy</span></Button> : null}
        {service.domain ? (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
            <a href={`https://${service.domain}`} target="_blank" rel="noreferrer" aria-label="Open domain"><ExternalLink className="h-3.5 w-3.5" /></a>
          </Button>
        ) : null}
        <button aria-label="Close panel" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground sm:p-1.5"><X className="h-4 w-4" /></button>
      </div>
      {idle ? (
        <div className="mx-3.5 mb-3 flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/5 p-3 ring-4 ring-primary/5 sm:mx-4">
          <Rocket className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">Ready to deploy</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Nothing is running yet. Check variables and settings, then deploy.</p>
          </div>
          <Button size="sm" className="h-8 gap-1.5 px-3 text-xs" disabled={deploying} onClick={redeploy}>
            {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}{deploying ? "Starting…" : "Deploy"}
          </Button>
        </div>
      ) : null}
      <div role="tablist" className="no-scrollbar flex gap-4 overflow-x-auto border-b px-4">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("relative h-9 shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground", tab === t && "text-foreground")}
          >
            {t}
            {tab === t ? <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" /> : null}
          </button>
        ))}
      </div>
      <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
        {tab === "Data" && <DatabaseData key={service.id} service={service} />}
        {tab === "Connect" && <DatabaseConnect key={service.id} service={service} />}
        {tab === "Backups" && <DatabaseBackups key={service.id} service={service} />}
        {tab === "Deploys" && (
          <DeploymentList
            serviceId={service.id}
            compact
            onOpen={setOpenDeploy}
            header={latest && deployState(latest.state) === "failed" ? <DiagnosisCard compact key={latest.id} deploymentId={latest.id} serviceName={service.name} errorSummary={latest.errorSummary} /> : null}
          />
        )}
        {tab === "Variables" && <VariablesTable key={service.id} serviceId={service.id} />}
        {tab === "Metrics" && <MetricsGrid service={service} />}
        {tab === "Logs" && <div className="h-full"><LogStream serviceId={service.id} dense /></div>}
        {tab === "Network" && <NetworkingPanel service={service} />}
        {tab === "Settings" && <ServiceSettings service={service} onDeleted={onClose} />}
      </div>
    </aside>
  );
}
