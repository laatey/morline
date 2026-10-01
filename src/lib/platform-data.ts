import docker from "@/assets/stack/docker.svg";
import github from "@/assets/stack/github.svg";
import go from "@/assets/stack/go.svg";
import js from "@/assets/stack/js.svg";
import metabase from "@/assets/stack/metabase.svg";
import mongodb from "@/assets/stack/mongodb.svg";
import mysql from "@/assets/stack/mysql.svg";
import n8n from "@/assets/stack/n8n.svg";
import nextjs from "@/assets/stack/nextjs.svg";
import postgres from "@/assets/stack/postgresql.svg";
import python from "@/assets/stack/python.svg";
import redis from "@/assets/stack/redis.svg";
import rust from "@/assets/stack/rust.svg";
import sqlite from "@/assets/stack/sqlite.svg";
import strapi from "@/assets/stack/strapi.svg";
import vite from "@/assets/stack/vite.svg";

export const logos = { docker, github, go, js, metabase, mongodb, mysql, n8n, nextjs, postgres, python, redis, rust, sqlite, strapi, vite };
export type LogoKey = keyof typeof logos;

export type Status = "online" | "deploying" | "crashed" | "sleeping";
export type Kind = "app" | "database" | "worker" | "cron";

export interface Service {
  id: string;
  name: string;
  kind: Kind;
  logo: LogoKey;
  status: Status;
  x: number;
  y: number;
  source: string;
  sourceType?: string | undefined;
  region: string;
  replicas: number;
  port?: number;
  domain?: string;
  volume?: string;
  cpu: number; // vCPU in use
  mem: number; // MB in use
  lastDeploy: string;
}


export interface Edge {
  from: string;
  to: string;
  label: string;
}

export const project = { id: "harbor-api", name: "harbor-api", team: "Acme Labs" };
export const environments = ["production", "staging", "pr-214"] as const;

export const initialServices: Service[] = [
  { id: "web", name: "web", kind: "app", logo: "nextjs", status: "online", x: 80, y: 120, source: "acme/harbor-web · main", region: "eu-west", replicas: 2, port: 3000, domain: "harbor.acme.dev", cpu: 0.42, mem: 380, lastDeploy: "12m ago" },
  { id: "api", name: "api", kind: "app", logo: "go", status: "deploying", x: 420, y: 60, source: "acme/harbor-api · main", region: "eu-west", replicas: 3, port: 8080, domain: "api.acme.dev", cpu: 1.1, mem: 612, lastDeploy: "now" },
  { id: "worker", name: "queue-worker", kind: "worker", logo: "python", status: "online", x: 420, y: 300, source: "acme/harbor-api · workers/", region: "eu-west", replicas: 1, cpu: 0.3, mem: 240, lastDeploy: "2h ago" },
  { id: "pg", name: "postgres", kind: "database", logo: "postgres", status: "online", x: 780, y: 40, source: "postgres:16", region: "eu-west", replicas: 1, port: 5432, volume: "pg-data · 18.2 / 50 GB", cpu: 0.6, mem: 1024, lastDeploy: "9d ago" },
  { id: "redis", name: "redis", kind: "database", logo: "redis", status: "online", x: 780, y: 250, source: "redis:7-alpine", region: "eu-west", replicas: 1, port: 6379, volume: "redis-data · 0.4 / 5 GB", cpu: 0.08, mem: 96, lastDeploy: "9d ago" },
  { id: "cron", name: "nightly-report", kind: "cron", logo: "rust", status: "crashed", x: 80, y: 360, source: "acme/reports · main", region: "us-east", replicas: 1, cpu: 0, mem: 0, lastDeploy: "6h ago" },
];

export const initialEdges: Edge[] = [
  { from: "web", to: "api", label: "http :8080" },
  { from: "api", to: "pg", label: "tcp :5432" },
  { from: "api", to: "redis", label: "tcp :6379" },
  { from: "worker", to: "redis", label: "queue" },
  { from: "worker", to: "pg", label: "tcp :5432" },
  { from: "cron", to: "api", label: "http :8080" },
];

