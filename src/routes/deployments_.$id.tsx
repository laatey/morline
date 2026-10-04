import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, GitCommit, Loader, RotateCw, Close } from "fluid-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { DeployBadge } from "@/components/moor/primitives";
import { LogStream, deployState, deployTitle, duration } from "@/components/moor/panels";
import { api, type ApiError } from "@/lib/api";
import { timeAgo, type ApiDeployment } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type Phase = { name: string; status: "pending" | "running" | "succeeded" | "failed" | "skipped"; startedAt: string | null; finishedAt: string | null };
type Detail = ApiDeployment & { phases?: Phase[]; url?: string | null };

export const Route = createFileRoute("/deployments_/$id")({
  head: () => ({
    meta: [
      { title: "Deployment — Morline" },
      { name: "description", content: "Build phases, logs and actions for a single deployment." },
      { property: "og:title", content: "Deployment — Morline" },
      { property: "og:description", content: "Build phases, logs and actions for a single deployment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeploymentDetail,
});

function phaseTime(p: Phase) {
  if (!p.startedAt) return "";
  const end = p.finishedAt ? new Date(p.finishedAt).getTime() : Date.now();
  const s = Math.max(0, Math.round((end - new Date(p.startedAt).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function DeploymentDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["deployment", id],
    queryFn: () => api<Detail>(`/deployments/${id}`),
    refetchInterval: (query) => (["active", "failed", "crashed", "cancelled", "removed"].includes(query.state.data?.state ?? "") ? false : 2000),
  });
  const d = q.data;
  const act = async (action: "redeploy" | "rollback" | "cancel") => {
    try {
      await api(`/deployments/${id}/${action}`, { method: "POST" });
      toast.success(action === "redeploy" ? "Redeploy started" : action === "rollback" ? "Rollback started" : "Deployment cancelled");
      void qc.invalidateQueries({ queryKey: ["deployment", id] });
      void qc.invalidateQueries({ queryKey: ["deployments"] });
    } catch (e) { toast.error((e as ApiError).message ?? `Could not ${action}`); }
  };

  if (q.isError) {
    return <WorkspaceShell title="Deployments"><div className="p-10 text-center text-sm text-muted-foreground">That deployment doesn't exist. <Link to="/deployments" className="text-primary">Back to deployments</Link></div></WorkspaceShell>;
  }
  if (!d) {
    return <WorkspaceShell title="Deployments"><div className="space-y-3 p-6">{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-muted/60" />)}</div></WorkspaceShell>;
  }
  const st = deployState(d.state);
  const running = st === "building" || st === "queued";
  return (
    <WorkspaceShell title="Deployments">
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-4">
          <Link to="/deployments" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" />Deployments</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <DeployBadge state={st} />
            <h1 className="text-lg font-semibold">{deployTitle(d)}</h1>
            <div className="ml-auto flex gap-2">
              {running ? <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => act("cancel")}>Cancel</Button> : null}
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => act("redeploy")}><RotateCw className="h-3.5 w-3.5" />Redeploy</Button>
              {d.rollbackable && st !== "active" && !running ? <Button size="sm" className="h-8 text-xs" onClick={() => act("rollback")}>Roll back</Button> : null}
            </div>
          </div>
          <p className="mt-1 flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground">
            <span>{d.serviceName}</span>
            {d.commit?.sha ? <span className="inline-flex items-center gap-1"><GitCommit className="h-3 w-3" />{d.commit.sha.slice(0, 7)}</span> : null}
            <span>{d.commit?.author ?? d.createdBy?.name ?? d.trigger}</span><span>{timeAgo(d.createdAt)}</span><span>{duration(d)}</span>
            {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{d.url.replace(/^https?:\/\//, "")}</a> : null}
          </p>
        </div>
        <div className="grid min-h-0 flex-1 md:grid-cols-[300px_1fr]">
          <ol className="border-b p-4 md:border-b-0 md:border-r">
            <p className="label-caps mb-3">Build steps</p>
            {(d.phases ?? []).map((p) => (
              <li key={p.name} className="flex items-center gap-2 py-1.5 text-xs">
                {p.status === "succeeded" ? <Check className="h-3.5 w-3.5 text-score" /> : p.status === "running" ? <Loader className="h-3.5 w-3.5 animate-spin text-score-mid" /> : p.status === "failed" ? <Close className="h-3.5 w-3.5 text-destructive" /> : <span className="h-3.5 w-3.5 rounded-full border" />}
                <span className={cn("flex-1 truncate font-mono capitalize", p.status === "skipped" && "text-muted-foreground line-through")}>{p.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{p.status === "skipped" ? "" : phaseTime(p)}</span>
              </li>
            ))}
            {!d.phases?.length ? <p className="font-mono text-[11px] text-muted-foreground">No phase data for this deployment.</p> : null}
            {d.errorSummary ? <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">{d.errorSummary}</p> : null}
          </ol>
          <div className="min-h-[300px]"><LogStream deploymentId={d.id} /></div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
