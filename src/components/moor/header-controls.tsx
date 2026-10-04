import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Alert, Bell, Check, ChevronsUpDown, UserCircle, Globe, Info, Grid, Logout, Plus, Rocket, FileText, Search, Settings, Users, Network } from "fluid-icons/react";
import { Github } from "lucide-react";

import { toast } from "sonner";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd, Logo } from "./primitives";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { selectProject, timeAgo, useSelection, useServices } from "@/lib/workspace";
import { logos, type LogoKey } from "@/lib/platform-data";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type SearchHit = { type: string; id: string; title: string; subtitle?: string | null; logo?: string | null; projectId?: string | null; environmentId?: string | null };

const pages = [
  { to: "/projects", label: "Projects", icon: Grid },
  { to: "/deployments", label: "Deployments", icon: Rocket },
  { to: "/logs", label: "Logs", icon: FileText },
  { to: "/metrics", label: "Metrics", icon: Activity },
  { to: "/domains", label: "Networking", icon: Globe },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/integrations", label: "GitHub integration", icon: Github },
  { to: "/team", label: "Team", icon: Users },
  { to: "/account", label: "Account", icon: UserCircle },
  { to: "/settings", label: "Project settings", icon: Settings },
] as const;

export function SearchButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { projectId: currentProjectId } = useSelection();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const goCanvas = (pid?: string | null) => {
    const id = pid ?? currentProjectId;
    setOpen(false);
    if (id) navigate({ to: "/project/$projectId", params: { projectId: id } });
    else navigate({ to: "/projects" });
  };
  const go = (to: string) => { setOpen(false); navigate({ to }); };
  const services = useServices().data ?? [];
  const { activeTeamId } = useAuth();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 200); return () => clearTimeout(t); }, [q]);
  const results = useQuery({
    queryKey: ["search", activeTeamId, dq],
    queryFn: () => api<{ data: SearchHit[] }>(`/search?teamId=${activeTeamId}&q=${encodeURIComponent(dq)}`),
    enabled: open && !!activeTeamId && dq.length > 1,
    staleTime: 10000,
  });
  const hits = results.data?.data ?? [];
  const openHit = (h: SearchHit) => {
    setOpen(false);
    if (h.projectId) selectProject(h.projectId, h.environmentId);
    if (h.type === "deployment") navigate({ to: "/deployments/$id", params: { id: h.id } });
    else if (h.type === "domain") navigate({ to: "/domains" });
    else goCanvas(h.projectId);
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className="hidden h-7 items-center gap-2 rounded-lg border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:flex">
        <Search className="h-3.5 w-3.5" />Search<Kbd>⌘K</Kbd>
      </button>
      <button onClick={() => setOpen(true)} aria-label="Search" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent sm:hidden"><Search className="h-4 w-4" /></button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, services, deployments, domains…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{results.isFetching ? "Searching…" : "Nothing found."}</CommandEmpty>
          {hits.length ? (
            <>
              <CommandGroup heading="Results">
                {hits.map((h) => (
                  <CommandItem key={h.type + h.id} value={`${q} ${h.type} ${h.title} ${h.id}`} onSelect={() => openHit(h)}>
                    {h.logo && h.logo in logos ? <Logo k={h.logo as LogoKey} className="mr-2" /> : <Search className="mr-2 h-4 w-4" />}
                    <span className="truncate">{h.title}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{h.subtitle ?? h.type}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}
          <CommandGroup heading="Services in this project">
            {services.map((s) => (
              <CommandItem key={s.id} value={`service ${s.name}`} onSelect={() => goCanvas()}>
                <Logo k={s.logo} className="mr-2" />{s.name}<span className="ml-auto font-mono text-[10px] text-muted-foreground">{s.kind}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            {pages.map((p) => (
              <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => go(p.to)}><p.icon className="mr-2 h-4 w-4" />{p.label}</CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go("/deployments")}><Rocket className="mr-2 h-4 w-4" />View deployments</CommandItem>
            <CommandItem onSelect={() => go("/team")}><Users className="mr-2 h-4 w-4" />Invite a teammate</CommandItem>
            <CommandItem onSelect={() => go("/domains")}><Globe className="mr-2 h-4 w-4" />Add custom domain</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

const toneIcon = { error: Alert, warn: Alert, info: Info } as const;
const toneText = { error: "text-destructive", warn: "text-score-mid", info: "text-primary" } as const;

type ApiNotification = { id: string; type: string; title: string; body: string; targetUrl: string | null; read: boolean; createdAt: string };
const toneFor = (t: string): "error" | "warn" | "info" => (t.includes("failed") || t.includes("crashed") ? "error" : t === "spend_limit" ? "warn" : "info");
const linkFor = (t: string): "/logs" | "/deployments" | "/settings" | "/team" | "/domains" => (t.startsWith("deploy") ? "/deployments" : t === "service_crashed" ? "/logs" : t.startsWith("domain") ? "/domains" : t === "invite" ? "/team" : "/settings");

export function NotificationsButton() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ data: ApiNotification[]; unreadCount: number }>("/notifications?limit=30"), refetchInterval: 30000 });
  const items = (q.data?.data ?? []).map((n) => ({ id: n.id, tone: toneFor(n.type), title: n.title, body: n.body, when: timeAgo(n.createdAt), unread: !n.read, to: linkFor(n.type) }));
  const markRead = async (body: { ids?: string[]; all?: boolean }) => {
    qc.setQueryData(["notifications"], (d: typeof q.data) => d && { ...d, unreadCount: body.all ? 0 : Math.max(0, d.unreadCount - 1), data: d.data.map((n) => (body.all || body.ids?.includes(n.id) ? { ...n, read: true } : n)) });
    try { await api("/notifications/read", { method: "POST", body }); } catch { void qc.invalidateQueries({ queryKey: ["notifications"] }); }
  };
  const [tab, setTab] = useState<"all" | "unread">("all");
  const unread = items.filter((n) => n.unread).length;
  const list = tab === "all" ? items : items.filter((n) => n.unread);
  return (
    <Popover>
      <PopoverTrigger aria-label="Notifications" className="relative rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
        <Bell className="h-4 w-4" />
        {unread ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" /> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-1rem))] p-0">
        <div className="flex items-center gap-1 border-b px-3 py-2">
          <p className="mr-auto text-sm font-semibold">Inbox</p>
          {(["all", "unread"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded px-2 py-1 text-xs capitalize text-muted-foreground", tab === t && "bg-accent text-foreground")}>{t}{t === "unread" && unread ? ` ${unread}` : ""}</button>
          ))}
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {list.map((n) => {
            const Icon = toneIcon[n.tone];
            return (
              <li key={n.id}>
                <Link to={n.to} onClick={() => { if (n.unread) void markRead({ ids: [n.id] }); }} className="flex gap-2.5 px-3 py-2.5 hover:bg-accent/50">
                  <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", toneText[n.tone])} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.body}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{n.when}</span>
                  {n.unread ? <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                </Link>
              </li>
            );
          })}
          {!list.length ? <li className="px-3 py-8 text-center text-xs text-muted-foreground">You're all caught up.</li> : null}
        </ul>
        <div className="border-t p-1.5">
          <button onClick={() => void markRead({ all: true })} className="flex w-full items-center justify-center gap-1.5 rounded py-1.5 text-xs text-muted-foreground hover:bg-accent"><Check className="h-3 w-3" />Mark all as read</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ProfileMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="ml-1 grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-primary font-mono text-[10px] font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm">{user?.name ?? "Account"}</p>
          <p className="font-mono text-[10px] font-normal text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/account" })}><UserCircle className="mr-2 h-3.5 w-3.5" />Account</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/team" })}><Users className="mr-2 h-3.5 w-3.5" />Team</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/integrations" })}><Github className="mr-2 h-3.5 w-3.5" />GitHub</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/activity" })}><Activity className="mr-2 h-3.5 w-3.5" />Activity</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { void signOut().then(() => navigate({ to: "/login" })); }}><Logout className="mr-2 h-3.5 w-3.5" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceSwitcher() {
  const { user, activeTeamId, setActiveTeamId } = useAuth();
  const navigate = useNavigate();
  const teams = user?.teams ?? [];
  const ws = teams.find((w) => w.id === activeTeamId) ?? teams[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm hover:bg-accent focus-visible:outline-none">
        {ws?.name ?? "Personal workspace"}<ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="label-caps">Workspaces</DropdownMenuLabel>
        {teams.map((w) => (
          <DropdownMenuItem key={w.id} onClick={() => setActiveTeamId(w.id)}>
            {w.name}<span className="ml-auto font-mono text-[10px] text-muted-foreground">{w.plan}</span>
            {w.id === activeTeamId ? <Check className="ml-2 h-3 w-3" /> : null}
          </DropdownMenuItem>
        ))}
        {!teams.length ? <DropdownMenuItem disabled>Personal workspace</DropdownMenuItem> : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}><Plus className="mr-2 h-3.5 w-3.5" />New workspace</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NewEnvironmentDialog({ open, onOpenChange, onCreate, environments = [] }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (name: string, from: string | null) => void; environments?: string[] }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New environment</DialogTitle>
          <DialogDescription>Copies services and variables from an existing environment.</DialogDescription>
        </DialogHeader>
        <label className="block text-xs text-muted-foreground">Name<Input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="qa" className="mt-1 h-8 font-mono text-sm" /></label>
        <div className="text-xs text-muted-foreground">Fork from
          <div className="mt-1 flex gap-1">
            {environments.map((e) => (
              <button key={e} onClick={() => setFrom(e)} className={cn("rounded-md border px-2 py-1 font-mono text-xs", (from ?? environments[0]) === e && "border-primary text-foreground")}>{e}</button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!name} onClick={() => { onCreate(name, from ?? environments[0] ?? null); setName(""); onOpenChange(false); }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
