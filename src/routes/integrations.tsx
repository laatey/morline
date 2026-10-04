import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Refresh } from "fluid-icons/react";
import { Github } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useEnvId, useSelection } from "@/lib/workspace";

type GhStatus = { connected: boolean; account: { login: string; type?: string } | null; installUrl: string };
type Repo = { fullName: string; private: boolean; defaultBranch: string; alreadyDeployedIn?: string[] };

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "GitHub integration — Morline" },
      { name: "description", content: "Connect GitHub, choose repositories and control push-to-deploy and PR previews." },
      { property: "og:title", content: "GitHub integration — Morline" },
      { property: "og:description", content: "Connect GitHub, choose repositories and control push-to-deploy and PR previews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const qc = useQueryClient();
  const { teams, activeTeamId } = useAuth();
  const teamId = activeTeamId ?? teams[0]?.id ?? null;
  const { projectId } = useSelection();
  const envId = useEnvId();
  const status = useQuery({ queryKey: ["github", teamId], queryFn: () => api<GhStatus>(`/integrations/github?teamId=${teamId}`), enabled: !!teamId });
  const connected = !!status.data?.connected;
  const repos = useQuery({ queryKey: ["github-repos", teamId], queryFn: async () => (await api<{ data: Repo[] }>(`/integrations/github/repos?teamId=${teamId}`)).data, enabled: connected });
  const [deploying, setDeploying] = useState<string | null>(null);
  const disconnect = async () => {
    try { await api(`/integrations/github?teamId=${teamId}`, { method: "DELETE" }); toast.success("GitHub disconnected"); }
    catch (e) { toast.error((e as ApiError).message ?? "Could not disconnect"); }
    void qc.invalidateQueries({ queryKey: ["github", teamId] });
  };
  const deploy = async (r: Repo) => {
    if (!envId) return;
    setDeploying(r.fullName);
    try {
      await api(`/environments/${envId}/services`, { method: "POST", body: { name: r.fullName.split("/")[1], source: { type: "github", repo: r.fullName, branch: r.defaultBranch } } });
      toast.success(`Service created from ${r.fullName} — first build started`);
      void qc.invalidateQueries({ queryKey: ["github-repos", teamId] });
      void qc.invalidateQueries({ queryKey: ["canvas", envId] });
    } catch (e) { toast.error((e as ApiError).message ?? "Could not deploy repository"); }
    finally { setDeploying(null); }
  };
  return (
    <WorkspaceShell title="GitHub">
      <div className="scroll-area h-full overflow-y-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border bg-card"><Github className="h-5 w-5" /></span>
            <div>
              <h1 className="text-xl font-semibold">GitHub</h1>
              <p className="text-sm text-muted-foreground">{status.isLoading ? "Checking connection…" : connected ? `Installed on ${status.data?.account?.login ?? "your account"}.` : "Not connected."}</p>
            </div>
          </div>
          {connected ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => { void repos.refetch(); toast("Repositories refreshed"); }}><Refresh className="h-3.5 w-3.5" />Refresh</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={disconnect}>Disconnect</Button>
            </div>
          ) : <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { if (status.data?.installUrl) window.location.href = status.data.installUrl; }} disabled={!status.data?.installUrl}><Github className="h-3.5 w-3.5" />Connect GitHub</Button>}
        </div>
        {connected ? (
          <>
            <p className="label-caps px-4 pb-2 pt-5">Repositories</p>
            <ul className="divide-y border-y">
              {(repos.data ?? []).map((r) => {
                const here = !!projectId && !!r.alreadyDeployedIn?.includes(projectId);
                return (
                  <li key={r.fullName} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="flex items-center gap-1.5 font-mono text-sm">{r.private ? <Lock className="h-3 w-3 text-muted-foreground" /> : null}{r.fullName}</span>
                    <span className="rounded-sm border px-1 font-mono text-[10px] text-muted-foreground">{r.defaultBranch}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{here ? "in this project" : r.alreadyDeployedIn?.length ? `used in ${r.alreadyDeployedIn.length} project${r.alreadyDeployedIn.length > 1 ? "s" : ""}` : "not linked"}</span>
                    {!here ? <Button size="sm" variant="outline" className="h-7 text-xs" disabled={deploying === r.fullName} onClick={() => deploy(r)}>{deploying === r.fullName ? "Deploying…" : "Deploy"}</Button> : null}
                  </li>
                );
              })}
              {repos.isLoading ? <li aria-busy className="space-y-2 px-4 py-3">{[0,1,2].map((i) => <div key={i} className="h-8 animate-pulse rounded-md bg-muted/60" />)}</li> : !repos.data?.length ? <li className="px-4 py-6 text-sm text-muted-foreground">No repositories are shared with the Morline app yet.</li> : null}
            </ul>
            <p className="label-caps px-4 pb-2 pt-6">Behaviour</p>
            <div className="divide-y border-y">
              {[["Deploy on push", "Every commit to a tracked branch triggers a build.", true], ["Pull request previews", "Spin up an ephemeral environment for each PR.", true], ["Commit status checks", "Report deploy status back to GitHub.", true], ["Wait for CI", "Only deploy after GitHub Actions pass.", false]].map(([t, h, on]) => (
                <div key={String(t)} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div><p className="text-sm">{t}</p><p className="text-xs text-muted-foreground">{h}</p></div>
                  <Switch defaultChecked={Boolean(on)} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">Connect GitHub to deploy repositories automatically.</div>
        )}
      </div>
    </WorkspaceShell>
  );
}
