import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Boxes, Database, HardDrive, Terminal, GitBranch, Network, Shield, Cpu } from "lucide-react";
import { Mark } from "@/components/moor/workspace-shell";
import pg from "@/assets/stack/postgresql.svg";
import redis from "@/assets/stack/redis.svg";
import next from "@/assets/stack/nextjs.svg";
import go from "@/assets/stack/go.svg";
import py from "@/assets/stack/python.svg";
import docker from "@/assets/stack/docker.svg";
import rust from "@/assets/stack/rust.svg";
import mongo from "@/assets/stack/mongodb.svg";
import {
  HeroStackVisual,
  CanvasSchematic,
  DatabaseSchematic,
  VolumeSchematic,
  CliSchematic,
} from "@/components/landing/visuals";
import {
  ArchitectureBand,
  GlobalNetworkBand,
  ObservabilityBand,
  LightContrastBand,
  ClosingCtaAndFooter,
} from "@/components/landing/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "theme-color", content: "oklch(0.272 0.001 106)" },
      { title: "Morline — Deploy the parts. See the whole." },
      {
        name: "description",
        content:
          "Morline deploys apps, databases and workers into one connected workspace where every relationship stays visible.",
      },
      { property: "og:title", content: "Morline — Deploy the parts. See the whole." },
      {
        property: "og:description",
        content: "Apps, databases and workers in one connected, visible workspace.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://morline.space/" },
      { property: "og:site_name", content: "Morline" },
      { property: "og:image", content: "https://morline.space/og.jpg" },
      { property: "og:image:secure_url", content: "https://morline.space/og.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Morline — Deploy the parts. See the whole." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://morline.space/og.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://morline.space/" }],
  }),
  component: MarketingPage,
});

const stacks = [
  { name: "Next.js", src: next },
  { name: "Go", src: go },
  { name: "Python", src: py },
  { name: "Rust", src: rust },
  { name: "Docker", src: docker },
  { name: "PostgreSQL", src: pg },
  { name: "Redis", src: redis },
  { name: "MongoDB", src: mongo },
];

type CapabilityId = "canvas" | "databases" | "volumes" | "cli";

const capabilities: Array<{
  id: CapabilityId;
  label: string;
  icon: typeof Boxes;
  title: string;
  summary: string;
  points: Array<{ icon: typeof GitBranch; title: string; body: string }>;
}> = [
  {
    id: "canvas",
    label: "Canvas",
    icon: Boxes,
    title: "Your whole architecture, live on one surface",
    summary: "Deploy repos, images, and templates onto a spatial canvas where every service relationship stays visible.",
    points: [
      { icon: GitBranch, title: "GitHub & public URLs", body: "Connect any repository or deploy straight from a public Git URL or container registry." },
      { icon: Network, title: "Private networking", body: "Services discover each other over internal DNS with zero firewall wrangling." },
      { icon: Cpu, title: "Per-service inspector", body: "Open deployments, logs, variables, and metrics in place without losing your map." },
    ],
  },
  {
    id: "databases",
    label: "Databases",
    icon: Database,
    title: "Managed data stores that fit the rest of your stack",
    summary: "Spin up Postgres, MySQL, MongoDB, or Redis in seconds with dedicated panels for data, backups, and credentials.",
    points: [
      { icon: Database, title: "One-click provisioning", body: "Ready-to-connect instances with private URLs injected into sibling services." },
      { icon: Shield, title: "Automated snapshots", body: "Scheduled backups and point-in-time recovery built into the database panel." },
      { icon: Network, title: "Live data & metrics", body: "Inspect tables, connections, and storage usage without leaving the workspace." },
    ],
  },
  {
    id: "volumes",
    label: "Volumes",
    icon: HardDrive,
    title: "Persistent storage attached right where it belongs",
    summary: "Mount fast NVMe volumes beneath any service on the canvas so stateful workloads survive every redeploy.",
    points: [
      { icon: HardDrive, title: "Stacked on the canvas", body: "See mounted paths and capacity directly under the service that owns them." },
      { icon: Cpu, title: "Online resizing", body: "Expand volume capacity as your data grows without recreating the service." },
      { icon: Shield, title: "Isolated per environment", body: "Staging and production keep separate volumes with clean lifecycle controls." },
    ],
  },
  {
    id: "cli",
    label: "CLI & MCP",
    icon: Terminal,
    title: "Built for terminals and coding agents",
    summary: "Authenticate with OAuth device flow from your shell or connect an MCP client to inspect deploys and logs safely.",
    points: [
      { icon: Terminal, title: "OAuth device login", body: "Scoped user tokens with no long-lived API keys pasted into config files." },
      { icon: Shield, title: "Redacted by default", body: "Secret variable values stay masked when agents or teammates inspect environments." },
      { icon: GitBranch, title: "Deploy from anywhere", body: "Trigger builds, tail logs, and check health straight from your local workflow." },
    ],
  },
];

