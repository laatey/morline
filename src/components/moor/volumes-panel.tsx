import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HardDrive, Loader, Plus, Trash } from "fluid-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type ApiError } from "@/lib/api";
import type { Service } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

export type Volume = {
  id: string;
  name?: string | null;
  mountPath: string;
  sizeGb: number;
  usedGb?: number | null;
};

export function useServiceVolumes(serviceId: string) {
  return useQuery({
    queryKey: ["volumes", serviceId],
    queryFn: async () => {
      try {
        const result = await api<{ data?: Volume[] } | Volume[]>(`/services/${serviceId}/volumes`);
        return Array.isArray(result) ? result : (result.data ?? []);
      } catch (error) {
        if ((error as ApiError).status === 404) return [];
        throw error;
      }
    },
    enabled: !serviceId.startsWith("tmp_"),
    staleTime: 30_000,
    retry: false,
  });
}

export function VolumesPanel({
  service,
  initialAdding = false,
}: {
  service: Service;
  initialAdding?: boolean;
}) {
  const qc = useQueryClient();
  const key = ["volumes", service.id];
  const { data: volumes = [], isLoading, isError } = useServiceVolumes(service.id);
  const setCache = (fn: (v: Volume[]) => Volume[]) =>
    qc.setQueryData<Volume[]>(key, (old) => fn(old ?? []));
  const refresh = () => void qc.invalidateQueries({ queryKey: key });

  const [adding, setAdding] = useState(initialAdding);
  const [mountPath, setMountPath] = useState("");
  const [sizeGb, setSizeGb] = useState("1");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSize, setEditSize] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const attach = async () => {
    const path = mountPath.trim();
    const size = Math.max(0.1, Math.min(500, Number(sizeGb) || 1));
    if (!path) return;
    if (!path.startsWith("/")) {
      toast.error("Mount path must start with /");
      return;
    }
    setBusy(true);
    const tempId = `tmp_${crypto.randomUUID()}`;
    setCache((v) => [...v, { id: tempId, mountPath: path, sizeGb: size }]);
    try {
      await api(`/services/${service.id}/volumes`, {
        method: "POST",
        body: { mountPath: path, sizeGb: size },
      });
      toast.success("Volume attached", {
        description: `${path} · ${size} GB — applied on next deploy`,
      });
      setAdding(false);
      setMountPath("");
      setSizeGb("1");
    } catch (e) {
      toast.error((e as ApiError).message ?? "Could not attach the volume");
      setCache((v) => v.filter((x) => x.id !== tempId));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const resize = async (vol: Volume, next: number) => {
    const size = Math.max(0.1, Math.min(500, next));
    setEditingId(null);
    if (size === vol.sizeGb) return;
    setCache((v) => v.map((x) => (x.id === vol.id ? { ...x, sizeGb: size } : x)));
    try {
      await api(`/volumes/${vol.id}`, { method: "PATCH", body: { sizeGb: size } });
      refresh();
      toast.success("Volume resized", { description: `${vol.mountPath} · ${size} GB` });
    } catch (e) {
      toast.error((e as ApiError).message ?? "Could not resize the volume");
      setCache((v) => v.map((x) => (x.id === vol.id ? { ...x, sizeGb: vol.sizeGb } : x)));
    }
  };

  const remove = async (vol: Volume) => {
    setDeletingId(null);
    setCache((v) => v.filter((x) => x.id !== vol.id));
    try {
      await api(`/volumes/${vol.id}`, { method: "DELETE" });
      toast.success("Volume removed", { description: "Data is deleted with the next deploy" });
    } catch (e) {
      toast.error((e as ApiError).message ?? "Could not remove the volume");
      setCache((v) => [...v, vol]);
    }
  };

  return (
    <div className="divide-y">
      <div className="px-4 py-3">
        <p className="label-caps">Attached volumes</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Volumes keep files between deploys. Resizes grow instantly; shrinking keeps data until the
          next deploy.
        </p>
        {isError ? (
          <p className="mt-3 text-xs text-destructive">
            Could not load volumes.{" "}
            <Button variant="ghost" size="sm" onClick={refresh}>
              Retry
            </Button>
          </p>
        ) : isLoading ? (
          <div className="mt-3 space-y-2">
            <div className="h-9 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted/40" />
          </div>
        ) : volumes.length ? (
          <div className="mt-2 space-y-1.5">
            {volumes.map((vol) => (
              <div key={vol.id} className="rounded-lg border bg-surface/50 px-2.5 py-2">
                {deletingId === vol.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      Delete <span className="font-mono text-foreground">{vol.mountPath}</span> and
                      its data?
                    </span>
                    <span className="ml-auto flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => setDeletingId(null)}
                      >
                        Keep
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        onClick={() => void remove(vol)}
                      >
                        Delete
                      </Button>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 font-mono text-xs">
                    <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-foreground">{vol.mountPath}</span>
                    {vol.usedGb != null ? (
                      <span className="hidden shrink-0 text-muted-foreground sm:inline">
                        {vol.usedGb.toFixed(1)} /{" "}
                      </span>
                    ) : null}
                    {editingId === vol.id ? (
                      <input
                        autoFocus
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={editSize}
                        onChange={(e) => setEditSize(e.target.value)}
                        onBlur={() => void resize(vol, Number(editSize))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void resize(vol, Number(editSize));
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-6 w-16 shrink-0 rounded-md border bg-background px-1.5 text-right font-mono text-xs outline-none focus:border-primary"
                        aria-label="New size in GB"
                      />
                    ) : (
                      <button
                        title="Click to resize"
                        onClick={() => {
                          setEditingId(vol.id);
                          setEditSize(String(vol.sizeGb));
                        }}
                        className="shrink-0 rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {vol.sizeGb} GB
                      </button>
                    )}
                    <button
                      aria-label={`Remove volume ${vol.mountPath}`}
                      onClick={() => setDeletingId(vol.id)}
                      className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed px-3 py-4 text-center">
            <p className="text-sm font-medium">No volumes attached</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Attach one to keep uploads, databases or caches alive across deploys.
            </p>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        {adding ? (
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Attach a volume</p>
            <div className="mt-2.5 grid grid-cols-[1fr_88px] gap-2">
              <div>
                <label className="label-caps" htmlFor="vol-mount">
                  Mount path
                </label>
                <Input
                  id="vol-mount"
                  value={mountPath}
                  onChange={(e) => setMountPath(e.target.value)}
                  placeholder="/data"
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>
              <div>
                <label className="label-caps" htmlFor="vol-size">
                  GB
                </label>
                <Input
                  id="vol-size"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={sizeGb}
                  onChange={(e) => setSizeGb(e.target.value)}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={busy}
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={busy || !mountPath.trim()}
                onClick={() => void attach()}
              >
                {busy ? <Loader className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Attach
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Attach volume
          </Button>
        )}
      </div>
    </div>
  );
}
