import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { logos, type Kind, type LogoKey, type Service, type Status } from "@/lib/platform-data";

/* ── Active project / environment selection (persisted) ───────────── */

const KEY = "morline.workspace";
type Sel = { projectId: string | null; envId: string | null };
let sel: Sel = { projectId: null, envId: null };
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    sel = { ...sel, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    /* ignore */
  }
  const match = window.location.pathname.match(/\/project\/([^/?#]+)/);
  if (match?.[1]) {
    sel.projectId = match[1];
    try {
      localStorage.setItem(KEY, JSON.stringify(sel));
    } catch {
      /* ignore */
    }
  }
}
function set(next: Partial<Sel>) {
  sel = { ...sel, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(sel));
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}
const EMPTY: Sel = { projectId: null, envId: null };

export function selectProject(projectId: string, envId: string | null = null) {
  if (sel.projectId === projectId && (envId === null || sel.envId === envId)) return;
  set({ projectId, envId });
}
export function selectEnvironment(envId: string) {
  set({ envId });
}

export function useSelection() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => {
      load();
      if (typeof window !== "undefined") {
        const match = window.location.pathname.match(/\/project\/([^/?#]+)/);
        if (match?.[1] && sel.projectId !== match[1]) {
          sel.projectId = match[1];
        }
      }
      return sel;
    },
    () => EMPTY,
  );
}

/* ── API types ────────────────────────────────────────────────────── */

export type ApiProjectDetail = {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  defaultEnvironmentId: string | null;
  favorite: boolean;
  settings?: { prEnvironments?: boolean; spendLimitUsd?: number | null; defaultRegion?: string };
};
export type ApiEnvironment = {
  id: string;
  projectId: string;
  name: string;
  type: string;
  protected: boolean;
  serviceCount: number;
  createdAt: string;
};
export type ApiService = {
  id: string;
  environmentId: string;
  name: string;
  kind: Kind;
  logo: string;
  status: string;
  position: { x: number; y: number };
  source?: {
    type: string;
    display?: string;
    repo?: string | null;
    branch?: string | null;
    image?: string | null;
  };
  region?: string;
  replicas?: number;
  port?: number | null;
  primaryDomain?: string | null;
  volume?: { name: string; usedGb: number; sizeGb: number } | null;
  usage?: { cpu?: number; cpuPercent?: number; memoryMb?: number };
  activeDeployment?: { finishedAt?: string } | null;
  updatedAt?: string;
  createdAt?: string;
};
export type ApiConnection = {
  id: string;
  fromServiceId: string;
  toServiceId: string;
  label?: string;
  protocol?: string;
  port?: number | null;
};
export type ApiCanvas = {
  environmentId: string;
  revision: number;
  services: ApiService[];
  connections: ApiConnection[];
  viewport: { x: number; y: number; zoom: number };
};
export type ApiDeployment = {
  id: string;
  serviceId: string;
  serviceName?: string;
  state: string;
  trigger?: string;
  commit?: { sha: string; message: string; author?: string } | null;
  image?: string | null;
  createdBy?: { name: string } | null;
  rollbackable?: boolean;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationSec?: number | null;
  errorSummary?: string | null;
};
export type ApiLogLine = {
  id?: string;
  timestamp: string;
  serviceId?: string;
  serviceName?: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
};
export type ApiMetrics = {
  range: string;
  stepSec: number;
  series: {
    metric: string;
    unit: string;
    serviceId: string | null;
    points: [string, number | null][];
    current: number | null;
    limit: number | null;
  }[];
};
export type ApiVariable = {
  key: string;
  value: string;
  secret: boolean;
  isReference: boolean;
  source?: string;
};
export type ApiDomain = {
  id: string;
  host: string;
  serviceId?: string;
  serviceName?: string;
  kind: "custom" | "generated";
  status: string;
  targetPort?: number | null;
  tls?: { label?: string; status?: string };
};

/* ── Helpers ─────────────────────────────────────────────────────── */

export function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function serviceStatus(s: string): Status {
  if (["online", "active", "healthy", "running"].includes(s)) return "online";
  if (["sleeping", "stopped", "idle"].includes(s)) return "sleeping";
  if (["crashed", "failed", "unhealthy", "error"].includes(s)) return "crashed";
  if (["deploying", "building", "queued", "initializing", "starting", "restarting"].includes(s))
    return "deploying";
  // created / draft / not_deployed / pending_config / unknown: nothing has started yet.
  return "idle";
}

const logoAliases: Record<string, LogoKey> = {
  next: "nextjs",
  nextjs: "nextjs",
  "next.js": "nextjs",
  vite: "vite",
  react: "vite",
  vue: "vite",
  svelte: "vite",
  astro: "vite",
  node: "js",
  nodejs: "js",
  "node.js": "js",
  javascript: "js",
  typescript: "js",
  js: "js",
  ts: "js",
  bun: "js",
  deno: "js",
  express: "js",
  nestjs: "js",
  go: "go",
  golang: "go",
  python: "python",
  django: "python",
  flask: "python",
  fastapi: "python",
  rust: "rust",
  cargo: "rust",
  docker: "docker",
  dockerfile: "docker",
  postgres: "postgres",
  postgresql: "postgres",
  mysql: "mysql",
  mariadb: "mysql",
  mongo: "mongodb",
  mongodb: "mongodb",
  redis: "redis",
  sqlite: "sqlite",
  strapi: "strapi",
  n8n: "n8n",
  metabase: "metabase",
  terminal: "terminal",
  starter: "terminal",
  starters: "terminal",
  template: "terminal",
  templates: "terminal",
};

/** Most specific signal wins: framework → runtime/language → backend logo. Unknown → neutral icon, never Node. */
export function detectLogo(
  s: ApiService & { framework?: string | null; runtime?: string | null; language?: string | null },
): LogoKey {
  for (const c of [s.framework, s.runtime, s.language, s.logo]) {
    const k = c
      ? (logoAliases[c.toLowerCase()] ?? (c in logos ? (c as LogoKey) : undefined))
      : undefined;
    if (k && k !== "github") return k;
  }
  return "generic";
}

export function toService(s: ApiService): Service {
  const logo = detectLogo(s);
  const cpu = s.usage?.cpu ?? (s.usage?.cpuPercent ?? 0) / 100;
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    logo,
    status: serviceStatus(s.status),
    x: s.position?.x ?? 80,
    y: s.position?.y ?? 80,
    source: s.source?.display ?? s.source?.repo ?? s.source?.image ?? s.name,
    sourceType: s.source?.type,
    region: s.region ?? "us-east",
    replicas: s.replicas ?? 1,
    ...(s.port ? { port: s.port } : {}),
    ...(s.primaryDomain ? { domain: s.primaryDomain } : {}),
    ...(s.volume
      ? { volume: `${s.volume.name} · ${s.volume.usedGb} / ${s.volume.sizeGb} GB` }
      : {}),
    cpu,
    mem: s.usage?.memoryMb ?? 0,
    lastDeploy: timeAgo(s.activeDeployment?.finishedAt ?? s.updatedAt),
  };
}

/* ── Hooks ───────────────────────────────────────────────────────── */

export function useProject() {
  const { projectId } = useSelection();
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<ApiProjectDetail>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
}

export function useEnvironments() {
  const { projectId } = useSelection();
  return useQuery({
    queryKey: ["environments", projectId],
    queryFn: async () =>
      (await api<{ data: ApiEnvironment[] }>(`/projects/${projectId}/environments`)).data,
    enabled: !!projectId,
  });
}

/** Resolved active environment id: stored choice if valid, else project default, else first. */
export function useEnvId(): string | null {
  const { envId } = useSelection();
  const envs = useEnvironments().data;
  const project = useProject().data;
  if (!envs?.length) return envId ?? project?.defaultEnvironmentId ?? null;
  if (envId && envs.some((e) => e.id === envId)) return envId;
  return project?.defaultEnvironmentId ?? envs[0]!.id;
}

export function useCanvasData() {
  const envId = useEnvId();
  return useQuery({
    queryKey: ["canvas", envId],
    queryFn: () => api<ApiCanvas>(`/environments/${envId}/canvas`),
    enabled: !!envId,
    refetchInterval: 5000,
  });
}

export function useServices() {
  const envId = useEnvId();
  return useQuery({
    queryKey: ["services", envId],
    queryFn: async () =>
      (await api<{ data: ApiService[] }>(`/environments/${envId}/services`)).data.map(toService),
    enabled: !!envId,
    refetchInterval: 10000,
  });
}

export function useDeployments(serviceId?: string) {
  const envId = useEnvId();
  return useQuery({
    queryKey: ["deployments", envId, serviceId ?? null],
    queryFn: async () =>
      (
        await api<{ data: ApiDeployment[] }>(
          serviceId
            ? `/services/${serviceId}/deployments`
            : `/environments/${envId}/deployments?limit=50`,
        )
      ).data,
    enabled: !!envId,
    refetchInterval: 5000,
  });
}

export function useLogs(serviceId?: string) {
  const envId = useEnvId();
  return useQuery({
    queryKey: ["logs", envId, serviceId ?? null],
    queryFn: async () =>
      (
        await api<{ data: ApiLogLine[] }>(
          `/environments/${envId}/logs?limit=200${serviceId ? `&serviceId=${serviceId}` : ""}`,
        )
      ).data,
    enabled: !!envId,
    refetchInterval: 3000,
  });
}

export function useMetrics(range = "1h", serviceId?: string) {
  const envId = useEnvId();
  return useQuery({
    queryKey: ["metrics", envId, range, serviceId ?? null],
    queryFn: () =>
      api<ApiMetrics>(
        serviceId
          ? `/services/${serviceId}/metrics?range=${range}`
          : `/environments/${envId}/metrics?range=${range}`,
      ),
    enabled: !!envId,
    refetchInterval: 30000,
  });
}

export function useDomains() {
  const envId = useEnvId();
  return useQuery({
    queryKey: ["domains", envId],
    queryFn: async () => (await api<{ data: ApiDomain[] }>(`/environments/${envId}/domains`)).data,
    enabled: !!envId,
  });
}

export function useUsage() {
  const { projectId } = useSelection();
  return useQuery({
    queryKey: ["usage", projectId],
    queryFn: () =>
      api<{ spentUsd: number; estimatedUsd: number; limitUsd: number | null }>(
        `/projects/${projectId}/usage`,
      ),
    enabled: !!projectId,
  });
}
