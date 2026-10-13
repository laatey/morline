import { ResourceLimits } from "@/components/moor/resource-limits";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Folder,
  GitCommit,
  Link as LinkIcon,
  More,
  Plus,
  RotateCw,
  Search,
  Trash,
  Close,
} from "fluid-icons/react";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DeployState, LogLevel, Service } from "@/lib/platform-data";
import { api, type ApiError } from "@/lib/api";
import {
  timeAgo,
  useCanvasData,
  useDeployments,
  useDomains,
  useEnvId,
  useLogs,
  useMetrics,
  useServices,
  type ApiDeployment,
  type ApiVariable,
} from "@/lib/workspace";
import { DeployBadge, Logo, Sparkline } from "./primitives";
import { cn } from "@/lib/utils";

const errMsg = (e: unknown, fallback: string) => (e as ApiError)?.message ?? fallback;

export function deployState(s: string): DeployState {
  if (s === "active") return "active";
  if (s === "building" || s === "deploying") return "building";
  if (s === "failed" || s === "crashed") return "failed";
  if (s === "queued") return "queued";
  return "removed";
}

export function deployTitle(d: ApiDeployment) {
  return (
    d.commit?.message ??
    (d.image
      ? `Image ${d.image}`
      : `${d.trigger === "rollback" ? "Rollback" : d.trigger === "manual" ? "Manual deploy" : "Deploy"} of ${d.serviceName ?? "service"}`)
  );
}

export function duration(d: ApiDeployment) {
  const sec =
    d.durationSec ??
    (d.startedAt && d.finishedAt
      ? Math.round((new Date(d.finishedAt).getTime() - new Date(d.startedAt).getTime()) / 1000)
      : null);
  if (sec == null) return d.finishedAt ? "—" : "running";
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// Only the newest active deployment per service is live; older "active" rows were superseded.
export function normalizeDeployments(rows: ApiDeployment[]): ApiDeployment[] {
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => {
      if (d.state !== "active") return d;
      if (seen.has(d.serviceId)) return { ...d, state: "removed" };
      seen.add(d.serviceId);
      return d;
    });
}

export function DeploymentList({
  serviceId,
  compact,
  onOpen,
  header,
}: {
  serviceId?: string | undefined;
  compact?: boolean;
  onOpen?: (d: ApiDeployment) => void;
  header?: ReactNode;
}) {
  const qc = useQueryClient();
  const { data: raw, isLoading, isError } = useDeployments(serviceId);
  const rows = raw ? normalizeDeployments(raw) : raw;
  const act = async (d: ApiDeployment, action: "redeploy" | "rollback" | "cancel") => {
    try {
      await api(`/deployments/${d.id}/${action}`, { method: "POST" });
      toast.success(
        action === "redeploy"
          ? `Redeploying ${d.serviceName ?? "service"}`
          : action === "rollback"
            ? "Rollback started"
            : "Deployment cancelled",
      );
      void qc.invalidateQueries({ queryKey: ["deployments"] });
    } catch (e) {
      toast.error(errMsg(e, `Could not ${action}`));
    }
  };
  return (
    <div>
      {compact && serviceId ? <ServiceTopology serviceId={serviceId} /> : null}
      {header}
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <p className="px-4 py-6 text-sm text-destructive">Could not load deployments.</p>
      ) : !rows?.length ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No deployments yet.</p>
      ) : (
        <ul className="divide-y border-t">
          {rows.map((d) => {
            const st = deployState(d.state);
            return (
              <li
                key={d.id}
                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40"
              >
                <DeployBadge state={st} />
                <div className="min-w-0 flex-1">
                  {onOpen ? (
                    <button
                      onClick={() => onOpen(d)}
                      className={cn(
                        "block w-full truncate text-left text-sm hover:underline",
                        st === "removed" && "text-muted-foreground",
                      )}
                    >
                      {deployTitle(d)}
                    </button>
                  ) : (
                    <Link
                      to="/deployments/$id"
                      params={{ id: d.id }}
                      className={cn(
                        "block truncate text-sm hover:underline",
                        st === "removed" && "text-muted-foreground",
                      )}
                    >
                      {deployTitle(d)}
                    </Link>
                  )}
                  <p className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                    {!compact ? <span className="text-foreground/80">{d.serviceName}</span> : null}
                    {d.commit?.sha ? (
                      <span className="inline-flex items-center gap-1">
                        <GitCommit className="h-3 w-3" />
                        {d.commit.sha.slice(0, 7)}
                      </span>
                    ) : null}
                    <span>{d.commit?.author ?? d.createdBy?.name ?? d.trigger}</span>
                    <span>{timeAgo(d.createdAt)}</span>
                    <span>· {duration(d)}</span>
                  </p>
                  {d.errorSummary ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-destructive">
                      {d.errorSummary}
                    </p>
                  ) : null}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Deployment actions"
                    className="rounded p-1 text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <More className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onOpen ? (
                      <DropdownMenuItem onClick={() => onOpen(d)}>View details</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem asChild>
                        <Link to="/deployments/$id" params={{ id: d.id }}>
                          View build logs
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => act(d, "redeploy")}>
                      <RotateCw className="mr-2 h-3.5 w-3.5" />
                      Redeploy
                    </DropdownMenuItem>
                    {d.rollbackable && st !== "active" ? (
                      <DropdownMenuItem onClick={() => act(d, "rollback")}>
                        Roll back to this
                      </DropdownMenuItem>
                    ) : null}
                    {st === "building" || st === "queued" ? (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => act(d, "cancel")}
                      >
                        Cancel
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2 border-t px-4 py-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-9 animate-pulse rounded bg-muted/60" />
      ))}
    </div>
  );
}

