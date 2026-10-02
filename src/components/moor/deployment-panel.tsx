import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronRight, CircleAlert, GitBranch, GitPullRequest, Loader2, MessageSquare, MoreHorizontal, RotateCcw, Sparkles as _unused, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Service } from "@/lib/platform-data";
import { api, type ApiError } from "@/lib/api";
import type { ApiDeployment } from "@/lib/workspace";
import { DeployBadge, Logo } from "./primitives";
import { LogStream, deployState, deployTitle, duration } from "./panels";
import { cn } from "@/lib/utils";

void _unused;

type Phase = { name: string; status: "pending" | "running" | "succeeded" | "failed" | "skipped"; startedAt: string | null; finishedAt: string | null };
type DeployVar = { key: string; value?: string; secret?: boolean };
export type DeploymentDetail = ApiDeployment & {
  phases?: Phase[];
  url?: string | null;
  variables?: DeployVar[];
  config?: Record<string, unknown> | null;
  source?: { type?: string; repo?: string; branch?: string } | null;
};

export type Diagnosis = {
  status: "pending" | "running" | "completed" | "failed";
  summary?: string;
  rootCause?: string;
  suggestedFix?: string;
  canAutoFix?: boolean;
  fix?: { title?: string; files?: { path: string; diff: string }[] } | null;
  pullRequest?: { url: string; number?: number } | null;
  dismissed?: boolean;
};

const tabs = ["Details", "Build Logs", "Deploy Logs"] as const;
type Tab = (typeof tabs)[number];

/** Event the canvas page listens for to open the assistant with a prefilled prompt. */
export function openAssistantWith(text: string) {
  window.dispatchEvent(new CustomEvent("morline:assistant", { detail: { text } }));
}

function stamp(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

export function DeploymentPanel({ service, deployment, onBack, onClose }: { service: Service; deployment: ApiDeployment; onBack: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Details");
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["deployment", deployment.id],
    queryFn: () => api<DeploymentDetail>(`/deployments/${deployment.id}`),
    placeholderData: deployment as DeploymentDetail,
    refetchInterval: (query) => (["active", "failed", "crashed", "cancelled", "removed"].includes(query.state.data?.state ?? "") ? false : 2000),
  });
  const d = { ...q.data, state: deployment.state } as DeploymentDetail; // keep list-normalised state (superseded → removed)
  const st = deployState(d.state);
  const running = st === "building" || st === "queued";

  const act = async (action: "redeploy" | "rollback" | "cancel") => {
    try {
      await api(`/deployments/${d.id}/${action}`, { method: "POST" });
      toast.success(action === "redeploy" ? "Redeploy started" : action === "rollback" ? "Rollback started" : "Deployment cancelled");
      void qc.invalidateQueries({ queryKey: ["deployments"] });
      void qc.invalidateQueries({ queryKey: ["deployment", d.id] });
    } catch (e) { toast.error((e as ApiError).message ?? `Could not ${action}`); }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-3.5 sm:px-4 sm:pt-4">
        <button aria-label="Back to service" onClick={onBack} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
        <span className="grid h-7 w-7 place-items-center rounded-md border bg-surface"><Logo k={service.logo} className="h-4 w-4" /></span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold">{service.name}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-xs">{(d.commit?.sha ?? d.id).replace(/^dep_/, "").slice(0, 8)}</span>
          <DeployBadge state={st} />
        </div>
        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{stamp(d.createdAt)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Deployment actions" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => act("redeploy")}><RotateCcw className="mr-2 h-3.5 w-3.5" />Redeploy</DropdownMenuItem>
            {d.rollbackable && st !== "active" && !running ? <DropdownMenuItem onClick={() => act("rollback")}>Roll back to this</DropdownMenuItem> : null}
            {running ? <DropdownMenuItem className="text-destructive" onClick={() => act("cancel")}>Cancel</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <button aria-label="Close panel" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div role="tablist" className="no-scrollbar flex gap-4 overflow-x-auto border-b px-4">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("relative h-9 shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground", tab === t && "text-foreground")}>
            {t}
            {tab === t ? <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" /> : null}
          </button>
        ))}
      </div>
      <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
        {tab === "Details" && <DetailsTab d={d} service={service} />}
        {tab === "Build Logs" && <div className="h-full"><LogStream key="b" deploymentId={d.id} phase="build" dense /></div>}
        {tab === "Deploy Logs" && <div className="h-full"><LogStream key="d" deploymentId={d.id} phase="deploy" dense /></div>}
      </div>
    </>
  );
}

