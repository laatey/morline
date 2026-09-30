import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { SettingsSection } from "@/components/moor/settings-section";
import { api, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/workspace";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — Morline" },
      { name: "description", content: "Your profile, password, signed-in devices and notification preferences." },
      { property: "og:title", content: "Account — Morline" },
      { property: "og:description", content: "Your profile, password, signed-in devices and notification preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

type Session = { id: string; current: boolean; userAgent: string | null; ip: string | null; createdAt: string; lastActiveAt: string };
type Settings = { theme: string; timezone: string; emailNotifications: boolean; canvasSnapToGrid: boolean };
const err = (e: unknown, f: string) => (e as ApiError)?.message ?? f;

function deviceName(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Firefox/.test(ua) ? "Firefox" : /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : ua.split(" ")[0];
  const os = /Mac/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

function AccountPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, refresh, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [pw, setPw] = useState<{ open: boolean; current: string; next: string }>({ open: false, current: "", next: "" });
  const [del, setDel] = useState<{ open: boolean; confirm: string }>({ open: false, confirm: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: async () => (await api<{ data: Session[] }>("/auth/sessions")).data });
  const settings = useQuery({ queryKey: ["me-settings"], queryFn: () => api<Settings>("/me/settings") });
  const initials = (user?.name ?? "?").split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  const saveProfile = async () => {
    try { await api("/me", { method: "PATCH", body: { name: name.trim() } }); await refresh(); toast.success("Profile saved"); }
    catch (e) { toast.error(err(e, "Could not save profile")); }
  };
  const uploadAvatar = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Images must be under 2 MB"); return; }
    const fd = new FormData(); fd.append("file", file);
    try { await api("/me/avatar", { method: "POST", formData: fd }); await refresh(); toast.success("Avatar updated"); }
    catch (e) { toast.error(err(e, "Could not upload avatar")); }
  };
  const changePassword = async () => {
    try { await api("/me/password", { method: "PUT", body: { currentPassword: pw.current, newPassword: pw.next } }); setPw({ open: false, current: "", next: "" }); toast.success("Password changed"); }
    catch (e) { toast.error(err(e, "Could not change password")); }
  };
  const revoke = async (id: string) => {
    try { await api(`/auth/sessions/${id}`, { method: "DELETE" }); toast.success("Device signed out"); void qc.invalidateQueries({ queryKey: ["sessions"] }); }
    catch (e) { toast.error(err(e, "Could not sign out that device")); }
  };
  const setPref = async (patch: Partial<Settings>) => {
    qc.setQueryData(["me-settings"], (d: Settings | undefined) => d && { ...d, ...patch });
    try { await api("/me/settings", { method: "PATCH", body: patch }); }
    catch (e) { toast.error(err(e, "Could not save preference")); void qc.invalidateQueries({ queryKey: ["me-settings"] }); }
  };
  const deleteAccount = async () => {
    try { await api("/me", { method: "DELETE", body: { confirm: del.confirm } }); await signOut(); navigate({ to: "/" }); }
    catch (e) { toast.error(err(e, "Could not delete account")); }
  };

  return (
    <WorkspaceShell title="Account">
      <div className="scroll-area h-full overflow-y-auto">
        <div className="border-b px-4 py-5">
          <h1 className="text-xl font-semibold">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Personal settings that follow you across workspaces.</p>
        </div>
        <SettingsSection title="Profile">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-primary font-mono text-sm font-semibold text-primary-foreground">{initials}</span>}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); e.target.value = ""; }} />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileRef.current?.click()}>Change avatar</Button>
          </div>
          <label className="block text-xs text-muted-foreground">Name<Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-8" /></label>
          <label className="block text-xs text-muted-foreground">Email<Input value={user?.email ?? ""} readOnly className="mt-1 h-8 text-muted-foreground" /></label>
          <Button size="sm" className="h-7 text-xs" disabled={!name.trim() || name.trim() === user?.name} onClick={saveProfile}>Save</Button>
        </SettingsSection>
        <SettingsSection title="Security">
          <div className="flex items-center justify-between text-sm"><span>Password</span><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPw({ ...pw, open: true })}>Change password</Button></div>
          <p className="label-caps pt-2">Signed-in devices</p>
          <ul className="divide-y rounded-md border">
            {(sessions.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{deviceName(s.userAgent)}</span>
                {s.current ? <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">this device</span> : null}
                <span className="ml-auto font-mono text-muted-foreground">{s.ip ?? ""} · active {timeAgo(s.lastActiveAt)}</span>
                {!s.current ? <button aria-label="Sign out device" className="rounded p-1 text-destructive hover:bg-accent" onClick={() => revoke(s.id)}><Trash2 className="h-3.5 w-3.5" /></button> : null}
              </li>
            ))}
            {sessions.isLoading ? <li aria-busy className="space-y-2 px-3 py-3">{[0,1].map((i) => <div key={i} className="h-8 animate-pulse rounded-md bg-muted/60" />)}</li> : null}
          </ul>
        </SettingsSection>
        <SettingsSection title="Preferences">
          <div className="flex items-center justify-between text-sm"><span>Email notifications</span><Switch checked={settings.data?.emailNotifications ?? true} onCheckedChange={(v) => setPref({ emailNotifications: v })} /></div>
          <div className="flex items-center justify-between text-sm"><span>Snap canvas nodes to grid</span><Switch checked={settings.data?.canvasSnapToGrid ?? true} onCheckedChange={(v) => setPref({ canvasSnapToGrid: v })} /></div>
          <div className="flex items-center justify-between text-sm"><span>Timezone</span><span className="font-mono text-xs text-muted-foreground">{settings.data?.timezone ?? "UTC"}</span></div>
        </SettingsSection>
        <SettingsSection title="Danger zone">
          <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setDel({ open: true, confirm: "" })}>Delete account</Button>
        </SettingsSection>
      </div>

      <Dialog open={pw.open} onOpenChange={(o) => setPw({ ...pw, open: o })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Change password</DialogTitle><DialogDescription>Other devices stay signed in.</DialogDescription></DialogHeader>
          <label className="block text-xs text-muted-foreground">Current password<Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="mt-1 h-8" /></label>
          <label className="block text-xs text-muted-foreground">New password<Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="mt-1 h-8" /></label>
          {pw.next && pw.next.length < 8 ? <p className="text-xs text-destructive">At least 8 characters.</p> : null}
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setPw({ open: false, current: "", next: "" })}>Cancel</Button><Button size="sm" disabled={!pw.current || pw.next.length < 8} onClick={changePassword}>Update password</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={del.open} onOpenChange={(o) => setDel({ ...del, open: o })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete your account?</DialogTitle><DialogDescription>Type <span className="font-mono text-foreground">{user?.email}</span> to confirm. You can't delete an account that is the only owner of a workspace.</DialogDescription></DialogHeader>
          <Input value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} placeholder={user?.email} className="h-8 font-mono text-xs" />
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setDel({ open: false, confirm: "" })}>Cancel</Button><Button size="sm" variant="destructive" disabled={del.confirm !== user?.email} onClick={deleteAccount}>Delete account</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
