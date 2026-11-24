import { Link } from "@tanstack/react-router";
import { ArrowRight, Globe, ShieldCheck, Activity, Sparkles, GitPullRequest, Layers, HardDrive, Cpu } from "lucide-react";
import { Mark } from "@/components/moor/workspace-shell";
import { PrimitiveWireframe, GlobalNetworkMap, ClosingHalftone } from "./visuals";

const auditRows = [
  { time: "14:22:08", action: "deploy.promote", actor: "maya@acme.dev", target: "api · #412" },
  { time: "14:21:41", action: "volume.attach", actor: "ci-bot", target: "pg-data · 20G" },
  { time: "14:19:03", action: "env.stage_apply", actor: "maya@acme.dev", target: "production" },
  { time: "14:14:52", action: "oauth.token_issue", actor: "morline-cli", target: "mcp-agent" },
];

const updates = [
  {
    tag: "Release",
    title: "Visual canvas v2 with stacked volume cards",
    summary: "Attach, resize, and inspect persistent NVMe volumes directly beneath any service on the canvas.",
  },
  {
    tag: "Integrations",
    title: "OAuth CLI & MCP server for coding agents",
    summary: "Authenticate with device flow and let your editor or agent inspect logs and trigger deploys safely.",
  },
  {
    tag: "Databases",
    title: "Dedicated panels for Postgres, MySQL, MongoDB & Redis",
    summary: "Browse data, copy private connection strings, and manage automated snapshots without leaving Morline.",
  },
];

