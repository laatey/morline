import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Copy, Database, Eye, EyeOff, Download, RotateCw } from "fluid-icons/react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Service } from "@/lib/platform-data";
import { api, type ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type Engine = "postgres" | "mysql" | "mongodb" | "redis" | "other";
const engineOf = (s: Service): Engine =>
  s.logo === "postgres"
    ? "postgres"
    : s.logo === "mysql"
      ? "mysql"
      : s.logo === "mongodb"
        ? "mongodb"
        : s.logo === "redis"
          ? "redis"
          : "other";
const unitLabel: Record<Engine, [string, string]> = {
  postgres: ["table", "tables"],
  mysql: ["table", "tables"],
  mongodb: ["collection", "collections"],
  redis: ["key", "keys"],
  other: ["table", "tables"],
};
const errMsg = (e: unknown, f: string) => (e as ApiError)?.message ?? f;
const list = <T,>(r: unknown): T[] => (Array.isArray(r) ? r : ((r as { data?: T[] })?.data ?? []));

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-md bg-muted/60" />
      ))}
    </div>
  );
}
function Empty({ title, note }: { title: string; note: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <Database className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-[280px] text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

/* ---------------- Data browser ---------------- */
type Collection = { name: string; count?: number; type?: string; size?: string };

export function DatabaseData({ service }: { service: Service }) {
  const engine = engineOf(service);
  const [one, many] = unitLabel[engine];
  const [open, setOpen] = useState<string | null>(null);
  const cols = useQuery({
    queryKey: ["db-collections", service.id],
    queryFn: async () =>
      list<Collection>(await api(`/services/${service.id}/database/collections`)),
    refetchInterval: 15_000,
  });
  const rows = useQuery({
    queryKey: ["db-rows", service.id, open],
    queryFn: async () =>
      list<Record<string, unknown>>(
        await api(
          `/services/${service.id}/database/collections/${encodeURIComponent(open!)}?limit=50`,
        ),
      ),
    enabled: !!open,
  });

  if (open) {
    const data = rows.data ?? [];
    const keys = [...new Set(data.flatMap((r) => Object.keys(r)))].slice(0, 8);
    return (
      <div>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => setOpen(null)}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="truncate font-mono text-xs">{open}</span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">first 50</span>
        </div>
        {rows.isLoading ? (
          <Skeleton rows={6} />
        ) : rows.isError ? (
          <Empty title="Could not read data" note={errMsg(rows.error, "Try again in a moment.")} />
        ) : !data.length ? (
          <Empty title={`Empty ${one}`} note="Rows appear here once your app writes them." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="border-b bg-surface/40 text-muted-foreground">
                <tr>
                  {keys.map((k) => (
                    <th key={k} className="whitespace-nowrap px-3 py-2 font-medium">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.map((r, i) => (
                  <tr key={i} className="hover:bg-accent/40">
                    {keys.map((k) => (
                      <td key={k} className="max-w-[180px] truncate whitespace-nowrap px-3 py-1.5">
                        {r[k] === null || r[k] === undefined ? (
                          <span className="text-muted-foreground">null</span>
                        ) : typeof r[k] === "object" ? (
                          JSON.stringify(r[k])
                        ) : (
                          String(r[k])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (cols.isLoading) return <Skeleton />;
  if (cols.isError)
    return (
      <Empty
        title="Database not reachable"
        note={errMsg(cols.error, "It may still be starting.")}
      />
    );
  const items = cols.data ?? [];
  if (!items.length)
    return (
      <Empty title={`No ${many} yet`} note={`Connect from your app and ${many} show up here.`} />
    );
  return (
    <div className="divide-y divide-border/50">
      <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {items.length} {items.length === 1 ? one : many}
      </p>
      {items.map((c) => (
        <button
          key={c.name}
          type="button"
          onClick={() => setOpen(c.name)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs hover:bg-accent/60"
        >
          <span className="truncate font-mono">{c.name}</span>
          {c.type ? (
            <span className="rounded-sm border px-1 font-mono text-[10px] text-muted-foreground">
              {c.type}
            </span>
          ) : null}
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {c.count !== undefined
              ? `${c.count.toLocaleString()} ${engine === "redis" ? "" : "rows"}`
              : ""}
            {c.size ? ` · ${c.size}` : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Connect ---------------- */
type Conn = {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  url?: string;
  publicUrl?: string | null;
  publicHost?: string | null;
  publicPort?: number | null;
};

function Field({
  label,
  value,
  secret,
}: {
  label: string;
  value?: string | number | null | undefined;
  secret?: boolean;
}) {
  const [show, setShow] = useState(false);
  if (value === undefined || value === null || value === "") return null;
  const v = String(value);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-xs">
        {secret && !show ? "•".repeat(Math.min(v.length, 24)) : v}
      </span>
      {secret ? (
        <button
          type="button"
          aria-label={show ? "Hide" : "Show"}
          onClick={() => setShow(!show)}
          className="text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(v);
          toast.success(`${label} copied`);
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DatabaseConnect({ service }: { service: Service }) {
  const [pub, setPub] = useState(false);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["db-conn", service.id],
    queryFn: () => api<Conn>(`/services/${service.id}/database/connection`),
  });

  const togglePublic = useMutation({
    mutationFn: (enabled: boolean) =>
      api(`/services/${service.id}/networking`, {
        method: "PATCH",
        body: { tcpProxy: { enabled } },
      }),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "Public access enabled" : "Public access disabled");
      void qc.invalidateQueries({ queryKey: ["db-conn", service.id] });
      void qc.invalidateQueries({ queryKey: ["canvas"] });
      void qc.invalidateQueries({ queryKey: ["service", service.id] });
    },
    onError: (e) => {
      toast.error(errMsg(e, "Could not update public access"));
    },
  });

  if (q.isLoading) return <Skeleton rows={5} />;
  if (q.isError)
    return (
      <Empty title="Credentials unavailable" note={errMsg(q.error, "Try again in a moment.")} />
    );
  const c = q.data ?? {};
  const isPublicEnabled = Boolean(c.publicUrl);
  const url = pub ? c.publicUrl : c.url;

  return (
    <div>
      <div className="flex gap-1 border-b px-4 py-2">
        {(["Private", "Public"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setPub(t === "Public")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground",
              (t === "Public") === pub && "bg-accent text-foreground",
            )}
          >
            {t} network
          </button>
        ))}
      </div>

      {pub ? (
        <div className="px-4 pt-3 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="space-y-0.5 pr-2">
              <div className="text-xs font-medium text-foreground">Public TCP Access</div>
              <div className="text-[11px] text-muted-foreground">
                Exposes a dedicated port to connect from outside tools like TablePlus, DBeaver, or
                local scripts.
              </div>
            </div>
            <Switch
              checked={isPublicEnabled}
              disabled={togglePublic.isPending}
              onCheckedChange={(checked) => togglePublic.mutate(checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isPublicEnabled
              ? "Reachable from anywhere over plain TCP. Use for local tools only."
              : "Public access is currently off. Turn on the switch above to assign an external TCP port."}
          </p>
        </div>
      ) : (
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          Use this from other services in this project — it never leaves the private network.
        </p>
      )}

      {!pub || isPublicEnabled ? (
        <div className="mt-3 divide-y divide-border/50 border-t">
          <Field label="URL" value={url} secret />
          {pub ? (
            <>
              <Field label="Host" value={c.publicHost || c.host} />
              <Field label="Port" value={c.publicPort} />
              <Field label="User" value={c.user} />
              <Field label="Password" value={c.password} secret />
              <Field label="Database" value={c.database} />
            </>
          ) : (
            <>
              <Field label="Host" value={c.host} />
              <Field label="Port" value={c.port} />
              <Field label="User" value={c.user} />
              <Field label="Password" value={c.password} secret />
              <Field label="Database" value={c.database} />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- Backups ---------------- */
type Backup = {
  id: string;
  createdAt: string;
  size?: string;
  status?: string;
  kind?: "manual" | "scheduled";
};

export function DatabaseBackups({ service }: { service: Service }) {
  const qc = useQueryClient();
  const key = ["db-backups", service.id];
  const [restore, setRestore] = useState<Backup | null>(null);
  const q = useQuery({
    queryKey: key,
    queryFn: async () => list<Backup>(await api(`/services/${service.id}/backups`)),
  });
  const create = useMutation({
    mutationFn: () => api(`/services/${service.id}/backups`, { method: "POST", body: {} }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Backup[]>(key);
      qc.setQueryData<Backup[]>(key, (l) => [
        {
          id: `tmp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: "running",
          kind: "manual",
        },
        ...(l ?? []),
      ]);
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error(errMsg(e, "Could not start backup"));
    },
    onSuccess: () => toast.success("Backup started"),
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
  const doRestore = async (b: Backup) => {
    try {
      await api(`/services/${service.id}/backups/${b.id}/restore`, { method: "POST", body: {} });
      toast.success("Restore started");
      void qc.invalidateQueries({ queryKey: ["canvas"] });
    } catch (e) {
      toast.error(errMsg(e, "Could not restore"));
    }
  };
  const items = q.data ?? [];
  return (
    <div>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-xs text-muted-foreground">Daily snapshots, kept 7 days.</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          <Download className="h-3.5 w-3.5" />
          Back up now
        </Button>
      </div>
      {q.isLoading ? (
        <Skeleton />
      ) : q.isError ? (
        <Empty title="Backups unavailable" note={errMsg(q.error, "Try again in a moment.")} />
      ) : !items.length ? (
        <Empty title="No backups yet" note="The first scheduled snapshot runs tonight." />
      ) : (
        <div className="divide-y divide-border/50">
          {items.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  b.status === "running"
                    ? "animate-pulse bg-muted-foreground"
                    : b.status === "failed"
                      ? "bg-destructive"
                      : "bg-primary",
                )}
              />
              <span>{timeAgo(b.createdAt)}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {b.kind ?? "scheduled"}
              </span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {b.size ?? ""}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 gap-1 px-2 text-[11px]"
                disabled={b.status === "running" || b.id.startsWith("tmp-")}
                onClick={() => setRestore(b)}
              >
                <RotateCw className="h-3 w-3" />
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={!!restore} onOpenChange={(v) => !v && setRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Current data in {service.name} is replaced with the snapshot from{" "}
              {restore ? timeAgo(restore.createdAt) : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => restore && void doRestore(restore)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
