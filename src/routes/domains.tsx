import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { Copy, Plus, Trash, ExternalLink, Info } from "fluid-icons/react";
import cloudflareLogo from "@/assets/stack/cloudflare.svg";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { useCanvasData, useDomains, useEnvId, useServices, type ApiDomain } from "@/lib/workspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/domains")({
  head: () => ({
    meta: [
      { title: "Networking & domains — Morline" },
      {
        name: "description",
        content: "Custom domains, TLS certificates and private service networking.",
      },
      { property: "og:title", content: "Networking & domains — Morline" },
      {
        property: "og:description",
        content: "Custom domains, TLS certificates and private service networking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DomainsPage,
});

type DnsRecord = { type: string; name: string; value: string; verified?: boolean };
type DnsProviderInfo = {
  id: "cloudflare";
  name: string;
  apex: string;
  subdomain: string;
  autoConfigUrl: string;
};
type DomainFull = ApiDomain & {
  dnsRecords?: DnsRecord[];
  error?: string | null;
  dnsProvider?: DnsProviderInfo | null;
};

function parseApex(host: string) {
  const parts = host.toLowerCase().trim().split(".");
  if (parts.length < 2) return { apex: host, subdomain: "@" };
  const multiPartTlds = ["co.uk", "com.br", "co.nz", "com.au", "org.uk", "gov.uk"];
  const lastTwo = parts.slice(-2).join(".");
  const apex =
    parts.length > 2 && multiPartTlds.includes(lastTwo)
      ? parts.slice(-3).join(".")
      : parts.slice(-2).join(".");
  const subdomain = host === apex ? "@" : host.slice(0, -(apex.length + 1));
  return { apex, subdomain: subdomain || "@" };
}

async function checkCloudflareDns(host: string): Promise<boolean> {
  try {
    const { apex } = parseApex(host);
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(apex)}&type=NS`,
      {
        headers: { accept: "application/dns-json" },
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { Answer?: Array<{ data?: string }> };
    return (data.Answer ?? []).some((a) => (a.data ?? "").toLowerCase().includes("cloudflare.com"));
  } catch {
    return false;
  }
}

function DomainsPage() {
  const qc = useQueryClient();
  const envId = useEnvId();
  const domainsQ = useDomains();
  const list = (domainsQ.data ?? []) as DomainFull[];
  const services = useServices().data ?? [];
  const canvas = useCanvasData().data;
  const apps = services.filter((s) => s.kind !== "database");
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState("");
  const [svc, setSvc] = useState<string | null>(null);
  const [created, setCreated] = useState<DomainFull | null>(null);
  const [busy, setBusy] = useState(false);
  const [cfDetected, setCfDetected] = useState(false);
  const valid = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host);
  const target = svc ?? apps[0]?.id ?? null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["domains", envId] });
  const reset = () => {
    setOpen(false);
    setCreated(null);
    setHost("");
    setSvc(null);
    setCfDetected(false);
  };

  const currentHost = created?.host ?? host;

  useEffect(() => {
    if (!created?.host) {
      setCfDetected(false);
      return;
    }
    if (created.dnsProvider?.id === "cloudflare") {
      setCfDetected(true);
      return;
    }
    let active = true;
    void checkCloudflareDns(created.host).then((isCf) => {
      if (active) setCfDetected(isCf);
    });
    return () => {
      active = false;
    };
  }, [created]);

  const create = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const d = await api<DomainFull>(`/services/${target}/domains`, {
        method: "POST",
        body: { kind: "custom", host },
      });
      setCreated(d);
      void refresh();
    } catch (e) {
      toast.error((e as ApiError).message ?? "Could not add domain");
    } finally {
      setBusy(false);
    }
  };
  const verify = async (id: string, h: string) => {
    try {
      const d = await api<DomainFull>(`/domains/${id}/verify`, { method: "POST" });
      if (d.status === "active") {
        toast.success(`${h} verified and active`);
        void qc.invalidateQueries({ queryKey: ["canvas", envId] });
        void qc.invalidateQueries({ queryKey: ["services", envId] });
      } else {
        toast.error(
          d.error ??
            `DNS not yet pointing to edge.morline.space — point a CNAME to edge.morline.space and try again`,
        );
      }
    } catch (e) {
      toast.error((e as ApiError).message ?? "Verification failed");
    }
    void refresh();
  };
  const remove = async (id: string, h: string) => {
    const key = ["domains", envId];
    const prev = qc.getQueryData(key);
    qc.setQueryData(key, (old: unknown) =>
      Array.isArray(old) ? old.filter((d: { id: string }) => d.id !== id) : old,
    );
    try {
      await api(`/domains/${id}`, { method: "DELETE" });
      toast.success(`${h} removed`);
      void qc.invalidateQueries({ queryKey: ["canvas", envId] });
      void qc.invalidateQueries({ queryKey: ["services", envId] });
    } catch (e) {
      qc.setQueryData(key, prev);
      toast.error((e as ApiError).message ?? "Could not remove domain");
    }
    void refresh();
  };
  const name = (id: string) => services.find((s) => s.id === id);
  const records = created?.dnsRecords?.length
    ? created.dnsRecords
    : [{ type: "CNAME", name: host.split(".")[0] ?? host, value: "edge.morline.space" }];

  const openCloudflareAutoConfig = () => {
    toast.success("Opening Cloudflare dashboard...");
    window.open("https://dash.cloudflare.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <WorkspaceShell title="Networking">
      <div className="scroll-area h-full overflow-y-auto">
        <div className="flex items-end justify-between border-b px-4 py-5">
          <div>
            <h1 className="text-xl font-semibold">Networking</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Public domains and the private network your services talk over.
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!apps.length}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Custom domain
          </Button>
        </div>
        <p className="label-caps px-4 pb-2 pt-5">Domains</p>
        <ul className="divide-y border-y">
          {list.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  d.status === "active"
                    ? "bg-score"
                    : d.status === "failed"
                      ? "bg-destructive"
                      : "bg-score-mid animate-pulse",
                )}
              />
              <a
                href={`https://${d.host}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm hover:underline"
              >
                {d.host}
              </a>
              <span className="rounded-sm border px-1 font-mono text-[10px] text-muted-foreground">
                {d.kind}
              </span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                → {d.serviceName ?? name(d.serviceId ?? "")?.name}
              </span>
              <span
                className={cn(
                  "w-44 text-right text-xs",
                  d.status === "active"
                    ? "text-muted-foreground"
                    : d.status === "failed"
                      ? "text-destructive"
                      : "text-score-mid",
                )}
              >
                {d.error ?? d.tls?.label ?? d.status}
              </span>
              {d.status !== "active" ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCreated(d);
                      setOpen(true);
                    }}
                  >
                    Configure DNS
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => verify(d.id, d.host)}
                  >
                    Check DNS
                  </Button>
                </div>
              ) : null}
              <button
                aria-label={`Remove ${d.host}`}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive cursor-pointer"
                onClick={() => remove(d.id, d.host)}
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {domainsQ.isLoading ? (
            <li aria-busy className="space-y-2 px-4 py-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-md bg-muted/60" />
              ))}
            </li>
          ) : !list.length ? (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              No public domains yet. Generate one from a service's Network tab, or add your own.
            </li>
          ) : null}
        </ul>
        <p className="label-caps px-4 pb-2 pt-6">Private network</p>
        <ul className="divide-y border-y font-mono text-xs">
          {(canvas?.connections ?? []).map((c) => {
            const to = name(c.toServiceId);
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-28 truncate">{name(c.fromServiceId)?.name}</span>
                <span className="text-muted-foreground">──{c.label ?? c.protocol}──▶</span>
                <span>
                  {to?.name}.morline.internal{to?.port ? `:${to.port}` : ""}
                </span>
              </li>
            );
          })}
          {!canvas?.connections.length ? (
            <li className="px-4 py-4 font-sans text-sm text-muted-foreground">
              No connections between services yet.
            </li>
          ) : null}
        </ul>
      </div>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{!created ? "Add custom domain" : "Configure DNS"}</DialogTitle>
            <DialogDescription>
              {!created
                ? "Point a domain you own at one of your services."
                : "Add these records at your DNS provider, then check."}
            </DialogDescription>
          </DialogHeader>
          {!created ? (
            <div className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Domain
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value.toLowerCase().trim())}
                  placeholder="app.example.com"
                  className="mt-1 h-8 font-mono text-sm"
                />
              </label>
              {host && !valid ? (
                <p className="text-xs text-destructive">Enter a full domain like app.example.com</p>
              ) : null}
              <div className="text-xs text-muted-foreground">
                Service
                <div className="mt-1 flex flex-wrap gap-1">
                  {apps.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSvc(s.id)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-xs",
                        target === s.id && "border-primary text-foreground",
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs text-amber-500">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  In Cloudflare, turn the proxy toggle <strong>OFF</strong> (DNS only / grey cloud).
                </span>
              </p>

              <div className="rounded-md border font-mono text-xs overflow-hidden">
                <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1.2fr)] gap-3 bg-muted/40 px-3.5 py-2 font-medium text-muted-foreground border-b">
                  <span>Type</span>
                  <span>Name</span>
                  <span>Value</span>
                </div>
                <div className="divide-y">
                  {records.map((r) => (
                    <div
                      key={r.type + r.name}
                      className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1.2fr)] gap-3 items-start px-3.5 py-2.5"
                    >
                      <span className="font-semibold text-foreground/90">{r.type}</span>
                      <div className="flex items-start justify-between gap-1.5 min-w-0">
                        <span className="break-all select-all leading-relaxed">{r.name}</span>
                        <button
                          aria-label={`Copy ${r.name}`}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5 mt-0.5 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard?.writeText(r.name);
                            toast("Copied");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-start justify-between gap-1.5 min-w-0">
                        <span className="break-all select-all leading-relaxed">{r.value}</span>
                        <button
                          aria-label={`Copy ${r.value}`}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5 mt-0.5 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard?.writeText(r.value);
                            toast("Copied");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {!created ? (
              <Button size="sm" disabled={!valid || !target || busy} onClick={create}>
                {busy ? "Adding…" : "Continue"}
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={reset}>
                  Later
                </Button>
                {cfDetected ? (
                  <Button
                    size="sm"
                    className="bg-[#f48120] hover:bg-[#e06f10] text-white font-medium text-xs gap-1.5 h-8 px-3 shadow-sm transition-all cursor-pointer"
                    onClick={openCloudflareAutoConfig}
                  >
                    <img src={cloudflareLogo} alt="" className="h-3.5 w-auto brightness-0 invert" />
                    Configure in Cloudflare
                    <ExternalLink className="h-3 w-3 ml-0.5 opacity-90" />
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  onClick={() => {
                    void verify(created.id, created.host);
                    reset();
                  }}
                >
                  I've added the records
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