function MarketingPage() {
  const [activeCap, setActiveCap] = useState<CapabilityId>("canvas");
  const current = capabilities.find((c) => c.id === activeCap) ?? capabilities[0]!;

  useEffect(() => {
    document.documentElement.style.backgroundColor = "oklch(0.115 0.004 260)";
    document.body.style.backgroundColor = "oklch(0.115 0.004 260)";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "oklch(0.115 0.004 260)");
  }, []);

  return (
    <div className="landing-shell min-h-screen overflow-x-hidden selection:bg-[var(--lp-accent)] selection:text-[var(--lp-bg)]">
      {/* Minimal sticky navigation */}
      <header className="sticky top-0 z-40 border-b border-[var(--lp-border)] bg-[var(--lp-bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-[var(--lp-fg)]">
            <Mark className="h-4 w-4" /> morline<span className="text-[var(--lp-accent)]">.</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[var(--lp-muted)] md:flex">
            <a href="#product" className="transition-colors hover:text-[var(--lp-fg)]">Product</a>
            <a href="#architecture" className="transition-colors hover:text-[var(--lp-fg)]">Architecture</a>
            <a href="#infrastructure" className="transition-colors hover:text-[var(--lp-fg)]">Network</a>
            <a href="#observability" className="transition-colors hover:text-[var(--lp-fg)]">Observability</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-fg)]">
              Sign in
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center rounded-full bg-[var(--lp-fg)] px-4 py-1.5 text-sm font-medium text-[var(--lp-bg)] transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl md:text-7xl">
            Deploy the parts.{" "}
            <span className="text-[var(--lp-accent)]">See the whole.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--lp-muted)] sm:text-lg">
            Cloud infrastructure for teams that ship apps, databases, and workers together on one connected canvas.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--lp-fg)] px-5 py-2.5 text-sm font-medium text-[var(--lp-bg)] transition-opacity hover:opacity-90"
            >
              Start deploying <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-full border border-[var(--lp-border-strong)] px-5 py-2.5 text-sm text-[var(--lp-fg)] transition-colors hover:bg-[var(--lp-card)]"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-12 px-4 md:mt-16">
          <HeroStackVisual />
        </div>
      </section>

      {/* Product capabilities */}
      <section id="product" className="border-t border-[var(--lp-border)] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--lp-accent)]">Product</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Cloud infrastructure that won’t box you in
          </h2>

          <div className="mt-14 grid gap-10 lg:grid-cols-[180px_1fr_1.15fr] lg:items-start">
            {/* Capability selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {capabilities.map(({ id, label, icon: Icon }) => {
                const active = id === activeCap;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveCap(id)}
                    className="inline-flex shrink-0 items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left text-sm transition-colors"
                    style={{
                      borderColor: active ? "var(--lp-border-strong)" : "transparent",
                      backgroundColor: active ? "var(--lp-card)" : "transparent",
                      color: active ? "var(--lp-fg)" : "var(--lp-muted)",
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: active ? "var(--lp-accent)" : "var(--lp-subtle)" }} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Active capability details */}
            <div>
              <h3 className="font-display text-2xl font-medium leading-snug text-[var(--lp-fg)]">
                {current.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--lp-muted)]">{current.summary}</p>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                {current.points.map(({ icon: Icon, title, body }) => (
                  <div key={title}>
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--lp-fg)]">
                      <Icon className="h-3.5 w-3.5 text-[var(--lp-accent)]" />
                      {title}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--lp-muted)]">{body}</p>
                  </div>
                ))}
              </div>

              <Link
                to="/projects"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--lp-fg)] px-4 py-2 text-xs font-medium text-[var(--lp-bg)] transition-opacity hover:opacity-90"
              >
                Open workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Active schematic */}
            <div>
              {activeCap === "canvas" && <CanvasSchematic />}
              {activeCap === "databases" && <DatabaseSchematic />}
              {activeCap === "volumes" && <VolumeSchematic />}
              {activeCap === "cli" && <CliSchematic />}
            </div>
          </div>

          {/* Supported runtimes & data stores strip */}
          <div className="mt-16 border-t border-[var(--lp-border)] pt-8">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--lp-subtle)]">
              Supported out of the box
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
              {stacks.map((s) => (
                <div key={s.name} className="flex items-center gap-2.5 text-sm text-[var(--lp-muted)]">
                  <img src={s.src} alt="" className="h-5 w-5 opacity-80" />
                  <span>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ArchitectureBand />
      <GlobalNetworkBand />
      <ObservabilityBand />
      <LightContrastBand />
      <ClosingCtaAndFooter />
    </div>
  );
}