function DetailsTab({ d, service }: { d: DeploymentDetail; service: Service }) {
  const st = deployState(d.state);
  const [varsOpen, setVarsOpen] = useState(false);
  const [view, setView] = useState<"pretty" | "code">("pretty");
  const config = d.config ?? null;
  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center gap-2 text-sm">
        {st === "active" || st === "removed" ? <Check className="h-4 w-4 text-score" /> : st === "failed" ? <CircleAlert className="h-4 w-4 text-destructive" /> : <Loader2 className="h-4 w-4 animate-spin text-score-mid" />}
        <span className={cn(st === "failed" ? "text-destructive" : st === "building" || st === "queued" ? "text-foreground" : "text-score")}>
          {st === "failed" ? "Deployment failed" : st === "building" ? "Deploying…" : st === "queued" ? "Queued" : st === "removed" ? "Deployment successful · superseded" : "Deployment successful"}
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{duration(d)}</span>
      </div>

      {st === "failed" ? <DiagnosisCard deploymentId={d.id} serviceName={service.name} errorSummary={d.errorSummary} /> : null}

      {d.phases?.length ? (
        <ol className="space-y-1 rounded-lg border p-3">
          {d.phases.map((p) => (
            <li key={p.name} className="flex items-center gap-2 text-xs">
              {p.status === "succeeded" ? <Check className="h-3.5 w-3.5 text-score" /> : p.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-score-mid" /> : p.status === "failed" ? <X className="h-3.5 w-3.5 text-destructive" /> : <span className="h-3.5 w-3.5 rounded-full border" />}
              <span className={cn("flex-1 font-mono capitalize", p.status === "skipped" && "text-muted-foreground line-through")}>{p.name}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {d.variables ? (
        <div className="rounded-lg border">
          <button onClick={() => setVarsOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm">
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", varsOpen && "rotate-90")} />{d.variables.length} variables
          </button>
          {varsOpen ? (
            <ul className="divide-y border-t font-mono text-[11px]">
              {d.variables.map((v) => (
                <li key={v.key} className="flex gap-3 px-3 py-1.5"><span className="w-40 shrink-0 truncate">{v.key}</span><span className="truncate text-muted-foreground">{v.secret || v.value == null ? "••••••••" : v.value}</span></li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section>
        <p className="mb-2 text-sm font-medium">{d.commit ? "Deployed via GitHub" : d.image ? "Deployed from image" : `Triggered ${d.trigger ?? "manually"}`}</p>
        <div className="rounded-lg border p-3">
          <p className="text-sm">{deployTitle(d)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
            {d.source?.repo ? <span>{d.source.repo}</span> : <span>{service.source}</span>}
            {d.source?.branch ? <span className="inline-flex items-center gap-1"><GitBranch className="h-3 w-3" />{d.source.branch}</span> : null}
            {d.commit?.author ? <span>{d.commit.author}</span> : null}
            {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{d.url.replace(/^https?:\/\//, "")}</a> : null}
          </p>
        </div>
      </section>

      {config ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Configuration</p>
            <div className="flex rounded-md border p-0.5 text-xs">
              {(["pretty", "code"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={cn("rounded px-2 py-0.5 capitalize text-muted-foreground", view === v && "bg-accent text-foreground")}>{v}</button>
              ))}
            </div>
          </div>
          {view === "code" ? (
            <pre className="overflow-x-auto rounded-lg border bg-surface p-3 font-mono text-[11px]">{JSON.stringify(config, null, 2)}</pre>
          ) : (
            <dl className="divide-y rounded-lg border text-xs">
              {Object.entries(config).map(([k, v]) => (
                <div key={k} className="flex gap-3 px-3 py-2"><dt className="w-36 shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 truncate font-mono">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd></div>
              ))}
            </dl>
          )}
        </section>
      ) : null}
    </div>
  );
}

/** AI crash analysis for a failed deployment, with an optional fix pull request. */
export function DiagnosisCard({ deploymentId, serviceName, errorSummary, compact }: { deploymentId: string; serviceName: string; errorSummary?: string | null | undefined; compact?: boolean }) {
  const qc = useQueryClient();
  const key = ["diagnosis", deploymentId];
  const [hidden, setHidden] = useState(false);
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      try { return await api<Diagnosis>(`/deployments/${deploymentId}/diagnosis`); }
      catch (e) { if ((e as ApiError).status === 404) return null; throw e; }
    },
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === "pending" || query.state.data?.status === "running" ? 2000 : false),
  });
  const analyze = useMutation({
    mutationFn: () => api<Diagnosis>(`/deployments/${deploymentId}/diagnosis`, { method: "POST", body: {} }),
    onMutate: () => qc.setQueryData(key, { status: "running" } satisfies Diagnosis),
    onSuccess: (data) => qc.setQueryData(key, data ?? { status: "running" }),
    onError: (e) => { qc.setQueryData(key, null); toast.error((e as ApiError).message ?? "Could not analyze this deployment"); },
  });
  const pr = useMutation({
    mutationFn: () => api<{ url: string; number?: number }>(`/deployments/${deploymentId}/diagnosis/pull-request`, { method: "POST", body: {} }),
    onSuccess: (res) => {
      qc.setQueryData<Diagnosis | null>(key, (old) => (old ? { ...old, pullRequest: res } : old));
      toast.success(res?.number ? `Pull request #${res.number} opened` : "Pull request opened");
    },
    onError: (e) => toast.error((e as ApiError).message ?? "Could not open a pull request"),
  });
  const dismiss = () => {
    setHidden(true);
    void api(`/deployments/${deploymentId}/diagnosis/dismiss`, { method: "POST" }).catch(() => {});
  };

  const dx = q.data;
  if (hidden || dx?.dismissed) return null;
  const busy = dx?.status === "pending" || dx?.status === "running";
  const chatPrompt = `My service "${serviceName}" failed to deploy (deployment ${deploymentId}).${errorSummary ? ` Error: ${errorSummary}.` : ""}${dx?.rootCause ? ` Your analysis said: ${dx.rootCause}` : ""} Help me fix it.`;

  return (
    <div className={cn("rounded-lg border border-destructive/30 bg-destructive/5 p-3", compact && "mx-4 my-3")}>
      <div className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{dx?.status === "completed" ? dx.summary ?? "Here's what went wrong" : "This deployment crashed"}</p>
          {!dx && errorSummary ? <p className="mt-0.5 truncate font-mono text-[11px] text-destructive">{errorSummary}</p> : null}
          {busy ? <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Reading build and deploy logs…</p> : null}
          {dx?.status === "failed" ? <p className="mt-1 text-xs text-muted-foreground">The analysis couldn't finish. Try again.</p> : null}
          {dx?.status === "completed" ? (
            <div className="mt-2 space-y-2 text-xs">
              {dx.rootCause ? <p><span className="text-muted-foreground">Cause · </span>{dx.rootCause}</p> : null}
              {dx.suggestedFix ? <p><span className="text-muted-foreground">Fix · </span>{dx.suggestedFix}</p> : null}
              {dx.fix?.files?.length ? (
                <details className="rounded-md border bg-card">
                  <summary className="cursor-pointer px-2 py-1.5 font-mono text-[11px] text-muted-foreground">{dx.fix.files.length} file{dx.fix.files.length > 1 ? "s" : ""} changed</summary>
                  {dx.fix.files.map((f) => (
                    <div key={f.path} className="border-t">
                      <p className="px-2 py-1 font-mono text-[11px]">{f.path}</p>
                      <pre className="max-h-48 overflow-auto px-2 pb-2 font-mono text-[10px] leading-relaxed">
                        {f.diff.split("\n").map((l, i) => <span key={i} className={cn("block", l.startsWith("+") && "text-score", l.startsWith("-") && "text-destructive")}>{l}</span>)}
                      </pre>
                    </div>
                  ))}
                </details>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {!dx || dx.status === "failed" ? (
              <Button size="sm" className="h-7 text-xs" onClick={() => analyze.mutate()} disabled={analyze.isPending}>Analyze with AI</Button>
            ) : null}
            {dx?.status === "completed" && dx.canAutoFix && !dx.pullRequest ? (
              <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => pr.mutate()} disabled={pr.isPending}>
                {pr.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitPullRequest className="h-3 w-3" />}Create pull request
              </Button>
            ) : null}
            {dx?.pullRequest ? (
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" asChild>
                <a href={dx.pullRequest.url} target="_blank" rel="noreferrer"><GitPullRequest className="h-3 w-3" />View PR{dx.pullRequest.number ? ` #${dx.pullRequest.number}` : ""}</a>
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => openAssistantWith(chatPrompt)}><MessageSquare className="h-3 w-3" />Open in chat</Button>
            {dx?.status === "completed" ? <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={dismiss}>Ignore</Button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
