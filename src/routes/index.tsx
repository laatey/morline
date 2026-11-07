import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "fluid-icons/react";
import { Mark } from "@/components/moor/workspace-shell";
import pg from "@/assets/stack/postgresql.svg";
import redis from "@/assets/stack/redis.svg";
import next from "@/assets/stack/nextjs.svg";
import go from "@/assets/stack/go.svg";
import py from "@/assets/stack/python.svg";
import docker from "@/assets/stack/docker.svg";
import rust from "@/assets/stack/rust.svg";
import mongo from "@/assets/stack/mongodb.svg";
import mysql from "@/assets/stack/mysql.svg";
import vite from "@/assets/stack/vite.svg";
import n8n from "@/assets/stack/n8n.svg";
import strapi from "@/assets/stack/strapi.svg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "theme-color", content: "oklch(0.18 0.004 264)" },
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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://morline.space/og.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://morline.space/" }],
  }),
  component: MarketingPage,
});

/* ---------- helpers ---------- */

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".ml-reveal");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("ml-in")),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-primary">{n}</span>
      <span className="h-px w-10 bg-border" />
      {children}
    </div>
  );
}

const codeLines = [
  "import { serve } from 'morline'",
  "const db = env.DATABASE_URL",
  "service('api').port(8080)",
  "  .connect('postgres')",
  "  .connect('redis')",
  "volume('/data', '20GB')",
  "region(['fra','iad','sin'])",
  "healthcheck('/healthz')",
  "replicas(3).autoscale()",
  "deploy() // 12.4s",
  "▲ build cached 94%",
  "● api live on :8080",
];

/* ---------- hero machine: a computer drawn from code ---------- */

function CodeMachine() {
  const lines = [...codeLines, ...codeLines];
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[620px]">
      {/* glow */}
      <div className="absolute inset-[12%] rounded-full bg-primary/25 blur-[90px]" />
      <svg viewBox="0 0 500 400" className="absolute inset-0 h-full w-full" fill="none">
        <defs>
          <linearGradient id="scr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity=".18" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity=".02" />
          </linearGradient>
          <clipPath id="screenClip">
            <rect x="96" y="46" width="308" height="190" rx="6" />
          </clipPath>
        </defs>
        {/* monitor body built from ascii-ish dashed strokes */}
        <rect x="80" y="30" width="340" height="222" rx="16" stroke="var(--foreground)" strokeOpacity=".5" strokeWidth="1.2" />
        <rect x="88" y="38" width="324" height="206" rx="10" stroke="var(--foreground)" strokeOpacity=".18" strokeDasharray="2 4" />
        <rect x="96" y="46" width="308" height="190" rx="6" fill="url(#scr)" stroke="var(--primary)" strokeOpacity=".5" />
        <g clipPath="url(#screenClip)">
          <g className="ml-scroll">
            {lines.map((l, i) => (
              <text key={i} x="110" y={68 + i * 17} fontFamily="var(--font-mono-family)" fontSize="11" fill="var(--foreground)" fillOpacity={l.startsWith("●") ? 1 : 0.62}>
                <tspan fill="var(--primary)" fillOpacity=".7">{String((i % codeLines.length) + 1).padStart(2, "0")}  </tspan>
                {l}
              </text>
            ))}
          </g>
        </g>
        {/* neck & base */}
        <path d="M225 252 L215 300 H285 L275 252" stroke="var(--foreground)" strokeOpacity=".45" />
        <path d="M150 300 H350 L370 318 H130 Z" stroke="var(--foreground)" strokeOpacity=".45" />
        {/* keyboard of tokens */}
        {Array.from({ length: 3 }).map((_, r) =>
          Array.from({ length: 14 }).map((_, c) => (
            <rect key={`${r}-${c}`} x={112 + c * 20 + r * 4} y={334 + r * 14} width="15" height="9" rx="2" stroke="var(--foreground)" strokeOpacity={(r * 14 + c) % 7 === 0 ? 0.9 : 0.25} />
          )),
        )}
        {/* cables to infra */}
        <path d="M420 120 C470 120 470 60 495 60" stroke="var(--primary)" className="ml-dash" />
        <path d="M420 170 C470 170 470 230 495 230" stroke="var(--primary)" className="ml-dash" />
        <path d="M80 140 C30 140 30 80 5 80" stroke="var(--primary)" className="ml-dash" />
      </svg>
      {/* floating service chips */}
      {[
        { src: pg, t: "postgres", s: "20 GB", c: "right-[-4%] top-[8%]" },
        { src: redis, t: "cache", s: "private", c: "right-[-2%] top-[54%]" },
        { src: next, t: "web", s: "3 replicas", c: "left-[-6%] top-[14%]" },
      ].map((x, i) => (
        <div key={x.t} className={`ml-rise absolute ${x.c} flex items-center gap-2.5 rounded-full border border-border bg-background/80 py-1.5 pl-1.5 pr-4 backdrop-blur`} style={{ animationDelay: `${0.4 + i * 0.2}s` }}>
          <img src={x.src} alt="" className="h-7 w-7 rounded-full bg-muted p-1" />
          <div className="leading-tight">
            <div className="text-xs font-medium">{x.t}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{x.s}</div>
          </div>
          <span className="ml-pulse ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
      ))}
    </div>
  );
}