export const templates: { name: string; logo: LogoKey; kind: Kind; group: string; hint: string }[] = [
  { name: "GitHub repository", logo: "github", kind: "app", group: "Source", hint: "Deploy on every push" },
  { name: "Docker image", logo: "docker", kind: "app", group: "Source", hint: "Any public or private image" },
  { name: "PostgreSQL", logo: "postgres", kind: "database", group: "Databases", hint: "With persistent volume" },
  { name: "Redis", logo: "redis", kind: "database", group: "Databases", hint: "In-memory store" },
  { name: "MySQL", logo: "mysql", kind: "database", group: "Databases", hint: "8.x with volume" },
  { name: "MongoDB", logo: "mongodb", kind: "database", group: "Databases", hint: "Document store" },
  { name: "SQLite + Litestream", logo: "sqlite", kind: "database", group: "Databases", hint: "Replicated file DB" },
  { name: "Next.js", logo: "nextjs", kind: "app", group: "Starters", hint: "SSR web app" },
  { name: "Vite static site", logo: "vite", kind: "app", group: "Starters", hint: "Served from the edge" },
  { name: "Node service", logo: "js", kind: "app", group: "Starters", hint: "Express / Fastify" },
  { name: "Go service", logo: "go", kind: "app", group: "Starters", hint: "Single binary" },
  { name: "Python worker", logo: "python", kind: "worker", group: "Starters", hint: "Celery / RQ" },
  { name: "Rust service", logo: "rust", kind: "app", group: "Starters", hint: "Axum starter" },
  { name: "n8n", logo: "n8n", kind: "app", group: "Apps", hint: "Workflow automation" },
  { name: "Metabase", logo: "metabase", kind: "app", group: "Apps", hint: "BI dashboards" },
  { name: "Strapi", logo: "strapi", kind: "app", group: "Apps", hint: "Headless CMS" },
];

export type DeployState = "active" | "building" | "failed" | "removed" | "queued";
export interface Deployment {
  id: string;
  service: string;
  commit: string;
  sha: string;
  author: string;
  state: DeployState;
  when: string;
  duration: string;
}

export const deployments: Deployment[] = [
  { id: "d1", service: "api", commit: "feat(billing): prorate seat changes mid-cycle", sha: "a41c9e2", author: "mensah", state: "building", when: "just now", duration: "0:48" },
  { id: "d2", service: "web", commit: "fix: hydrate env picker before first paint", sha: "7be03f1", author: "ada", state: "active", when: "12m ago", duration: "1:32" },
  { id: "d3", service: "api", commit: "chore: bump pgx to v5.6", sha: "c90d11a", author: "mensah", state: "active", when: "1h ago", duration: "0:57" },
  { id: "d4", service: "worker", commit: "perf: batch webhook retries", sha: "3f2aa70", author: "kofi", state: "active", when: "2h ago", duration: "0:41" },
  { id: "d5", service: "cron", commit: "feat: weekly CSV export", sha: "e11b4c8", author: "ada", state: "failed", when: "6h ago", duration: "0:19" },
  { id: "d6", service: "web", commit: "style: tighten table density", sha: "0d5e9b2", author: "ada", state: "removed", when: "1d ago", duration: "1:28" },
  { id: "d7", service: "api", commit: "fix: idempotency key collisions", sha: "88a1f03", author: "kofi", state: "removed", when: "2d ago", duration: "1:02" },
  { id: "d8", service: "worker", commit: "feat: dead-letter queue", sha: "b72c6de", author: "kofi", state: "removed", when: "3d ago", duration: "0:44" },
];

export const variablesFor = (id: string) => {
  const base = [
    { key: "NODE_ENV", value: "production", ref: false },
    { key: "LOG_LEVEL", value: "info", ref: false },
  ];
  if (id === "pg") return [{ key: "POSTGRES_USER", value: "harbor", ref: false }, { key: "POSTGRES_PASSWORD", value: "p9Xk2mQw7", ref: false }, { key: "PGDATA", value: "/var/lib/postgresql/data", ref: false }];
  if (id === "redis") return [{ key: "REDIS_PASSWORD", value: "r3d1s-s3cr3t", ref: false }];
  return [
    ...base,
    { key: "DATABASE_URL", value: "${{ postgres.DATABASE_URL }}", ref: true },
    { key: "REDIS_URL", value: "${{ redis.REDIS_URL }}", ref: true },
    { key: "API_SECRET_KEY", value: "sk_live_4f8a9b0c1d2e", ref: false },
    { key: "STRIPE_WEBHOOK_SECRET", value: "whsec_19ab82cd", ref: false },
    { key: "PORT", value: "8080", ref: false },
  ];
};

export type LogLevel = "info" | "warn" | "error" | "debug";
export const logLines: { t: string; svc: string; level: LogLevel; msg: string }[] = [
  { t: "12:48:02.114", svc: "api", level: "info", msg: "build: go build -o /app ./cmd/server (cached 34 layers)" },
  { t: "12:48:05.902", svc: "api", level: "info", msg: "healthcheck: waiting for GET /healthz on :8080" },
  { t: "12:48:06.330", svc: "web", level: "info", msg: "GET /dashboard 200 38ms" },
  { t: "12:48:06.871", svc: "worker", level: "debug", msg: "picked job webhook.retry id=8812 attempt=2" },
  { t: "12:48:07.004", svc: "api", level: "info", msg: "listening on 0.0.0.0:8080 (3 replicas)" },
  { t: "12:48:07.562", svc: "web", level: "info", msg: "GET /api/projects 200 112ms" },
  { t: "12:48:08.019", svc: "worker", level: "warn", msg: "stripe responded 429, backing off 2s" },
  { t: "12:48:09.340", svc: "pg", level: "info", msg: "checkpoint complete: wrote 412 buffers (2.5%)" },
  { t: "12:48:10.118", svc: "cron", level: "error", msg: "panic: column \"exported_at\" does not exist" },
  { t: "12:48:10.119", svc: "cron", level: "error", msg: "process exited with code 101" },
  { t: "12:48:11.702", svc: "api", level: "info", msg: "POST /v1/invoices 201 64ms" },
  { t: "12:48:12.450", svc: "redis", level: "info", msg: "DB saved on disk" },
  { t: "12:48:13.008", svc: "web", level: "info", msg: "GET /settings 200 21ms" },
];

