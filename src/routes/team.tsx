import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { More, UserPlus } from "fluid-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/workspace";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team — Morline" },
      { name: "description", content: "Invite teammates, manage roles and review pending invitations." },
      { property: "og:title", content: "Team — Morline" },
      { property: "og:description", content: "Invite teammates, manage roles and review pending invitations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const roles = ["owner", "admin", "member", "viewer"] as const;
const roleHint: Record<string, string> = { owner: "Billing and everything else", admin: "Manage projects and members", member: "Deploy and edit variables", viewer: "Read-only access" };
type ApiMember = { user: { id: string; name: string; username?: string | null; email?: string }; role: string; joinedAt: string };
type ApiInvite = { id: string; email: string; role: string; createdAt: string };

function TeamPage() {
  const qc = useQueryClient();
  const { user, teams, activeTeamId } = useAuth();
  const teamId = activeTeamId ?? teams[0]?.id ?? null;
  const team = teams.find((t) => t.id === teamId);
  const key = ["members", teamId];
  const q = useQuery({ queryKey: key, queryFn: () => api<{ data: ApiMember[]; invites?: ApiInvite[] }>(`/teams/${teamId}/members`), enabled: !!teamId });
  const members = (q.data?.data ?? []).map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email ?? (m.user.username ? `@${m.user.username}` : ""), role: m.role, last: timeAgo(m.joinedAt) }));
  const invites = (q.data?.invites ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role, sent: timeAgo(i.createdAt) }));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("member");
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); } catch (e) { toast.error((e as ApiError).message ?? "Something went wrong"); } await qc.invalidateQueries({ queryKey: key }); };
  const invite = () => {
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    const to = email; setEmail("");
    void run(() => api(`/teams/${teamId}/invites`, { method: "POST", body: { email: to, role } }), `Invite sent to ${to}`);
  };
  return (
    <WorkspaceShell title="Team">
      <div className="scroll-area h-full overflow-y-auto">
        <div className="border-b px-4 py-5">
          <h1 className="text-xl font-semibold">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">{members.length} {members.length === 1 ? "member" : "members"} in {team?.name ?? "this workspace"} · {team?.plan ?? "hobby"} plan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} placeholder="teammate@company.com" className="h-8 w-64 text-sm" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 text-xs capitalize">{role}</Button></DropdownMenuTrigger>
            <DropdownMenuContent>{roles.slice(1).map((r) => <DropdownMenuItem key={r} onClick={() => setRole(r)}><span className="capitalize">{r}</span><span className="ml-3 text-[10px] text-muted-foreground">{roleHint[r]}</span></DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={invite}><UserPlus className="h-3.5 w-3.5" />Invite</Button>
        </div>
        <p className="label-caps px-4 pb-2 pt-5">Members</p>
        <ul className="divide-y border-y">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent font-mono text-[10px]">{m.name.split(" ").map((x) => x[0]).join("")}</span>
              <div className="min-w-0 flex-1"><p className="text-sm">{m.name}</p><p className="truncate font-mono text-[11px] text-muted-foreground">{m.email}</p></div>
              <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">joined {m.last}</span>
              <span className="w-20 text-right text-xs capitalize">{m.role}{m.id === user?.id ? " · you" : ""}</span>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={`Manage ${m.name}`} disabled={m.role === "owner"} className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"><More className="h-4 w-4" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="label-caps">Change role</DropdownMenuLabel>
                  {roles.slice(1).map((r) => <DropdownMenuItem key={r} className="capitalize" onClick={() => run(() => api(`/teams/${teamId}/members/${m.id}`, { method: "PATCH", body: { role: r } }), `${m.name} is now ${r}`)}>{r}</DropdownMenuItem>)}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => run(() => api(`/teams/${teamId}/members/${m.id}`, { method: "DELETE" }), `${m.name} removed`)}>Remove from team</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
        <p className="label-caps px-4 pb-2 pt-6">Pending invites</p>
        <ul className="divide-y border-y">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-mono text-xs">{i.email}</span>
              <span className="text-xs capitalize text-muted-foreground">{i.role} · sent {i.sent}</span>
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => run(async () => { await api(`/teams/${teamId}/invites/${i.id}`, { method: "DELETE" }); await api(`/teams/${teamId}/invites`, { method: "POST", body: { email: i.email, role: i.role } }); }, "Invite resent")}>Resend</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => run(() => api(`/teams/${teamId}/invites/${i.id}`, { method: "DELETE" }), "Invite revoked")}>Revoke</Button>
            </li>
          ))}
          {!invites.length ? <li className="px-4 py-4 text-xs text-muted-foreground">No pending invites.</li> : null}
        </ul>
      </div>
    </WorkspaceShell>
  );
}
