import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ChevronDown, Globe, Layers3, MoreHorizontal, Plus, Rocket, ScrollText, Search, Settings, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificationsButton, ProfileMenu, SearchButton, WorkspaceSwitcher } from "@/components/moor/header-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mark } from "@/components/moor/workspace-shell";
import { NewProjectDialog, type NewProjectInput } from "@/components/moor/new-project";
import { Logo, StatusDot } from "@/components/moor/primitives";
import { type LogoKey, type Status } from "@/lib/platform-data";
import { api, type ApiError } from "@/lib/api";
import { useAuth, RequireAuth } from "@/lib/auth";
import usFlag from "@/assets/flags/us.svg";
import euFlag from "@/assets/flags/eu.svg";
import { cn } from "@/lib/utils";
import { useSelection } from "@/lib/workspace";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { name: "theme-color", content: "#171717" },
      { title: "Projects — Morline" },
      { name: "description", content: "Morline deploys your apps, databases and workers, and maps how they connect." },
      { property: "og:title", content: "Morline — deploy and see your whole stack" },
      { property: "og:description", content: "Morline deploys your apps, databases and workers, and maps how they connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/projects" }],
  }),
  component: ProjectsPage,
});

type ApiProject = {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  favorite: boolean;
  settings?: { defaultRegion?: string | null };
  environmentName?: string | null;
  health?: string;
  region?: { id: string; name: string; countryCode: string; available: boolean } | null;
  serviceCount?: number;
  onlineServiceCount?: number;
  latencyMs?: number | null;
  lastDeployAt?: string | null;
};

type Project = {
  id: string;
  name: string;
  status: Status;
  note: string;
  environmentName: string;
  region: string;
  countryCode: string;
  serviceCount: number;
  onlineCount: number;
  latency: number | null;
};

function statusFor(p: ApiProject): Status {
  if (!p.serviceCount) return "sleeping";
  if (p.health === "unhealthy" || p.health === "crashed") return "crashed";
  return "online";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function mapProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.name,
    status: statusFor(p),
    note: p.serviceCount ? (p.lastDeployAt ? `deployed ${timeAgo(p.lastDeployAt)}` : "no deployments yet") : "no services yet",
    environmentName: p.environmentName ?? "production",
    region: p.region?.id ?? "us-east",
    countryCode: p.region?.countryCode ?? "US",
    serviceCount: p.serviceCount ?? 0,
    onlineCount: p.onlineServiceCount ?? 0,
    latency: p.latencyMs ?? null,
  };
}

const filters = [
  { key: "all", label: "All", test: () => true },
  { key: "healthy", label: "Healthy", test: (s: Status) => s === "online" || s === "deploying" },
  { key: "asleep", label: "Asleep", test: (s: Status) => s === "sleeping" },
  { key: "issues", label: "Issues", test: (s: Status) => s === "crashed" },
] as const;

function ProjectsPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = "var(--color-surface)";
    document.body.style.backgroundColor = "var(--color-surface)";
    let meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "#171717");
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
      if (prev) {
        meta?.setAttribute("content", prev);
      }
    };
  }, []);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, teams, activeTeamId, setActiveTeamId } = useAuth();
  const { projectId: lastProjectId } = useSelection();
  const teamId = activeTeamId ?? teams[0]?.id ?? null;

  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  // Local overlay so rename/remove still feel instant while those API
  // endpoints are not live yet; null falls through to server data.
  const [localProjects, setLocalProjects] = useState<Project[] | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["projects", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const res = await api<{ data: ApiProject[] }>(`/teams/${teamId}/projects`);
      return res.data;
    },
    enabled: !!teamId,
  });

  const serverProjects = (projectsQuery.data ?? []).map(mapProject);
  const projects = localProjects ?? serverProjects;

  const createProject = useMutation({
    mutationFn: async (input: NewProjectInput) => {
      if (!teamId) throw new Error("No workspace selected");
      const res = await api<ApiProject | { project: ApiProject; services?: unknown[] }>(`/teams/${teamId}/projects`, { method: "POST", body: input });
      const project = "project" in res && res.project ? res.project : (res as ApiProject);
      const alreadySeeded = "services" in res && Array.isArray(res.services) && res.services.length > 0;
      if (input.source === "github" && input.github && !alreadySeeded) {
        // Seed the repo as the first service in the project's default environment.
        let envId = (project as ApiProject & { defaultEnvironmentId?: string | null }).defaultEnvironmentId ?? null;
        if (!envId) envId = (await api<{ data: { id: string }[] }>(`/projects/${project.id}/environments`)).data[0]?.id ?? null;
        if (envId) {
          const repo = input.github.repo;
          try {
            await api(`/environments/${envId}/services`, { method: "POST", body: { name: repo.split("/")[1] ?? repo, source: { type: "github", repo, branch: input.github.branch, ...(input.github.url ? { url: input.github.url } : {}) }, position: { x: 80, y: 80 } } });
            return { ...project, serviceCount: Math.max(1, project.serviceCount ?? 0) };
          } catch (e) {
            toast.error(`Project created, but ${repo} could not be added: ${(e as ApiError)?.message ?? "unknown error"}`);
          }
        }
      }
      return project;
    },
    onSuccess: (created, input) => {
      setLocalProjects((list) => [...(list ?? (projectsQuery.data ?? []).map(mapProject)), mapProject(created)]);
      toast.success(input.source === "github" ? `${created.name} created — first build started` : `Project ${created.name} created`);
      if (input.source === "github") navigate({ to: `/project/${created.id}` });
    },
    onError: (error) => {
      const message = (error as ApiError)?.message ?? "Could not create the project";
      toast.error(message);
    },
  });

  const refresh = () => { setLocalProjects(null); return queryClient.invalidateQueries({ queryKey: ["projects", teamId] }); };
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const remove = (id: string, name: string) => setDeleting({ id, name });
  const confirmDelete = async () => {
    if (!deleting) return;
    const { id, name } = deleting;
    setDeleting(null);
    setLocalProjects((l) => (l ?? projects).filter((p) => p.id !== id));
    try { await api(`/projects/${id}`, { method: "DELETE" }); toast.success(`${name} deleted`); }
    catch (e) { toast.error((e as ApiError)?.message ?? "Could not delete project"); }
    await refresh();
  };
  const rename = (id: string) => {
    setRenaming(id);
    setDraftName(projects.find((p) => p.id === id)?.name ?? "");
  };
  const saveName = () => {
    const next = draftName.trim();
    if (!renaming || !next || (next !== projects.find((p) => p.id === renaming)?.name && projects.some((p) => p.name === next))) return;
    const id = renaming;
    setLocalProjects((l) => (l ?? projects).map((p) => (p.id === id ? { ...p, name: next } : p)));
    setRenaming(null);
    api(`/projects/${id}`, { method: "PATCH", body: { name: next } })
      .then(() => toast.success("Project renamed"))
      .catch((e: ApiError) => toast.error(e?.message ?? "Could not rename project"))
      .finally(() => void refresh());
  };

  const visible = projects.filter(
    (p) => filters.find((f) => f.key === filter)!.test(p.status) && p.name.includes(query.trim().toLowerCase()),
  );
  const totalServices = projects.reduce((n, p) => n + p.serviceCount, 0);
  const totalOnline = projects.reduce((n, p) => n + p.onlineCount, 0);
  const regions = new Set(projects.map((p) => p.region));
  const stats = [
    { label: "Projects", value: String(projects.length) },
    { label: "Services", value: String(totalServices) },
    { label: "Online", value: String(totalOnline) },
    { label: "Regions", value: String(regions.size) },
  ];

  return (
    <RequireAuth>
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-12 shrink-0 items-center gap-2 px-4 sm:px-6">
        {/* Desktop breadcrumb */}
        <div className="hidden sm:flex sm:items-center sm:gap-2">
          <Link to="/projects" className="flex items-center gap-2 pr-2">
            <Mark />
            <span className="font-display text-sm font-semibold tracking-tight">morline</span>
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <WorkspaceSwitcher />
        </div>

        {/* Mobile branding dropdown */}
        <div className="flex items-center gap-1.5 sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 font-display text-sm font-semibold tracking-tight text-foreground hover:text-foreground/80 focus-visible:outline-none [&[data-state=open]>svg]:rotate-180">
              <span>morline</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-1.5">
              <DropdownMenuLabel className="label-caps">Workspaces</DropdownMenuLabel>
              {teams.map((w) => (
                <DropdownMenuItem key={w.id} onClick={() => setActiveTeamId(w.id)} className="flex items-center justify-between text-xs cursor-pointer">
                  <span>{w.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{w.plan}</span>
                </DropdownMenuItem>
              ))}
              {!teams.length ? <DropdownMenuItem disabled>Personal workspace</DropdownMenuItem> : null}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="label-caps">Navigation</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate({ to: lastProjectId ? `/project/${lastProjectId}` : "/projects" })} className="flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium cursor-pointer">
                <Waypoints className="h-4 w-4 text-muted-foreground" />
                <span>Canvas</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/deployments" })} className="flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium cursor-pointer">
                <Rocket className="h-4 w-4 text-muted-foreground" />
                <span>Deployments</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/logs" })} className="flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium cursor-pointer">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                <span>Logs</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/metrics" })} className="flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium cursor-pointer">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>Metrics</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium cursor-pointer">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className="ml-auto flex items-center gap-2">
          <SearchButton />
          <NotificationsButton />
          <ProfileMenu />
        </span>
      </header>

      <div className="relative mx-0 flex flex-1 flex-col sm:mx-4">
        <section className="relative flex min-h-[calc(100vh-3rem)] flex-1 flex-col overflow-hidden rounded-t-2xl border border-b-0 bg-background shadow-[0_24px_60px_-40px_oklch(0.19_0.012_264/0.35)]">
          <div className="grid-paper-sm pointer-events-none absolute inset-x-0 top-0 h-40 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

          <div className="relative flex flex-wrap items-end justify-between gap-6 border-b px-5 pb-6 pt-7 sm:px-8">
            <div>
              <p className="label-caps">Workspace · {user?.teams?.find((t) => t.id === teamId)?.name ?? "Personal"}</p>
              <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight">Projects</h1>
            </div>
            <div className="flex items-center gap-7">
              {stats.map((s) => (
                <div key={s.label} className="hidden sm:block">
                  <p className="label-caps">{s.label}</p>
                  <p className="mt-1 font-mono text-base">{s.value}</p>
                </div>
              ))}
              <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />New project</Button>
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-2 border-b px-5 py-3 sm:px-8">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter projects…"
                className="h-8 w-52 pl-8 font-mono text-xs"
              />
            </label>
            <div className="flex items-center gap-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    filter === f.key && "bg-accent text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="ml-auto hidden font-mono text-[11px] text-muted-foreground md:block">
              {visible.length} of {projects.length}
            </p>
          </div>

          <div className="relative grid flex-1 content-start gap-3 p-4 sm:grid-cols-2 sm:p-5 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {projectsQuery.isLoading
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="min-h-[224px] animate-pulse rounded-xl border bg-card/50" />
                ))
              : visible.map((p) => (
                  <ProjectCard key={p.id} p={p} onRemove={() => remove(p.id, p.name)} onRename={() => rename(p.id)} />
                ))}
            {!projectsQuery.isLoading && projects.length === 0 ? (
              <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full border bg-card"><Layers3 className="h-5 w-5 text-muted-foreground" /></span>
                <p className="font-display text-lg font-semibold">No projects yet</p>
                <p className="max-w-sm font-mono text-xs text-muted-foreground">create your first project to start mapping services on the canvas</p>
                <Button size="sm" variant="outline" className="mt-1" onClick={() => setAdding(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New project</Button>
              </div>
            ) : null}
            {!projectsQuery.isLoading && visible.length === 0 && projects.length > 0 ? (
              <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
                <p className="font-display text-lg font-semibold">No projects match</p>
                <p className="font-mono text-xs text-muted-foreground">try a different filter or search term</p>
              </div>
            ) : null}
            {projects.length > 0 ? <NewProjectCard onClick={() => setAdding(true)} /> : null}
          </div>
        </section>
      </div>
      <NewProjectDialog open={adding} onOpenChange={setAdding} onCreate={async (name) => { await createProject.mutateAsync(name); }} />
      <Dialog open={renaming !== null} onOpenChange={(open) => { if (!open) setRenaming(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>Choose a name for this project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); saveName(); }} className="space-y-4">
            <label className="block text-xs text-muted-foreground">Project name
              <Input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} className="mt-1 font-mono text-sm" />
            </label>
            {draftName.trim() && draftName.trim() !== projects.find((p) => p.id === renaming)?.name && projects.some((p) => p.name === draftName.trim()) ? <p className="text-xs text-destructive">A project with this name already exists.</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
              <Button type="submit" disabled={!draftName.trim() || (draftName.trim() !== projects.find((p) => p.id === renaming)?.name && projects.some((p) => p.name === draftName.trim()))}>Save name</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Every environment, service, deployment and variable in this project will be removed. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete project</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </RequireAuth>
  );
}