/** Deterministic pseudo-random series for charts. */
export function series(seed: number, n = 48, base = 40, amp = 25) {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    const r = Math.sin(seed * 999 + i * 12.9898) * 43758.5453;
    v += (r - Math.floor(r) - 0.5) * amp * 0.4;
    v = Math.max(4, Math.min(base + amp, v));
    out.push(v);
  }
  return out;
}

export const domains = [
  { host: "harbor.acme.dev", service: "web", kind: "custom", status: "active", tls: "Valid · renews in 61d" },
  { host: "api.acme.dev", service: "api", kind: "custom", status: "active", tls: "Valid · renews in 61d" },
  { host: "web-prod-8f2a.morline.space", service: "web", kind: "generated", status: "active", tls: "Managed" },
  { host: "status.acme.dev", service: "web", kind: "custom", status: "pending", tls: "Waiting for CNAME" },
];

export const workspaces = [
  { id: "acme", name: "Acme Labs", plan: "Pro" },
  { id: "personal", name: "Personal", plan: "Hobby" },
];

export const notifications = [
  { id: "n1", tone: "error", title: "nightly-report crashed", body: "Exited with code 101 after migration mismatch.", when: "6h ago", unread: true, to: "/logs" },
  { id: "n2", tone: "info", title: "api is deploying", body: "a41c9e2 · prorate seat changes mid-cycle", when: "just now", unread: true, to: "/deployments" },
  { id: "n3", tone: "warn", title: "Spend at 38% of limit", body: "$18.40 of $50 this month.", when: "1d ago", unread: false, to: "/settings" },
  { id: "n4", tone: "info", title: "ada joined Acme Labs", body: "Invited as admin by mensah.", when: "3d ago", unread: false, to: "/team" },
] as const;

export const members = [
  { name: "Bright Mensah", email: "mensah@acme.dev", role: "Owner", last: "now" },
  { name: "Ada Owusu", email: "ada@acme.dev", role: "Admin", last: "12m ago" },
  { name: "Kofi Asante", email: "kofi@acme.dev", role: "Deployer", last: "2h ago" },
];
export const invites = [{ email: "esi@acme.dev", role: "Viewer", sent: "2d ago" }];

export const activity = [
  { who: "mensah", what: "triggered a deploy of", target: "api", detail: "a41c9e2", when: "just now", kind: "deploy" },
  { who: "ada", what: "deployed", target: "web", detail: "7be03f1", when: "12m ago", kind: "deploy" },
  { who: "kofi", what: "updated 2 variables on", target: "queue-worker", detail: "STRIPE_WEBHOOK_SECRET, LOG_LEVEL", when: "1h ago", kind: "config" },
  { who: "system", what: "marked crashed", target: "nightly-report", detail: "exit 101", when: "6h ago", kind: "alert" },
  { who: "ada", what: "added domain", target: "status.acme.dev", detail: "pending CNAME", when: "1d ago", kind: "network" },
  { who: "mensah", what: "created environment", target: "pr-214", detail: "from staging", when: "2d ago", kind: "env" },
  { who: "ada", what: "invited", target: "esi@acme.dev", detail: "Viewer", when: "2d ago", kind: "team" },
] as const;

export const repos = [
  { name: "acme/harbor-web", branch: "main", linked: "web", private: true },
  { name: "acme/harbor-api", branch: "main", linked: "api, queue-worker", private: true },
  { name: "acme/reports", branch: "main", linked: "nightly-report", private: true },
  { name: "acme/docs", branch: "main", linked: null, private: false },
];

export const buildSteps = [
  { name: "Clone acme/harbor-api@a41c9e2", time: "1.2s", state: "done" },
  { name: "Detect: Go 1.22 (go.mod)", time: "0.3s", state: "done" },
  { name: "Restore cache (34 layers)", time: "4.8s", state: "done" },
  { name: "go build -o /app ./cmd/server", time: "21.6s", state: "done" },
  { name: "Push image", time: "8.1s", state: "done" },
  { name: "Healthcheck GET /healthz", time: "…", state: "running" },
] as const;