export function ArchitectureBand() {
  const items: Array<{ n: 1 | 2 | 3; title: string; body: string }> = [
    {
      n: 1,
      title: "Private mesh by default",
      body: "Every service in an environment resolves by name over an isolated private network—no public ports or manual VPC peering.",
    },
    {
      n: 2,
      title: "Staged changes, zero surprises",
      body: "Edit variables, volumes, or build settings as a batch. Review every pending diff and deploy—or discard—in one click.",
    },
    {
      n: 3,
      title: "Instant rollbacks & history",
      body: "Every deployment keeps its build logs, deploy logs, and image digest so rolling back takes seconds, not a rebuild.",
    },
  ];

  return (
    <section id="architecture" className="border-t border-[var(--lp-border)] bg-[var(--lp-band)] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--lp-accent)]">Architecture</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
          Infrastructure built for whole systems
        </h2>
        <Link
          to="/projects"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--lp-fg)] px-4 py-2 text-xs font-medium text-[var(--lp-bg)] transition-opacity hover:opacity-90"
        >
          Explore workspace <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <div className="mt-16 grid gap-10 border-t border-[var(--lp-border)] pt-10 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.n} className="space-y-6">
              <span className="font-mono text-xs text-[var(--lp-subtle)]">0{item.n}</span>
              <PrimitiveWireframe variant={item.n} />
              <div>
                <h3 className="font-display text-lg font-medium text-[var(--lp-fg)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GlobalNetworkBand() {
  const pillars = [
    { icon: Globe, title: "Multi-region routing", body: "Deploy close to users across fra-1, iad-1, and sin-1 with automatic TLS." },
    { icon: Layers, title: "Zero-downtime rollouts", body: "Healthchecks verify every replica before traffic shifts from the previous build." },
    { icon: HardDrive, title: "Persistent NVMe volumes", body: "Stateful workloads keep their data across redeploys with live resize controls." },
    { icon: Cpu, title: "Host-aware capacity", body: "Set exact CPU and memory ceilings directly against live cluster headroom." },
  ];

  return (
    <section id="infrastructure" className="border-t border-[var(--lp-border)] bg-[var(--lp-bg)] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-lg">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--lp-accent)]">Global network</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Capacity that scales with your stack
          </h2>
        </div>

        <div className="mt-10 overflow-hidden">
          <GlobalNetworkMap />
        </div>

        <div className="mt-12 grid gap-8 border-t border-[var(--lp-border)] pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--lp-fg)]">
                <Icon className="h-4 w-4 text-[var(--lp-accent)]" />
                {title}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ObservabilityBand() {
  return (
    <section id="observability" className="border-t border-[var(--lp-border)] bg-[var(--lp-bg)] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--lp-accent)]">Observability & AI</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Production-ready from day one
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[var(--lp-muted)]">
            Live logs, container metrics, audit trails, and AI-powered failure diagnosis built right into every service panel.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Card 1: Audit trail */}
          <div className="rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)] p-6">
            <div className="overflow-x-auto rounded-lg border border-[var(--lp-border)] bg-[var(--lp-bg)]">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--lp-border)] text-[var(--lp-subtle)]">
                    <th className="px-3.5 py-2.5 font-normal">Time</th>
                    <th className="px-3.5 py-2.5 font-normal">Action</th>
                    <th className="px-3.5 py-2.5 font-normal">Actor</th>
                    <th className="px-3.5 py-2.5 font-normal">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((row) => (
                    <tr key={row.time + row.action} className="border-b border-[var(--lp-border)] last:border-0">
                      <td className="px-3.5 py-2.5 text-[var(--lp-subtle)]">{row.time}</td>
                      <td className="px-3.5 py-2.5 text-[var(--lp-fg)]">{row.action}</td>
                      <td className="px-3.5 py-2.5 text-[var(--lp-muted)]">{row.actor}</td>
                      <td className="px-3.5 py-2.5 text-[var(--lp-accent)]">{row.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-medium text-[var(--lp-fg)]">
              <ShieldCheck className="h-4 w-4 text-[var(--lp-accent)]" />
              Full audit trail & scoped OAuth
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--lp-muted)]">
              Every deploy, variable change, and CLI token is recorded with actor and target so teams never lose context.
            </p>
          </div>

          {/* Card 2: Live metrics */}
          <div className="rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)] p-6">
            <div className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-bg)] p-4">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-[var(--lp-muted)]">api · fra-1</span>
                <span className="flex items-center gap-1.5 text-[var(--lp-live)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--lp-live)]" />
                  Live · 18ms p95
                </span>
              </div>
              <svg viewBox="0 0 320 96" className="mt-4 h-24 w-full" aria-hidden="true">
                <path
                  d="M0 74 L28 66 L56 70 L84 48 L112 56 L140 34 L168 42 L196 26 L224 38 L252 30 L280 44 L320 36"
                  fill="none"
                  stroke="var(--lp-accent)"
                  strokeWidth="1.8"
                />
                <path
                  d="M0 84 L28 80 L56 82 L84 74 L112 78 L140 68 L168 72 L196 64 L224 70 L252 66 L280 72 L320 68"
                  fill="none"
                  stroke="var(--lp-live)"
                  strokeOpacity="0.6"
                  strokeWidth="1.4"
                />
              </svg>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[var(--lp-subtle)]">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>Now</span>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-medium text-[var(--lp-fg)]">
              <Activity className="h-4 w-4 text-[var(--lp-accent)]" />
              Real-time logs & service metrics
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--lp-muted)]">
              Stream build and runtime logs over SSE with CPU, memory, and request telemetry right next to the service.
            </p>
          </div>

          {/* Card 3: AI failure diagnosis (full width) */}
          <div className="rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)] p-6 lg:col-span-2">
            <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--lp-fg)]">
                  <Sparkles className="h-4 w-4 text-[var(--lp-accent)]" />
                  AI crash diagnosis & one-click pull requests
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">
                  When a build or deploy fails, Morline inspects the logs, pinpoints the root cause, and offers a ready-to-review pull request—or hands the context cleanly to your workspace assistant.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--lp-border-strong)] bg-[var(--lp-bg)] p-4 font-mono text-xs">
                <p className="text-[11px] text-[var(--lp-subtle)]">deploy #411 · build failed</p>
                <p className="mt-2 text-[var(--lp-fg)]">Missing DATABASE_URL during migration step.</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[var(--lp-accent-soft)] px-2.5 py-1 text-[11px] text-[var(--lp-accent)]">
                  <GitPullRequest className="h-3.5 w-3.5" />
                  PR ready: guard runtime env in migrate.ts
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LightContrastBand() {
  return (
    <section className="bg-[var(--lp-light-bg)] py-24 text-[var(--lp-light-fg)] md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Quote block */}
        <div className="grid gap-8 rounded-2xl border border-[var(--lp-light-border)] bg-[var(--lp-light-card)] p-8 md:grid-cols-[1.6fr_1fr] md:p-12">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--lp-light-muted)]">Built for shipping teams</p>
            <blockquote className="mt-4 font-display text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
              “Seeing our web app, Go API, Postgres, and Redis on one live canvas replaced half our internal runbooks. When something breaks, everyone sees where it lives.”
            </blockquote>
            <p className="mt-6 text-sm text-[var(--lp-light-muted)]">
              <span className="font-medium text-[var(--lp-light-fg)]">Kofi Mensah</span> · Principal Engineer, Northbeam Labs
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3 border-t border-[var(--lp-light-border)] pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <p className="font-mono text-3xl font-semibold tracking-tight">1.8s</p>
            <p className="text-xs text-[var(--lp-light-muted)]">Average cached container build time across active workspaces</p>
          </div>
        </div>

        {/* Latest updates */}
        <div className="mt-20">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--lp-light-muted)]">Changelog</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Latest updates</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {updates.map((u) => (
              <div
                key={u.title}
                className="flex flex-col justify-between rounded-xl border border-[var(--lp-light-border)] bg-[var(--lp-light-card)] p-6"
              >
                <div>
                  <span className="inline-block rounded-full border border-[var(--lp-light-border)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--lp-light-muted)]">
                    {u.tag}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{u.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--lp-light-muted)]">{u.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClosingCtaAndFooter() {
  const columns: Array<[string, Array<[string, string]>]> = [
    [
      "Product",
      [
        ["Workspace", "/projects"],
        ["Deployments", "/deployments"],
        ["Logs", "/logs"],
        ["Metrics", "/metrics"],
        ["Domains", "/domains"],
      ],
    ],
    [
      "Platform",
      [
        ["Activity", "/activity"],
        ["Integrations", "/integrations"],
        ["Team", "/team"],
        ["Settings", "/settings"],
      ],
    ],
    [
      "Account",
      [
        ["Sign in", "/login"],
        ["Create account", "/signup"],
        ["Your account", "/account"],
      ],
    ],
  ];

  return (
    <footer className="bg-[var(--lp-bg)] text-[var(--lp-fg)]">
      {/* Final CTA */}
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Ship your first <span className="text-[var(--lp-accent)]">stack</span> in minutes
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--lp-muted)]">
              Connect a GitHub repository, attach a database or volume, and watch your entire architecture come alive on one canvas.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--lp-fg)] px-5 py-2.5 text-sm font-medium text-[var(--lp-bg)] transition-opacity hover:opacity-90"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-full border border-[var(--lp-border-strong)] px-5 py-2.5 text-sm text-[var(--lp-fg)] transition-colors hover:bg-[var(--lp-card)]"
              >
                Sign in
              </Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <ClosingHalftone />
          </div>
        </div>
      </div>

      {/* Footer links */}
      <div className="border-t border-[var(--lp-border)]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <span className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
                <Mark className="h-4 w-4" /> morline<span className="text-[var(--lp-accent)]">.</span>
              </span>
              <p className="mt-3 max-w-[240px] text-xs leading-relaxed text-[var(--lp-muted)]">
                Deploy the parts. Keep the whole system in view.
              </p>
              <p className="mt-5 flex items-center gap-2 font-mono text-[11px] text-[var(--lp-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--lp-live)]" />
                All systems operational · fra-1 · iad-1 · sin-1
              </p>
            </div>
            {columns.map(([title, links]) => (
              <div key={title}>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--lp-subtle)]">{title}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map(([label, to]) => (
                    <li key={label}>
                      <Link to={to} className="text-sm text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-fg)]">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--lp-border)] pt-6 text-xs text-[var(--lp-subtle)]">
            <span>© 2026 Morline · morline.space</span>
            <a href="mailto:hello@morline.space" className="hover:text-[var(--lp-fg)]">
              hello@morline.space
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}