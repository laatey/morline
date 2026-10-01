import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Github, Lock, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type GhRepo = { fullName: string; private: boolean; defaultBranch: string; url?: string };

/** Parses github.com/owner/repo(.git)(/tree/branch) into a repo. */
export function parseGitHubUrl(input: string): GhRepo | null {
  const m = input.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^?#]+))?\/?(?:[?#].*)?$/i);
  if (!m) return null;
  const fullName = `${m[1]}/${m[2]}`;
  return { fullName, private: false, defaultBranch: m[3] ?? "main", url: `https://github.com/${fullName}` };
}

function RepoUrlField({ onPick }: { onPick: (repo: GhRepo) => void }) {
  const [url, setUrl] = useState("");
  const parsed = parseGitHubUrl(url);
  const invalid = url.trim().length > 0 && !parsed;
  return (
    <form
      className="border-b px-3 py-2.5"
      onSubmit={(e) => { e.preventDefault(); if (parsed) onPick(parsed); }}
    >
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Public repository URL</p>
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="h-8 font-mono text-base md:text-xs" aria-invalid={invalid} />
        <Button type="submit" size="sm" className="h-8 px-3 text-xs" disabled={!parsed}>Deploy</Button>
      </div>
      <p className={invalid ? "mt-1 text-[11px] text-destructive" : "mt-1 text-[11px] text-muted-foreground"}>
        {invalid ? "Use a github.com/owner/repo link." : parsed ? `${parsed.fullName} · ${parsed.defaultBranch}` : "Any account. Add /tree/branch to pick a branch."}
      </p>
    </form>
  );
}
type GhStatus = { connected: boolean; account: unknown; installUrl: string };

/** Shared GitHub step: leads the user through connecting, then lets them pick a repository. */
export function GitHubRepoPicker({ onPick }: { onPick: (repo: GhRepo) => void }) {
  const qc = useQueryClient();
  const { teams, activeTeamId } = useAuth();
  const teamId = activeTeamId ?? teams[0]?.id ?? null;
  const [q, setQ] = useState("");
  const [waiting, setWaiting] = useState(false);

  const status = useQuery({
    queryKey: ["github", teamId],
    queryFn: () => api<GhStatus>(`/integrations/github?teamId=${teamId}`),
    enabled: !!teamId,
    refetchInterval: waiting ? 2500 : false,
  });
  const connected = !!status.data?.connected;
  const repos = useQuery({
    queryKey: ["github-repos", teamId],
    queryFn: async () => (await api<{ data: GhRepo[] }>(`/integrations/github/repos?teamId=${teamId}&limit=100`)).data,
    enabled: connected,
  });

  useEffect(() => {
    if (connected) setWaiting(false);
  }, [connected]);

  useEffect(() => {
    if (!waiting) return;
    const onFocus = () => void qc.invalidateQueries({ queryKey: ["github", teamId] });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [waiting, qc, teamId]);

  if (status.isLoading) {
    return <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-md bg-muted/60" />)}</div>;
  }

  if (!connected) {
    return (
      <div>
      <RepoUrlField onPick={onPick} />
      <div className="p-5 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl border bg-surface"><Github className="h-5 w-5" /></span>
        <p className="mt-3 text-sm font-semibold">Connect GitHub first</p>
        <p className="mx-auto mt-1 max-w-[280px] text-xs text-muted-foreground">
          Install the Morline app on your GitHub account and choose which repositories it can see. You'll come right back here.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!status.data?.installUrl}
            onClick={() => {
              if (!status.data?.installUrl) return;
              window.open(status.data.installUrl, "morline-github", "width=900,height=760");
              setWaiting(true);
            }}
          >
            <Github className="h-3.5 w-3.5" />Connect GitHub<ArrowUpRight className="h-3 w-3 opacity-60" />
          </Button>
        </div>
        {waiting ? <p className="mt-3 text-[11px] text-muted-foreground">Waiting for GitHub… finish in the other window.</p> : null}
      </div>
      </div>
    );
  }

  const list = (repos.data ?? []).filter((r) => r.fullName.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <RepoUrlField onPick={onPick} />
      <div className="flex items-center gap-2 border-b bg-surface/30 px-3 py-2">
        <label className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search repositories…" className="h-8 border-0 bg-surface/80 pl-8 text-base shadow-none md:text-xs" />
        </label>
        <button type="button" aria-label="Refresh repositories" onClick={() => void repos.refetch()} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
          <RefreshCw className={repos.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        </button>
      </div>
      <div className="max-h-[45vh] divide-y divide-border/50 overflow-y-auto">
        {repos.isLoading ? (
          <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-md bg-muted/60" />)}</div>
        ) : list.length ? (
          list.map((r) => (
            <button key={r.fullName} type="button" onClick={() => onPick(r)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-accent/70">
              {r.private ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Github className="h-3 w-3 text-muted-foreground" />}
              <span className="truncate font-mono">{r.fullName}</span>
              <span className="ml-auto rounded-sm border px-1 font-mono text-[10px] text-muted-foreground">{r.defaultBranch}</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            {q ? "No repository matches." : "No repositories are shared with Morline yet."}
            {status.data?.installUrl ? (
              <button type="button" className="mt-2 block w-full text-primary hover:underline" onClick={() => { window.open(status.data!.installUrl, "morline-github", "width=900,height=760"); setWaiting(true); }}>
                Choose repositories on GitHub
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
