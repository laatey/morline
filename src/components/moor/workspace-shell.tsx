import { useEnvironmentStream } from "@/lib/env-stream";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  ChevronDown,
  ChevronsUpDown,
  GitBranch,
  History,
  Grid,
  Plus,
  Rocket,
  FileText,
  Settings,
  Network,
  Globe,
} from "fluid-icons/react";

import {
  NewEnvironmentDialog,
  NotificationsButton,
  ProfileMenu,
  SearchButton,
  WorkspaceSwitcher,
} from "./header-controls";
import { useState, useEffect, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import {
  selectEnvironment,
  selectProject,
  useEnvId,
  useEnvironments,
  useProject,
  useSelection,
  useUsage,
} from "@/lib/workspace";
import { RequireAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-5 w-5 text-foreground", className)}
      fill="none"
      aria-hidden
    >
      <path
        d="M5 14.8Q5 11 8.14 8.85L11.36 6.65Q14.5 4.5 14.5 8.3V14.2Q14.5 18 11.36 20.15L8.14 22.35Q5 24.5 5 20.7Z"
        fill="currentColor"
      />
      <path
        d="M17.5 17.8Q17.5 14 20.64 11.85L23.86 9.65Q27 7.5 27 11.3V17.2Q27 21 23.86 23.15L20.64 25.35Q17.5 27.5 17.5 23.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

const nav = [
  { to: "/deployments", label: "Deployments", icon: Rocket },
  { to: "/logs", label: "Logs", icon: FileText },
  { to: "/metrics", label: "Metrics", icon: Activity },
  { to: "/domains", label: "Networking", icon: Globe },
  { to: "/activity", label: "Activity", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function WorkspaceShell({
  children,
  title,
  actions,
  onAssistant,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  onAssistant?: () => void;
}) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const { projectId } = useSelection();
  const pathMatch = path.match(/\/project\/([^/?#]+)/);
  const pathProjectId = pathMatch?.[1] ?? null;
  const effectiveProjectId = pathProjectId || projectId;

  useEffect(() => {
    if (pathProjectId && pathProjectId !== projectId) {
      selectProject(pathProjectId);
    }
  }, [pathProjectId, projectId]);

  const projectQ = useProject();
  const envList = useEnvironments().data ?? [];
  const envId = useEnvId();
  useEnvironmentStream(envId);
  const usage = useUsage().data;
  const project = { name: projectQ.data?.name ?? "…" };
  const envs = envList.map((e) => e.name);
  const env = envList.find((e) => e.id === envId)?.name ?? "production";
  const setEnv = (name: string) => {
    const e = envList.find((x) => x.name === name);
    if (e) selectEnvironment(e.id);
  };
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (!effectiveProjectId && !path.startsWith("/project/")) {
      navigate({ to: "/projects" });
    }
  }, [effectiveProjectId, navigate, path]);
  const createEnv = async (name: string, forkId: string | null) => {
    if (!effectiveProjectId) return;
    try {
      const created = await api<{ id: string; name: string }>(
        `/projects/${effectiveProjectId}/environments`,
        { method: "POST", body: { name, ...(forkId ? { forkFromEnvironmentId: forkId } : {}) } },
      );
      await qc.invalidateQueries({ queryKey: ["environments", effectiveProjectId] });
      selectEnvironment(created.id);
      toast.success(`Environment ${created.name} created`);
    } catch (e) {
      toast.error((e as ApiError).message ?? "Could not create environment");
    }
  };
  const spent = usage?.spentUsd ?? 0;
  const limit = usage?.limitUsd ?? null;

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

  // No project chosen: redirect is in flight — don't flash an empty workspace.
  if (!projectId) return <div className="min-h-screen bg-surface" />;

  return (
    <RequireAuth>
      <TooltipProvider delayDuration={150}>
        <div className="flex h-screen flex-col bg-surface text-foreground">
          <header className="flex h-12 shrink-0 items-center gap-2 px-4">
            {/* Desktop breadcrumb navigation */}
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <Link to="/projects" className="flex items-center gap-2 pr-2">
                <Mark />
                <span className="font-display text-sm font-semibold tracking-tight">morline</span>
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <WorkspaceSwitcher />
              <span className="text-muted-foreground/50">/</span>
              <Link
                to="/projects"
                className="flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1 text-sm hover:bg-accent"
              >
                <Grid className="h-3.5 w-3.5 text-muted-foreground" />
                {project.name}
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{env}</span>
                  <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel className="label-caps">Environments</DropdownMenuLabel>
                  {envs.map((e) => (
                    <DropdownMenuItem
                      key={e}
                      onClick={() => setEnv(e)}
                      className="font-mono text-xs"
                    >
                      <span
                        className={cn(
                          "mr-2 h-1.5 w-1.5 rounded-full",
                          e === env ? "bg-primary" : "bg-muted-foreground/40",
                        )}
                      />
                      {e}
                      {e.startsWith("pr-") ? (
                        <span className="ml-auto text-[10px] text-muted-foreground">ephemeral</span>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs" onClick={() => setCreating(true)}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    New environment…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {title ? (
                <>
                  <span className="text-muted-foreground/50 md:inline">/</span>
                  <span className="text-sm text-muted-foreground md:inline">{title}</span>
                </>
              ) : null}
            </div>

            {/* Mobile branding dropdown collapsing navigation & project items */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 font-display text-sm font-semibold tracking-tight text-foreground hover:text-foreground/80 focus-visible:outline-none [&[data-state=open]>svg]:rotate-180">
                  <span>morline</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5">
                  <div className="px-2 py-1.5">
                    <p className="label-caps">Current project</p>
                    <div className="mt-1 flex items-center justify-between font-mono text-xs">
                      <span className="font-semibold text-foreground">{project.name}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {env}
                      </span>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="label-caps">Navigation</DropdownMenuLabel>
                  {/* Canvas — dynamic URL so the back-button and refresh work */}
                  {(() => {
                    const canvasTo = projectId ? `/project/${projectId}` : "/projects";
                    const active = path.startsWith("/project/");
                    return (
                      <DropdownMenuItem
                        onClick={() => navigate({ to: canvasTo })}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium cursor-pointer",
                          active && "bg-accent text-foreground font-semibold",
                        )}
                      >
                        <Network
                          className={cn(
                            "h-4 w-4",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="flex-1">Canvas</span>
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </DropdownMenuItem>
                    );
                  })()}
                  {nav.map((n) => {
                    const active = path.startsWith(n.to);
                    return (
                      <DropdownMenuItem
                        key={n.to}
                        onClick={() => navigate({ to: n.to })}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium cursor-pointer",
                          active && "bg-accent text-foreground font-semibold",
                        )}
                      >
                        <n.icon
                          className={cn(
                            "h-4 w-4",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="flex-1">{n.label}</span>
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </DropdownMenuItem>
                    );
                  })}

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="label-caps">Environments</DropdownMenuLabel>
                  {envs.map((e) => (
                    <DropdownMenuItem
                      key={e}
                      onClick={() => setEnv(e)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-xs cursor-pointer",
                        e === env && "bg-accent/60 text-foreground",
                      )}
                    >
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1">{e}</span>
                      {e === env && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="text-xs text-muted-foreground cursor-pointer"
                    onClick={() => setCreating(true)}
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    New environment…
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/projects" })}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-xs cursor-pointer"
                  >
                    <Grid className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>All projects</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-muted-foreground/40">/</span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {title || project.name}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <SearchButton />
              {actions}
              {onAssistant ? (
                <button
                  onClick={onAssistant}
                  aria-label="Agent assistant"
                  className="flex h-7 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Agent</span>
                </button>
              ) : null}
              <div className="hidden items-center gap-2 rounded-md border px-2 py-1 font-mono text-[11px] text-muted-foreground md:flex">
                <span>usage</span>
                <span className="relative h-1 w-16 overflow-hidden rounded-full bg-muted">
                  <span
                    className="absolute inset-y-0 left-0 bg-primary"
                    style={{
                      width: `${limit ? Math.min(100, (spent / limit) * 100) : Math.min(100, spent)}%`,
                    }}
                  />
                </span>
                <span className="text-foreground">${spent.toFixed(2)}</span>
                {limit ? <span>/ ${limit}</span> : <span>this month</span>}
              </div>
              <NotificationsButton />
              <ProfileMenu />
            </div>
          </header>
          <div className="flex min-h-0 flex-1 gap-1 pr-0 sm:gap-2 sm:pr-2">
            <nav className="hidden w-10 shrink-0 flex-col items-center gap-1.5 overflow-y-auto pt-2 sm:flex sm:w-12 sm:gap-2 sm:pt-3">
              {/* Canvas — dynamic URL */}
              {(() => {
                const canvasTo = projectId ? `/project/${projectId}` : "/projects";
                const active = path.startsWith("/project/");
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={canvasTo}
                        aria-label="Canvas"
                        className={cn(
                          "relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          active && "bg-accent text-foreground",
                        )}
                      >
                        {active ? (
                          <span className="absolute -left-2.5 h-4 w-0.5 rounded-r bg-primary" />
                        ) : null}
                        <Network className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Canvas</TooltipContent>
                  </Tooltip>
                );
              })()}
              {nav.map((n) => {
                const active = path.startsWith(n.to);
                return (
                  <Tooltip key={n.to}>
                    <TooltipTrigger asChild>
                      <Link
                        to={n.to}
                        aria-label={n.label}
                        className={cn(
                          "relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          active && "bg-accent text-foreground",
                        )}
                      >
                        {active ? (
                          <span className="absolute -left-2.5 h-4 w-0.5 rounded-r bg-primary" />
                        ) : null}
                        <n.icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{n.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
            <main
              className={cn(
                "relative min-w-0 flex-1 overflow-hidden rounded-t-2xl border border-b-0 bg-background shadow-[0_-10px_40px_-30px_oklch(0.19_0.012_264/0.5)]",
                title !== "Canvas" &&
                  "[&>div:first-child]:mx-auto [&>div:first-child]:w-full [&>div:first-child]:max-w-[1040px] [&>div:first-child]:border-x",
              )}
            >
              {children}
            </main>
          </div>
        </div>
        <NewEnvironmentDialog
          open={creating}
          onOpenChange={setCreating}
          environments={envs}
          onCreate={(n, from) => {
            void createEnv(n, envList.find((e) => e.name === from)?.id ?? envId);
          }}
        />
      </TooltipProvider>
    </RequireAuth>
  );
}