function ServiceTopology({ serviceId }: { serviceId: string }) {
  const canvas = useCanvasData().data;
  const services = useServices().data ?? [];
  const service = services.find((s) => s.id === serviceId);
  if (!service) return null;
  const conns = canvas?.connections ?? [];
  const find = (id: string) => services.find((s) => s.id === id);
  const dependencies = conns
    .filter((c) => c.fromServiceId === serviceId)
    .map((c) => find(c.toServiceId))
    .filter((s): s is Service => Boolean(s));
  const consumers = conns
    .filter((c) => c.toServiceId === serviceId)
    .map((c) => find(c.fromServiceId))
    .filter((s): s is Service => Boolean(s));
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-5 px-5 py-5">
      <Meta label="Region" value={service.region} />
      <Meta label="Replicas" value={`${service.replicas}×`} />
      <Meta
        label="Private"
        value={`${service.name}.morline.internal${service.port ? `:${service.port}` : ""}`}
      />
      <Meta label="Public" value={service.domain ?? "Not exposed"} />
      <RelationList label="Depends on" services={dependencies} />
      <RelationList label="Used by" services={consumers} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="label-caps">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}

function RelationList({ label, services }: { label: string; services: Service[] }) {
  return (
    <div>
      <p className="border-b pb-2 text-sm font-semibold">
        {label}{" "}
        <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">
          {services.length}
        </span>
      </p>
      <div className="space-y-2 pt-2.5">
        {services.map((service) => (
          <div key={service.id} className="flex items-center gap-2 text-sm">
            <Logo k={service.logo} />
            <span>{service.name}</span>
          </div>
        ))}
        {!services.length ? (
          <p className="font-mono text-[10px] text-muted-foreground">None</p>
        ) : null}
      </div>
    </div>
  );
}

type SuggestedVar = { key: string; value?: string; secret?: boolean; source?: string };

/** Keys found in the repo's .env.example / .env.sample etc. that aren't set yet. */
type DraftVar = { id: string; key: string; value: string; secret: boolean };

