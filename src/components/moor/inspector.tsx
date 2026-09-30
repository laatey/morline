import { useState } from "react";
import { ExternalLink, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Service } from "@/lib/platform-data";
import { Logo, StatusDot } from "./primitives";
import { DeploymentList, LogStream, MetricsGrid, NetworkingPanel, ServiceSettings, VariablesTable } from "./panels";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";

const tabs = ["Deploys", "Variables", "Metrics", "Logs", "Network", "Settings"] as const;

export function Inspector({ service, onClose }: { service: Service; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Deploys");
  const qc = useQueryClient();
  const redeploy = async () => {
    try {
      await api(`/services/${service.id}/deployments`, { method: "POST", body: {} });
      toast.success(`Redeploying ${service.name}`);
      void qc.invalidateQueries({ queryKey: ["deployments"] });
      void qc.invalidateQueries({ queryKey: ["canvas"] });
    } catch (e) { toast.error((e as ApiError).message ?? "Could not redeploy"); }
  };
  return (
    <aside className="absolute inset-x-0 bottom-0 top-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border-t bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:inset-auto sm:bottom-3 sm:right-3 sm:top-3 sm:z-10 sm:w-[calc(100%-1.5rem)] sm:max-w-[560px] sm:rounded-xl sm:border sm:slide-in-from-right-8">
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
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs sm:px-2.5" onClick={redeploy}><RotateCcw className="h-3 w-3" /><span className="hidden sm:inline">Redeploy</span></Button>
        {service.domain ? (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
            <a href={`https://${service.domain}`} target="_blank" rel="noreferrer" aria-label="Open domain"><ExternalLink className="h-3.5 w-3.5" /></a>
          </Button>
        ) : null}
        <button aria-label="Close panel" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground sm:p-1.5"><X className="h-4 w-4" /></button>
      </div>
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
        {tab === "Deploys" && <DeploymentList serviceId={service.id} compact />}
        {tab === "Variables" && <VariablesTable key={service.id} serviceId={service.id} />}
        {tab === "Metrics" && <MetricsGrid service={service} />}
        {tab === "Logs" && <div className="h-full"><LogStream serviceId={service.id} dense /></div>}
        {tab === "Network" && <NetworkingPanel service={service} />}
        {tab === "Settings" && <ServiceSettings service={service} onDeleted={onClose} />}
      </div>
    </aside>
  );
}