function ProjectCard({ p, onRemove, onRename }: { p: Project; onRemove: () => void; onRename: () => void }) {
  return (
    <Link
      to="/project/$projectId"
      params={{ projectId: p.id }}
      className="group relative flex min-h-[224px] flex-col overflow-hidden rounded-xl border bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_16px_36px_-20px_oklch(0.19_0.012_264/0.4)]"
    >
      <div className="flex items-center justify-between gap-2.5">
        <h3 className="truncate font-display text-sm font-semibold">{p.name}</h3>
        <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={`${p.name} actions`} onClick={(e) => e.preventDefault()} className="rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100 focus-visible:opacity-100"><MoreHorizontal className="h-3.5 w-3.5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onRemove}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <img src={p.countryCode === "US" ? usFlag : euFlag} alt="" className="h-2.5 w-4 rounded-[2px] object-cover ring-1 ring-border" />
          {p.region}
        </span>
      </div>
      <div className="auth-grid relative mt-2.5 grid min-h-[105px] flex-1 place-items-center overflow-hidden rounded-lg border bg-surface/35">
        <span className="relative grid h-9 w-9 place-items-center rounded-lg border bg-card shadow-sm transition-transform group-hover:scale-105">
          <Layers3 className="h-4 w-4 text-muted-foreground" />
          {p.status === "crashed" ? <span className="absolute mb-[-28px] ml-[28px] h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-card" /> : null}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <StatusDot status={p.status} />
        <span className="truncate">{p.status === "crashed" ? "issue" : p.environmentName}</span>
        <span>·</span>
        <span className="truncate">{p.onlineCount}/{p.serviceCount} online</span>
        {p.latency !== null ? <span className="ml-auto font-mono text-[10px]">{p.latency} ms</span> : <span className="ml-auto font-mono text-[10px]">{p.note}</span>}
      </div>
    </Link>
  );
}

function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex min-h-[224px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border transition-colors group-hover:border-primary/60 group-hover:bg-accent">
        <Plus className="h-4 w-4" />
      </span>
      <span className="font-display text-sm font-semibold">New project</span>
      <span className="font-mono text-[11px]">from repo, image or template</span>
    </button>
  );
}