/** Keys found in the repo's .env.example / .env.sample etc. that aren't set yet. */
function SuggestedVariables({
  serviceId,
  existing,
  onSelectSuggestion,
  onSelectAll,
}: {
  serviceId: string;
  existing: string[];
  onSelectSuggestion: (s: SuggestedVar) => void;
  onSelectAll: (items: SuggestedVar[]) => void;
}) {
  const qc = useQueryClient();
  const key = ["variable-suggestions", serviceId];
  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return (
          (await api<{ data: SuggestedVar[] }>(`/services/${serviceId}/variables/suggestions`))
            .data ?? []
        );
      } catch (e) {
        if ((e as ApiError).status === 404) return [];
        throw e;
      }
    },
    staleTime: 60_000,
  });
  if (isLoading) {
    return (
      <div className="mx-4 mb-3 h-12 animate-pulse rounded-md border border-dashed bg-muted/30" />
    );
  }
  const list = data.filter((s) => !existing.includes(s.key));
  if (!list.length) return null;
  const drop = (keys: string[]) =>
    qc.setQueryData<SuggestedVar[]>(key, (d = []) => d.filter((s) => !keys.includes(s.key)));

  const handleSelect = (s: SuggestedVar) => {
    drop([s.key]);
    onSelectSuggestion(s);
  };

  const handleSelectAll = () => {
    drop(list.map((s) => s.key));
    onSelectAll(list);
  };

  const dismiss = async (keys: string[]) => {
    const prev = qc.getQueryData<SuggestedVar[]>(key);
    drop(keys);
    try {
      await api(`/services/${serviceId}/variables/suggestions/dismiss`, {
        method: "POST",
        body: { keys },
      });
    } catch (e) {
      qc.setQueryData(key, prev);
      toast.error(errMsg(e, "Could not dismiss"));
    }
  };
  const source = list[0]?.source;
  return (
    <div className="mx-4 mb-3 rounded-md border bg-muted/20">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <p className="text-xs font-medium">Suggested variables</p>
        {source ? (
          <span className="font-mono text-[10px] text-muted-foreground">from {source}</span>
        ) : null}
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => void dismiss(list.map((s) => s.key))}
          >
            Dismiss all
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={handleSelectAll}
          >
            Add all to form
          </Button>
        </div>
      </div>
      <ul className="divide-y">
        {list.map((s) => (
          <li key={s.key} className="group flex h-9 items-center gap-3 px-3 font-mono text-xs">
            <span className="w-48 shrink-0 truncate">{s.key}</span>
            <span className="flex-1 truncate text-muted-foreground">{s.value || "—"}</span>
            <button
              className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => void dismiss([s.key])}
            >
              Dismiss
            </button>
            <button
              aria-label={`Add ${s.key}`}
              className="rounded p-1 hover:bg-accent"
              onClick={() => handleSelect(s)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VariablesTable({ serviceId }: { serviceId: string }) {
  const qc = useQueryClient();
  const key = ["variables", serviceId];
  const [reveal, setReveal] = useState(false);
  const { data: vars = [], isLoading } = useQuery({
    queryKey: [...key, reveal],
    queryFn: async () =>
      (
        await api<{ data: ApiVariable[] }>(
          `/services/${serviceId}/variables${reveal ? "?reveal=true" : ""}`,
        )
      ).data,
  });
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<DraftVar[]>([
    { id: "1", key: "", value: "", secret: false },
  ]);
  const [raw, setRaw] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["staged-changes"] });
    void qc.invalidateQueries({ queryKey: ["canvas"] });
    return qc.invalidateQueries({ queryKey: key });
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (e) {
      toast.error(errMsg(e, "Could not save variable"));
    }
  };

  const saveRaw = () => {
    const variables = (raw ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return { key: l.slice(0, i).trim(), value: l.slice(i + 1) };
      });
    setRaw(null);
    void run(
      () => api(`/services/${serviceId}/variables`, { method: "PUT", body: { variables } }),
      `${variables.length} variables saved — redeploy to apply`,
    );
  };

  const addDraftRow = () => {
    setDrafts((prev) => [...prev, { id: crypto.randomUUID(), key: "", value: "", secret: false }]);
  };

  const updateDraft = (id: string, patch: Partial<DraftVar>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDraftRow = (id: string) => {
    setDrafts((prev) => {
      if (prev.length <= 1) return [{ id: crypto.randomUUID(), key: "", value: "", secret: false }];
      return prev.filter((d) => d.id !== id);
    });
  };

  const handleSelectSuggestion = (s: SuggestedVar) => {
    setDrafts((prev) => {
      if (prev.length === 1 && !prev[0]!.key.trim() && !prev[0]!.value.trim()) {
        return [{ id: prev[0]!.id, key: s.key, value: s.value ?? "", secret: Boolean(s.secret) }];
      }
      return [
        ...prev.filter((d) => d.key.trim() || d.value.trim()),
        { id: crypto.randomUUID(), key: s.key, value: s.value ?? "", secret: Boolean(s.secret) },
      ];
    });
  };

  const handleSelectAllSuggestions = (items: SuggestedVar[]) => {
    setDrafts((prev) => {
      const existingDraftKeys = new Set(prev.map((d) => d.key.trim().toUpperCase()));
      const newItems = items
        .filter((i) => !existingDraftKeys.has(i.key.trim().toUpperCase()))
        .map((i) => ({
          id: crypto.randomUUID(),
          key: i.key,
          value: i.value ?? "",
          secret: Boolean(i.secret),
        }));
      const filteredPrev = prev.filter((d) => d.key.trim() || d.value.trim());
      return [...filteredPrev, ...newItems];
    });
  };

  const validDrafts = drafts.filter((d) => d.key.trim().length > 0);

  const saveDrafts = () => {
    if (!validDrafts.length) return;
    const variables = validDrafts.map((d) => ({
      key: d.key.trim().toUpperCase().replace(/\W/g, "_"),
      value: d.value,
      secret: d.secret,
    }));

    setDrafts([{ id: crypto.randomUUID(), key: "", value: "", secret: false }]);
    void run(
      () => api(`/services/${serviceId}/variables`, { method: "POST", body: { variables } }),
      variables.length === 1
        ? `${variables[0]!.key} added — redeploy to apply`
        : `${variables.length} variables added — redeploy to apply`,
    );
  };

  const list = vars.filter((v) => v.key.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3">
        <p className="text-sm font-medium">{vars.length} variables</p>
        <div className="relative ml-auto w-44">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter"
            className="h-7 pl-7 text-xs"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() =>
            setRaw(
              vars
                .filter((v) => !v.secret || reveal)
                .map((v) => `${v.key}=${v.value}`)
                .join("\n"),
            )
          }
        >
          Raw
        </Button>
      </div>

      <div className="mx-4 mb-3 space-y-2 rounded-md border border-dashed p-2.5">
        {drafts.map((d, index) => (
          <div key={d.id} className="flex items-center gap-2">
            <Input
              value={d.key}
              onChange={(e) => updateDraft(d.id, { key: e.target.value })}
              placeholder="KEY"
              className="h-7 w-36 shrink-0 font-mono text-xs sm:w-48"
            />
            <Input
              value={d.value}
              onChange={(e) => updateDraft(d.id, { value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (index === drafts.length - 1 && d.key.trim()) {
                    addDraftRow();
                  } else {
                    saveDrafts();
                  }
                }
              }}
              placeholder="value or ${{ service.VAR }}"
              className="h-7 flex-1 font-mono text-xs"
            />
            <label className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Switch
                checked={d.secret}
                onCheckedChange={(v) => updateDraft(d.id, { secret: v })}
                className="scale-75"
              />
              secret
            </label>
            {drafts.length > 1 || d.key || d.value ? (
              <button
                type="button"
                onClick={() => removeDraftRow(d.id)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Remove draft row"
              >
                <Close className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}

        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={addDraftRow}
          >
            <Plus className="h-3 w-3" /> Add another
          </Button>

          {validDrafts.length > 0 ? (
            <Button size="sm" className="h-6 px-3 text-[11px]" onClick={saveDrafts}>
              Save {validDrafts.length > 1 ? `(${validDrafts.length})` : ""}
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <ul className="divide-y border-t border-b">
          {list.map((v) => {
            const visible = !v.secret || shown.has(v.key) || v.isReference;
            return (
              <li key={v.key} className="group flex h-10 items-center gap-3 px-4 font-mono text-xs">
                <span className="w-48 shrink-0 truncate">{v.key}</span>
                <span
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 truncate",
                    v.isReference ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {v.isReference ? <LinkIcon className="h-3 w-3 shrink-0" /> : null}
                  {editing === v.key ? (
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => setEditing(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setEditing(null);
                          void run(
                            () =>
                              api(`/services/${serviceId}/variables/${v.key}`, {
                                method: "PATCH",
                                body: { value: editValue },
                              }),
                            `${v.key} updated`,
                          );
                        }
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="h-7 font-mono text-xs"
                    />
                  ) : (
                    <button
                      className="truncate text-left hover:text-foreground"
                      onClick={() => {
                        setEditing(v.key);
                        setEditValue(visible && !v.value.includes("•") ? v.value : "");
                      }}
                      aria-label={`Edit ${v.key}`}
                    >
                      {visible ? v.value : "•".repeat(10)}
                    </button>
                  )}
                </span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                  {v.secret && !v.isReference ? (
                    <button
                      aria-label="Toggle value"
                      className="rounded p-1 hover:bg-accent"
                      onClick={() => {
                        setReveal(true);
                        setShown((s) => {
                          const n = new Set(s);
                          if (n.has(v.key)) n.delete(v.key);
                          else n.add(v.key);
                          return n;
                        });
                      }}
                    >
                      {shown.has(v.key) ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                  <button
                    aria-label="Copy value"
                    className="rounded p-1 hover:bg-accent"
                    onClick={() => {
                      navigator.clipboard?.writeText(v.value);
                      toast("Copied " + v.key);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Delete variable"
                    className="rounded p-1 text-destructive hover:bg-accent"
                    onClick={() =>
                      void run(
                        () =>
                          api(`/services/${serviceId}/variables/${v.key}`, { method: "DELETE" }),
                        `${v.key} deleted`,
                      )
                    }
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!isLoading && !list.length ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {vars.length ? "No variables match." : "No variables yet."}
        </p>
      ) : null}

      <div className="mt-4">
        <SuggestedVariables
          serviceId={serviceId}
          existing={[
            ...vars.map((v) => v.key),
            ...drafts.map((d) => d.key.trim().toUpperCase()).filter(Boolean),
          ]}
          onSelectSuggestion={handleSelectSuggestion}
          onSelectAll={handleSelectAllSuggestions}
        />
      </div>
      <Dialog open={raw !== null} onOpenChange={(o) => !o && setRaw(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raw editor</DialogTitle>
            <DialogDescription>
              Paste a .env file. Saving replaces all variables on this service.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={raw ?? ""}
            onChange={(e) => setRaw(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRaw(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveRaw}>
              Update variables
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  unit,
  data,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  data: number[];
  tone?: string;
}) {
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="label-caps">{label}</p>
        <p className="font-mono text-sm">
          {value}
          <span className="ml-0.5 text-muted-foreground">{unit}</span>
        </p>
      </div>
      {data.length > 1 ? (
        <Sparkline data={data} className={cn("mt-3 h-16", tone)} />
      ) : (
        <div className="mt-3 grid h-16 place-items-center rounded bg-muted/30 font-mono text-[10px] text-muted-foreground">
          no data yet
        </div>
      )}
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>-1h</span>
        <span>now</span>
      </div>
    </div>
  );
}

const METRICS = [
  { metric: "cpu", label: "CPU", tone: undefined },
  { metric: "memory", label: "Memory", tone: "text-score" },
  { metric: "network_egress", label: "Egress", tone: "text-score-mid" },
  { metric: "latency_p95", label: "p95 latency", tone: "text-chart-5" },
] as const;

/** Sums series for the same metric across services at each step. */
export function aggregate(
  series: {
    metric: string;
    unit: string;
    points: [string, number | null][];
    current: number | null;
  }[],
  metric: string,
) {
  const matching = series.filter((s) => s.metric === metric || s.metric.startsWith(metric));
  if (!matching.length) return null;
  const len = Math.max(...matching.map((s) => s.points.length));
  const data = Array.from({ length: len }, (_, i) =>
    matching.reduce((n, s) => n + (s.points[i]?.[1] ?? 0), 0),
  );
  const current = matching.reduce((n, s) => n + (s.current ?? s.points.at(-1)?.[1] ?? 0), 0);
  return { data, current, unit: matching[0]!.unit };
}

export function MetricsGrid({ service }: { service?: Service }) {
  const { data } = useMetrics("1h", service?.id);
  const series = data?.series ?? [];
  return (
    <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 [&>*:nth-child(n+3)]:border-t">
      {METRICS.map((m) => {
        const agg = aggregate(series, m.metric);
        return (
          <MetricTile
            key={m.metric}
            label={m.label}
            value={
              agg
                ? agg.current < 10
                  ? agg.current.toFixed(2)
                  : Math.round(agg.current).toString()
                : "—"
            }
            unit={agg?.unit ?? ""}
            data={agg?.data ?? []}
            {...(m.tone ? { tone: m.tone } : {})}
          />
        );
      })}
    </div>
  );
}

const levelTone: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  debug: "text-chart-5",
  warn: "text-score-mid",
  error: "text-destructive",
};

export function LogStream({
  serviceId,
  dense,
  deploymentId,
  phase,
}: {
  serviceId?: string;
  dense?: boolean;
  deploymentId?: string;
  phase?: "build" | "deploy";
}) {
  const [q, setQ] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set(["info", "debug", "warn", "error"]));
  const envLogs = useLogs(serviceId);
  const depLogs = useQuery({
    queryKey: ["deployment-logs", deploymentId, phase],
    queryFn: async () =>
      (
        await api<{
          data: { timestamp: string; level: LogLevel; message: string; serviceName?: string }[];
        }>(`/deployments/${deploymentId}/logs${phase ? `?phase=${phase}` : ""}`)
      ).data,
    enabled: !!deploymentId,
    refetchInterval: 3000,
  });
  const source = deploymentId ? depLogs : envLogs;
  const lines = [...(source.data ?? [])]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .filter((l) => levels.has(l.level) && l.message.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <div className="relative w-56">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search logs, e.g. "429"'
            className="h-7 pl-7 font-mono text-xs"
          />
        </div>
        {(["info", "debug", "warn", "error"] as LogLevel[]).map((lv) => (
          <button
            key={lv}
            onClick={() =>
              setLevels((s) => {
                const n = new Set(s);
                if (n.has(lv)) n.delete(lv);
                else n.add(lv);
                return n;
              })
            }
            className={cn(
              "h-6 rounded-sm border px-1.5 font-mono text-[10px] uppercase",
              levels.has(lv)
                ? cn("border-foreground/20", levelTone[lv])
                : "border-transparent text-muted-foreground/50 line-through",
            )}
          >
            {lv}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-score">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-score" />
          live tail
        </span>
      </div>
      <div className="scroll-area min-h-0 flex-1 overflow-auto bg-surface py-1 font-mono text-[11.5px] leading-5">
        {lines.map((l, i) => (
          <button
            type="button"
            key={i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className={cn(
              "flex w-full gap-3 px-4 text-left hover:bg-accent/40",
              l.level === "error" && "bg-destructive/5",
              openIdx === i && "bg-accent/60",
            )}
          >
            <span className="shrink-0 text-muted-foreground/60">
              {new Date(l.timestamp).toLocaleTimeString([], { hour12: false })}
            </span>
            {!serviceId && !deploymentId ? (
              <span className="w-24 shrink-0 truncate text-primary">{l.serviceName}</span>
            ) : null}
            <span className={cn("w-10 shrink-0 uppercase", levelTone[l.level])}>{l.level}</span>
            <span
              className={cn(
                "min-w-0",
                dense ? "truncate" : "break-all",
                l.level === "error" && "text-destructive",
              )}
            >
              {l.message}
            </span>
          </button>
        ))}
        {source.isLoading ? (
          <div className="space-y-1.5 px-4 py-3">
            {[70, 90, 55, 80].map((w) => (
              <div
                key={w}
                className="h-3 animate-pulse rounded bg-muted/60"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : !lines.length ? (
          <p className="px-4 py-6 text-muted-foreground">
            {source.data?.length ? "No lines match." : "No logs yet."}
          </p>
        ) : null}
      </div>
      {openIdx != null && lines[openIdx] ? (
        <LogDetail
          line={
            lines[openIdx] as Record<string, unknown> & {
              timestamp: string;
              level: LogLevel;
              message: string;
            }
          }
          onClose={() => setOpenIdx(null)}
          onPrev={openIdx > 0 ? () => setOpenIdx(openIdx - 1) : undefined}
          onNext={openIdx < lines.length - 1 ? () => setOpenIdx(openIdx + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

/** Full log line + every attribute the API sent with it. Shown under the stream, no navigation. */
function LogDetail({
  line,
  onClose,
  onPrev,
  onNext,
}: {
  line: Record<string, unknown> & { timestamp: string; level: LogLevel; message: string };
  onClose: () => void;
  onPrev?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
}) {
  const [view, setView] = useState<"attrs" | "raw">("attrs");
  const { message, ...rest } = line;
  const flat: [string, string][] = [];
  const walk = (o: Record<string, unknown>, p = "") => {
    for (const [k, v] of Object.entries(o)) {
      if (v == null || v === "") continue;
      if (typeof v === "object" && !Array.isArray(v))
        walk(v as Record<string, unknown>, `${p}${k}.`);
      else flat.push([`${p}${k}`, Array.isArray(v) ? JSON.stringify(v) : String(v)]);
    }
  };
  walk(rest);
  const copy = (t: string) => {
    void navigator.clipboard?.writeText(t);
    toast.success("Copied");
  };
  const ts = new Date(line.timestamp);
  return (
    <div className="flex max-h-[55%] min-h-0 shrink-0 flex-col border-t bg-card animate-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <div className="flex rounded-md border">
          <button
            aria-label="Previous line"
            disabled={!onPrev}
            onClick={onPrev}
            className="px-1.5 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Next line"
            disabled={!onNext}
            onClick={onNext}
            className="border-l px-1.5 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="font-mono text-xs">
          {isNaN(ts.getTime())
            ? line.timestamp
            : `${ts.toISOString().slice(0, 10)} ${ts.toLocaleTimeString([], { hour12: false })}`}
        </span>
        <span
          className={cn(
            "rounded-sm border px-1.5 font-mono text-[10px] uppercase",
            levelTone[line.level],
          )}
        >
          {line.level}
        </span>
        <div className="ml-auto flex rounded-md border p-0.5 text-[11px]">
          {(["attrs", "raw"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded px-2 py-0.5 text-muted-foreground",
                view === v && "bg-accent text-foreground",
              )}
            >
              {v === "attrs" ? "Attributes" : "Raw"}
            </button>
          ))}
        </div>
        <button
          aria-label="Close details"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Close className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="scroll-area min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4 pt-2.5">
        {view === "attrs" ? (
          <>
            <div className="group relative rounded-lg border bg-surface p-3 pr-9">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-5">
                {message}
              </pre>
              <button
                aria-label="Copy line"
                onClick={() => copy(message)}
                className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            {flat.length ? (
              <dl className="divide-y rounded-lg border font-mono text-[11px]">
                {flat.map(([k, v]) => (
                  <div
                    key={k}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-1.5"
                  >
                    <dt className="truncate text-muted-foreground">{k}</dt>
                    <dd className="break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </>
        ) : (
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border bg-surface p-3 font-mono text-[11px]">
              {JSON.stringify(line, null, 2)}
            </pre>
            <button
              aria-label="Copy JSON"
              onClick={() => copy(JSON.stringify(line, null, 2))}
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type UdpInfo = {
  enabled: boolean;
  host: string;
  range: { from: number; to: number };
  ports: { containerPort: number; port: number; address: string }[];
};
type NetworkingData = { udpProxy?: UdpInfo; restarting?: boolean };
const UDP_PRESETS = [
  { label: "RADIUS", hint: "1812, 1813", ports: [1812, 1813] },
  { label: "WireGuard", hint: "51820", ports: [51820] },
  { label: "DNS", hint: "53", ports: [53] },
];

function UdpPorts({ service }: { service: Service }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["networking", service.id],
    queryFn: () => api<NetworkingData>(`/services/${service.id}/networking`),
  });
  const info = q.data?.udpProxy;
  // Older servers don't report udpProxy; hide the section instead of showing controls that cannot work.
  if (q.isLoading || !info) return null;
  const current = info.ports;

  const save = async (ports: number[], message: string) => {
    setBusy(true);
    try {
      const res = await api<NetworkingData>(`/services/${service.id}/networking`, {
        method: "PATCH",
        body: { udpPorts: ports },
      });
      qc.setQueryData(["networking", service.id], res);
      void qc.invalidateQueries({ queryKey: ["canvas"] });
      void qc.invalidateQueries({ queryKey: ["service", service.id] });
      toast.success(res.restarting ? `${message}. Restarting the service to apply.` : message);
    } catch (e) {
      toast.error(errMsg(e, "Could not update UDP ports"));
    } finally {
      setBusy(false);
    }
  };
  const add = (ports: number[]) => {
    const have = current.map((p) => p.containerPort);
    const next = Array.from(new Set([...have, ...ports])).sort((a, b) => a - b);
    if (next.length === have.length) {
      toast.info("Already exposed");
      return;
    }
    void save(next, `UDP ${ports.join(", ")} exposed`);
  };
  const submit = () => {
    const n = Number(draft);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      toast.error("Enter a port between 1 and 65535");
      return;
    }
    add([n]);
    setDraft("");
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="label-caps">Public UDP</p>
        {busy ? (
          <span className="font-mono text-[10px] text-muted-foreground">applying…</span>
        ) : null}
      </div>
      {current.length ? (
        current.map((m) => (
          <div key={m.containerPort} className="mt-2 flex items-center gap-2 font-mono text-xs">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-score" />
            <span className="truncate">{m.address}</span>
            <span className="shrink-0 text-muted-foreground">→ :{m.containerPort}/udp</span>
            <button
              type="button"
              aria-label={`Copy ${m.address}`}
              onClick={() => {
                void navigator.clipboard.writeText(m.address);
                toast.success("Address copied");
              }}
              className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Stop exposing UDP ${m.containerPort}`}
              disabled={busy}
              onClick={() =>
                void save(
                  current
                    .filter((p) => p.containerPort !== m.containerPort)
                    .map((p) => p.containerPort),
                  `UDP ${m.containerPort} closed`,
                )
              }
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <Close className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No UDP ports exposed.</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Input
          value={draft}
          inputMode="numeric"
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Container port, e.g. 1812"
          aria-label="UDP port inside the container"
          className="h-7 flex-1 font-mono text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={busy || !draft}
          onClick={submit}
        >
          Expose
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Quick add</span>
        {UDP_PRESETS.map((p) => (
          <Button
            key={p.label}
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => add(p.ports)}
          >
            <Plus className="h-3 w-3" /> {p.label}{" "}
            <span className="font-mono opacity-60">{p.hint}</span>
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        For RADIUS, WireGuard, DNS or game servers. Each port gets its own public port (
        {info.range.from}–{info.range.to}). Your app also receives{" "}
        <span className="font-mono">MORLINE_PUBLIC_UDP_HOST</span> and{" "}
        <span className="font-mono">MORLINE_PUBLIC_UDP_PORT_&lt;port&gt;</span>. Changing this
        restarts the service.
      </p>
    </div>
  );
}

export function NetworkingPanel({ service }: { service: Service }) {
  const qc = useQueryClient();
  const envId = useEnvId();
  const own = (useDomains().data ?? []).filter((d) => d.serviceId === service.id);
  const generate = async () => {
    try {
      await api(`/services/${service.id}/domains`, { method: "POST", body: { kind: "generated" } });
      toast.success("Generated domain for " + service.name);
      void qc.invalidateQueries({ queryKey: ["domains", envId] });
      void qc.invalidateQueries({ queryKey: ["canvas", envId] });
    } catch (e) {
      toast.error(errMsg(e, "Could not generate a domain"));
    }
  };
  return (
    <div className="divide-y">
      <div className="px-4 py-3">
        <p className="label-caps">Public</p>
        {own.length ? (
          own.map((d) => (
            <div key={d.id} className="mt-2 flex items-center gap-2 font-mono text-xs">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  d.status === "active"
                    ? "bg-score"
                    : d.status === "failed"
                      ? "bg-destructive"
                      : "bg-score-mid",
                )}
              />
              <a
                href={`https://${d.host}`}
                target="_blank"
                rel="noreferrer"
                className="truncate hover:underline"
              >
                {d.host}
              </a>
              <span className="ml-auto text-muted-foreground">
                → :{d.targetPort ?? service.port ?? "auto"}
              </span>
            </div>
          ))
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Not exposed to the internet.</p>
        )}
        <Button size="sm" variant="outline" className="mt-3 h-7 text-xs" onClick={generate}>
          Generate domain
        </Button>
      </div>
      <UdpPorts service={service} />
      <div className="px-4 py-3">
        <p className="label-caps">Private network</p>
        <p className="mt-2 font-mono text-xs">
          {service.name}.morline.internal{service.port ? `:${service.port}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Reachable only from services in this environment.
        </p>
      </div>
    </div>
  );
}

type ServiceSettingsData = {
  settings?: {
    startCommand?: string | null;
    runtimeVersion?: string | null;
    healthcheckPath?: string | null;
    autoDeploy?: boolean;
    sleepWhenIdle?: boolean;
    replicas?: number;
    rootDirectory?: string | null;
    basePath?: string | null;
  };
};

function RootDirectoryInput({
  serviceId,
  defaultValue,
  onSave,
}: {
  serviceId: string;
  defaultValue?: string | null | undefined;
  onSave: (val: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  // Attempt to query backend for repo directories (gracefully returns null if endpoint isn't present)
  const { data: serverDirs } = useQuery({
    queryKey: ["service", serviceId, "directories"],
    queryFn: async () => {
      try {
        const res = await api<string[] | { directories: string[] }>(
          `/services/${serviceId}/directories`,
        );
        return Array.isArray(res) ? res : (res?.directories ?? []);
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const defaultDirs = [
    "/",
    "/backend",
    "/frontend",
    "/api",
    "/server",
    "/client",
    "/web",
    "/app",
    "/packages",
    "/services",
    "/src",
  ];

  const allDirs = Array.from(
    new Set([
      "/",
      ...(serverDirs && serverDirs.length > 0 ? serverDirs : defaultDirs),
      ...(defaultValue ? [defaultValue.startsWith("/") ? defaultValue : `/${defaultValue}`] : []),
    ]),
  );

  const query = value.trim().toLowerCase();
  const filtered = allDirs.filter((d) =>
    query === "" || query === "/" ? true : d.toLowerCase().includes(query),
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        commit();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, value]);

  const commit = (valToCommit?: string) => {
    const raw = (valToCommit !== undefined ? valToCommit : value).trim();
    const formatted = raw ? (raw === "/" ? "/" : raw.startsWith("/") ? raw : `/${raw}`) : null;
    if (formatted !== (defaultValue ?? null)) {
      onSave(formatted);
    }
  };

  const handleSelect = (dir: string) => {
    setValue(dir);
    setOpen(false);
    commit(dir);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setOpen(false);
            commit();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="/"
        className="h-7 w-56 font-mono text-xs"
      />
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-52 w-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg backdrop-blur">
          <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground">
            {serverDirs && serverDirs.length > 0 ? "Repository folders" : "Select folder"}
          </div>
          {filtered.length === 0 ? (
            <div
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-mono text-xs hover:bg-accent"
              onClick={() => handleSelect(value.startsWith("/") ? value : `/${value}`)}
            >
              <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                Use &quot;{value.startsWith("/") ? value : `/${value}`}&quot;
              </span>
            </div>
          ) : (
            filtered.map((d) => {
              const isSelected = value === d || (value === "" && d === "/");
              return (
                <div
                  key={d}
                  onClick={() => handleSelect(d)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-mono text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/50 font-medium",
                  )}
                >
                  <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{d}</span>
                  {d === "/" ? (
                    <span className="shrink-0 text-[10px] font-sans text-muted-foreground">
                      root
                    </span>
                  ) : null}
                  {isSelected ? <Check className="h-3 w-3 shrink-0 text-primary" /> : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ServiceSettings({
  service,
  onDeleted,
}: {
  service: Service;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const envId = useEnvId();
  const detail = useQuery({
    queryKey: ["service", service.id],
    queryFn: () => api<ServiceSettingsData>(`/services/${service.id}`),
  }).data?.settings;
  const [confirm, setConfirm] = useState(false);
  const save = async (settings: Record<string, unknown>) => {
    try {
      await api(`/services/${service.id}`, { method: "PATCH", body: { settings } });
      toast.success("Settings saved");
      void qc.invalidateQueries({ queryKey: ["service", service.id] });
    } catch (e) {
      toast.error(errMsg(e, "Could not save settings"));
    }
  };
  const del = async () => {
    try {
      await api(`/services/${service.id}`, { method: "DELETE" });
      toast.success(`${service.name} deleted`);
      await qc.invalidateQueries({ queryKey: ["canvas", envId] });
      onDeleted?.();
    } catch (e) {
      toast.error(errMsg(e, "Could not delete service"));
    }
  };
  const row = (label: string, body: React.ReactNode, hint?: string) => (
    <div className="flex items-start justify-between gap-6 px-4 py-3">
      <div>
        <p className="text-sm">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{body}</div>
    </div>
  );
  return (
    <div className="divide-y" key={detail ? "loaded" : "loading"}>
      {row(
        "Source",
        <span className="font-mono text-xs text-muted-foreground">{service.source}</span>,
      )}
      {row("Region", <span className="font-mono text-xs">{service.region}</span>)}
      {row(
        "Replicas",
        <span className="font-mono text-xs">{detail?.replicas ?? service.replicas}×</span>,
        "Traffic is balanced across replicas.",
      )}
      <ResourceLimits serviceId={service.id} />
      {service.kind !== "database"
        ? row(
            "Root directory",
            <RootDirectoryInput
              serviceId={service.id}
              defaultValue={detail?.rootDirectory}
              onSave={(rootDirectory) => save({ rootDirectory })}
            />,
            "Folder in the repo to build from.",
          )
        : null}
      {service.kind !== "database"
        ? row(
            "Public path",
            <Input
              defaultValue={detail?.basePath ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const n = v ? (v.startsWith("/") ? v : `/${v}`) : "";
                if (n !== (detail?.basePath ?? "")) save({ basePath: n || null });
              }}
              placeholder="/"
              className="h-7 w-56 font-mono text-xs"
            />,
            "Serve this service under a path, e.g. /api.",
          )
        : null}
      {service.kind !== "database"
        ? row(
            "Runtime version",
            <Input
              defaultValue={detail?.runtimeVersion ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (detail?.runtimeVersion ?? "")) save({ runtimeVersion: v || null });
              }}
              placeholder="auto-detect"
              className="h-7 w-56 font-mono text-xs"
            />,
            "Optional override, e.g. 20.x. Project requirements are still validated.",
          )
        : null}
      {row(
        "Start command",
        <Input
          defaultValue={detail?.startCommand ?? ""}
          onBlur={(e) =>
            e.target.value !== (detail?.startCommand ?? "") &&
            save({ startCommand: e.target.value || null })
          }
          placeholder="from image"
          className="h-7 w-56 font-mono text-xs"
        />,
      )}
      {row(
        "Healthcheck path",
        <Input
          defaultValue={detail?.healthcheckPath ?? ""}
          onBlur={(e) =>
            e.target.value !== (detail?.healthcheckPath ?? "") &&
            save({ healthcheckPath: e.target.value || null })
          }
          placeholder="/healthz"
          className="h-7 w-56 font-mono text-xs"
        />,
      )}
      {row(
        "Deploy on push",
        <Switch
          defaultChecked={detail?.autoDeploy ?? true}
          onCheckedChange={(v) => save({ autoDeploy: v })}
        />,
        "Auto-deploy commits to the tracked branch.",
      )}
      {row(
        "Sleep when idle",
        <Switch
          defaultChecked={detail?.sleepWhenIdle ?? false}
          onCheckedChange={(v) => save({ sleepWhenIdle: v })}
        />,
        "Stops after 10 min without traffic.",
      )}
      <div className="flex items-center justify-between bg-destructive/5 px-4 py-3">
        <p className="text-sm text-destructive">Delete service</p>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 text-xs"
          onClick={() => setConfirm(true)}
        >
          Delete
        </Button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {service.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the running container, its deployments and logs, variables,
              domains, volumes and their data, and any database backups. It can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={del}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