/* ---------- interactive topology ---------- */

const nodes = [
  { id: "web", src: next, x: 12, y: 28, note: "Next.js · 3 replicas" },
  { id: "api", src: go, x: 42, y: 50, note: "Go 1.23 · healthy" },
  { id: "worker", src: py, x: 40, y: 14, note: "cron */5" },
  { id: "postgres", src: pg, x: 74, y: 24, note: "volume 20 GB" },
  { id: "cache", src: redis, x: 76, y: 70, note: "private network" },
  { id: "edge", src: rust, x: 14, y: 76, note: "fra · iad · sin" },
];
const edges: [string, string][] = [
  ["web", "api"], ["edge", "web"], ["api", "postgres"], ["api", "cache"], ["worker", "postgres"], ["worker", "cache"],
];

function Topology() {
  const [hover, setHover] = useState<string | null>("api");
  const pos = (id: string) => nodes.find((n) => n.id === id)!;
  const active = (a: string, b: string) => hover === a || hover === b;
  return (
    <div className="relative aspect-[16/10] w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {edges.map(([a, b]) => {
          const p = pos(a), q = pos(b);
          const mx = (p.x + q.x) / 2;
          return (
            <path key={a + b} d={`M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`} vectorEffect="non-scaling-stroke"
              stroke={active(a, b) ? "var(--primary)" : "var(--border)"} strokeWidth={active(a, b) ? 1.6 : 1}
              className={active(a, b) ? "ml-dash" : ""} fill="none" style={{ transition: "stroke .3s" }} />
          );
        })}
      </svg>
      {nodes.map((n) => {
        const on = hover === n.id || edges.some(([a, b]) => (a === hover && b === n.id) || (b === hover && a === n.id));
        return (
          <button key={n.id} onMouseEnter={() => setHover(n.id)} onFocus={() => setHover(n.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-left transition-all duration-300"
            style={{ left: `${n.x}%`, top: `${n.y}%`, opacity: hover && !on ? 0.35 : 1 }}>
            <div className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 transition-all ${hover === n.id ? "scale-105 border-primary shadow-[0_0_40px_-8px_var(--primary)]" : "border-border"}`}>
              <img src={n.src} alt="" className="h-6 w-6" />
              <div>
                <div className="text-sm font-medium">{n.id}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{n.note}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- push-to-live pipeline ---------- */

const stages = [
  { k: "push", t: "git push origin main", log: ["→ webhook received", "→ commit 8f3a2c1 · fix: pool size"] },
  { k: "build", t: "Detected Go 1.23", log: ["→ restoring cache (94%)", "→ go build ./cmd/api", "✓ image 18.2 MB"] },
  { k: "verify", t: "Health checks", log: ["→ GET /healthz 200", "→ postgres reachable", "✓ 3/3 replicas ready"] },
  { k: "live", t: "Traffic switched", log: ["✓ api.morline.app", "✓ previous deployment removed", "◷ 12.4s total"] },
];

function Pipeline() {
  const [i, setI] = useState(0);
  const paused = useRef(false);
  useEffect(() => {
    const t = setInterval(() => !paused.current && setI((v) => (v + 1) % stages.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]" onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}>
      <ol className="relative">
        <span className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
        <span className="absolute left-[11px] top-3 w-px bg-primary transition-all duration-700" style={{ height: `${(i / (stages.length - 1)) * 88}%` }} />
        {stages.map((s, n) => (
          <li key={s.k}>
            <button onClick={() => setI(n)} className="group relative flex w-full items-start gap-5 py-5 text-left">
              <span className={`relative z-10 mt-1 grid h-6 w-6 place-items-center rounded-full border transition-colors ${n <= i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                <span className="font-mono text-[10px]">{n + 1}</span>
              </span>
              <span>
                <span className={`block font-display text-3xl tracking-tight transition-colors md:text-4xl ${n === i ? "text-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground"}`}>{s.k}</span>
                <span className="font-mono text-xs text-muted-foreground">{s.t}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="relative self-center overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">api · deployment #142</span>
        </div>
        <div className="min-h-[260px] p-5 font-mono text-[13px] leading-7">
          {stages.slice(0, i + 1).flatMap((s, n) =>
            s.log.map((l, j) => (
              <div key={`${n}-${j}`} className="ml-rise" style={{ animationDelay: n === i ? `${j * 0.15}s` : "0s", animationDuration: n === i ? ".5s" : "0s" }}>
                <span className={l.startsWith("✓") ? "text-primary" : "text-muted-foreground"}>{l}</span>
              </div>
            )),
          )}
          <span className="ml-pulse inline-block h-4 w-2 translate-y-0.5 bg-primary" />
        </div>
      </div>
    </div>
  );
}

/* ---------- globe of regions ---------- */

function Globe() {
  const regions = [
    { n: "fra", x: 52, y: 32 }, { n: "iad", x: 28, y: 38 }, { n: "sin", x: 76, y: 58 },
    { n: "gru", x: 34, y: 70 }, { n: "acc", x: 49, y: 54 }, { n: "nrt", x: 84, y: 38 },
  ];
  const dots: [number, number][] = [];
  for (let y = 6; y < 94; y += 3.2)
    for (let x = 4; x < 96; x += 3.2) {
      const dx = (x - 50) / 46, dy = (y - 50) / 44;
      if (dx * dx + dy * dy < 1 && (Math.sin(x * 0.31) + Math.cos(y * 0.27) + Math.sin((x + y) * 0.13)) > 0.2) dots.push([x, y]);
    }
  return (
    <svg viewBox="0 0 100 100" className="w-full">
      <circle cx="50" cy="50" r="46" stroke="var(--border)" fill="none" strokeWidth=".3" />
      <g className="ml-spin" style={{ transformBox: "fill-box" }}>
        <ellipse cx="50" cy="50" rx="46" ry="14" stroke="var(--border)" fill="none" strokeWidth=".2" />
        <ellipse cx="50" cy="50" rx="14" ry="46" stroke="var(--border)" fill="none" strokeWidth=".2" />
      </g>
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".55" fill="var(--foreground)" fillOpacity=".28" />)}
      {regions.slice(1).map((r) => (
        <path key={r.n} d={`M52 32 Q${(52 + r.x) / 2} ${Math.min(32, r.y) - 18} ${r.x} ${r.y}`} stroke="var(--primary)" strokeWidth=".35" fill="none" className="ml-dash" />
      ))}
      {regions.map((r, i) => (
        <g key={r.n}>
          <circle cx={r.x} cy={r.y} r="2.4" fill="var(--primary)" fillOpacity=".2" className="ml-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
          <circle cx={r.x} cy={r.y} r=".9" fill="var(--primary)" />
          <text x={r.x + 2.2} y={r.y + 0.8} fontSize="2.6" fontFamily="var(--font-mono-family)" fill="var(--foreground)">{r.n}</text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- page ---------- */

const stack = [next, pg, go, redis, py, docker, rust, mongo, mysql, vite, n8n, strapi];

function MarketingPage() {
  useReveal();
  const [cmd, setCmd] = useState<"cli" | "mcp">("cli");
  return (
    <div className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold"><Mark /> Morline</Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#canvas" className="hover:text-foreground">Canvas</a>
            <a href="#deploy" className="hover:text-foreground">Deploys</a>
            <a href="#regions" className="hover:text-foreground">Regions</a>
            <a href="#tools" className="hover:text-foreground">CLI & MCP</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90">Start deploying</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative pt-14">
        <div className="ml-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div>
            <div className="ml-rise inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-[11px] text-muted-foreground">
              <span className="ml-pulse h-1.5 w-1.5 rounded-full bg-primary" /> MCP server & CLI now available
            </div>
            <h1 className="ml-rise mt-7 font-display text-[clamp(2.8rem,6.4vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.04em]" style={{ animationDelay: ".1s" }}>
              Deploy the parts.<br />
              <span className="bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">See the whole.</span>
            </h1>
            <p className="ml-rise mt-7 max-w-[520px] text-lg leading-relaxed text-muted-foreground" style={{ animationDelay: ".2s" }}>
              Apps, databases, workers and volumes in one living canvas. Push code, watch it wire itself together, and always know what talks to what.
            </p>
            <div className="ml-rise mt-10 flex flex-wrap items-center gap-3" style={{ animationDelay: ".3s" }}>
              <Link to="/signup" className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[0_0_50px_-10px_var(--primary)]">
                Deploy from GitHub <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <code className="rounded-full border border-border px-5 py-3 font-mono text-sm text-muted-foreground">
                <span className="text-primary">$</span> npx morline up
              </code>
            </div>
          </div>
          <CodeMachine />
        </div>
        {/* stack marquee */}
        <div className="relative border-y border-border/60 py-6 [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
          <div className="ml-marquee flex w-max gap-16">
            {[...stack, ...stack].map((s, i) => <img key={i} src={s} alt="" className="h-7 w-7 opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0" />)}
          </div>
        </div>
      </section>

      {/* canvas */}
      <section id="canvas" className="relative mx-auto max-w-[1240px] px-6 py-32">
        <div className="ml-reveal grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <Eyebrow n="01">The canvas</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold leading-[1] tracking-[-0.03em]">Your infrastructure, drawn as it actually runs.</h2>
          </div>
          <p className="max-w-md text-muted-foreground lg:justify-self-end">
            Every service is a node, every connection a line you can trace. Hover one to see exactly what depends on it — no tribal knowledge, no stale diagrams.
          </p>
        </div>
        <div className="ml-reveal relative mt-16 rounded-[28px] border border-border bg-card/40 p-4 md:p-10">
          <div className="ml-grid absolute inset-0 rounded-[28px] opacity-60" />
          <Topology />
        </div>
      </section>

      {/* deploy pipeline */}
      <section id="deploy" className="relative border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-[1240px] px-6 py-32">
          <div className="ml-reveal max-w-2xl">
            <Eyebrow n="02">Push to live</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold leading-[1] tracking-[-0.03em]">One push. Four honest steps. Zero guesswork.</h2>
          </div>
          <div className="ml-reveal mt-16"><Pipeline /></div>
        </div>
      </section>

      {/* big numbers band */}
      <section className="border-y border-border/60">
        <div className="mx-auto grid max-w-[1240px] divide-border/60 px-6 md:grid-cols-4 md:divide-x">
          {[["12s", "median deploy"], ["94%", "build cache hits"], ["6", "global regions"], ["0", "YAML files"]].map(([v, l]) => (
            <div key={l} className="ml-reveal py-12 md:px-8">
              <div className="font-display text-6xl font-semibold tracking-[-0.04em]">{v}</div>
              <div className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* regions + AI */}
      <section id="regions" className="mx-auto grid max-w-[1240px] items-center gap-16 px-6 py-32 lg:grid-cols-2">
        <div className="ml-reveal mx-auto w-full max-w-[520px]"><Globe /></div>
        <div className="ml-reveal">
          <Eyebrow n="03">Everywhere, calmly</Eyebrow>
          <h2 className="mt-6 font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold leading-[1] tracking-[-0.03em]">Close to your users. Clear when it breaks.</h2>
          <p className="mt-6 max-w-md text-muted-foreground">Place services in the regions you need. When something crashes, the assistant reads the logs, explains the cause and can open a pull request with the fix.</p>
          <div className="mt-10 border-l-2 border-primary pl-5 font-mono text-sm">
            <div className="text-muted-foreground">✕ api crashed · exit 1</div>
            <div className="mt-2">Pool size 50 exceeds postgres max_connections (25).</div>
            <div className="mt-2 text-primary">→ PR #88 · set DB_POOL=20</div>
          </div>
        </div>
      </section>

      {/* CLI & MCP */}
      <section id="tools" className="border-t border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-[1240px] gap-16 px-6 py-32 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="ml-reveal">
            <Eyebrow n="04">Wherever you work</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold leading-[1] tracking-[-0.03em]">From your terminal. From your AI.</h2>
            <p className="mt-6 max-w-md text-muted-foreground">The Morline CLI and MCP server sign in with OAuth and act with exactly your permissions — nothing more.</p>
            <div className="mt-10 inline-flex rounded-full border border-border p-1">
              {(["cli", "mcp"] as const).map((k) => (
                <button key={k} onClick={() => setCmd(k)} className={`rounded-full px-5 py-1.5 font-mono text-xs uppercase transition ${cmd === k ? "bg-foreground text-background" : "text-muted-foreground"}`}>{k}</button>
              ))}
            </div>
          </div>
          <div className="ml-reveal overflow-hidden rounded-2xl border border-border bg-background font-mono text-[13px] leading-7">
            <div className="border-b border-border px-5 py-3 text-[11px] text-muted-foreground">{cmd === "cli" ? "~/acme — zsh" : "claude · morline mcp"}</div>
            <div key={cmd} className="p-6">
              {(cmd === "cli"
                ? ["$ morline login", "  ✓ signed in as ada@acme.dev", "$ morline deploy api", "  ▲ building… cached 94%", "  ✓ live in 12.4s", "$ morline logs api --tail"]
                : ["> why is checkout slow?", "  ↳ morline.metrics(api, 1h)", "  ↳ morline.logs(postgres)", "  p95 jumped after #141: missing index", "  on orders(user_id). Open a PR?", "> yes"]
              ).map((l, i) => (
                <div key={i} className="ml-rise" style={{ animationDelay: `${i * 0.12}s` }}>
                  <span className={l.includes("✓") ? "text-primary" : l.startsWith("$") || l.startsWith(">") ? "text-foreground" : "text-muted-foreground"}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="ml-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_bottom,black_20%,transparent_70%)]" />
        <div className="absolute bottom-[-40%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
        <div className="ml-reveal relative mx-auto max-w-[900px] px-6 py-40 text-center">
          <h2 className="font-display text-[clamp(2.6rem,6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">Ship the first part<br />in the next minute.</h2>
          <div className="mt-10 flex justify-center gap-3">
            <Link to="/signup" className="rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background">Start for free</Link>
            <Link to="/projects" className="rounded-full border border-border px-7 py-3 text-sm">Open workspace</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Mark /> Morline © 2026</span>
          <span className="font-mono text-xs">all systems normal <span className="ml-pulse ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" /></span>
        </div>
      </footer>
    </div>
  );
}
