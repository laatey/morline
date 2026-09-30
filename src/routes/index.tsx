import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { Mark } from "@/components/moor/workspace-shell";
import pg from "@/assets/stack/postgresql.svg";
import redis from "@/assets/stack/redis.svg";
import next from "@/assets/stack/nextjs.svg";
import go from "@/assets/stack/go.svg";
import py from "@/assets/stack/python.svg";
import docker from "@/assets/stack/docker.svg";
import rust from "@/assets/stack/rust.svg";
import mongo from "@/assets/stack/mongodb.svg";
import { logLines } from "@/lib/platform-data";
import rope from "@/assets/rope.png";
import wave from "@/assets/wave-plate.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "theme-color", content: "oklch(0.272 0.001 106)" },
      { title: "Morline — Deploy the parts. See the whole." },
      { name: "description", content: "Morline deploys apps, databases and workers into one connected workspace where every relationship stays visible." },
      { property: "og:title", content: "Morline — Deploy the parts. See the whole." },
      { property: "og:description", content: "Apps, databases and workers in one connected, visible workspace." },
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

const specimens = [
  { src: next, name: "web", note: "Next.js / 3 replicas", pos: "left-[4%] top-[8%] -rotate-3" },
  { src: pg, name: "postgres", note: "volume 20 GB", pos: "left-[24%] top-[44%] rotate-2" },
  { src: redis, name: "cache", note: "private network", pos: "left-[44%] top-[4%] -rotate-1" },
  { src: go, name: "api", note: "go 1.23 / healthy", pos: "left-[60%] top-[50%] rotate-3" },
  { src: py, name: "worker", note: "cron */5", pos: "left-[78%] top-[12%] -rotate-2" },
  { src: docker, name: "image", note: "ghcr.io / latest", pos: "left-[8%] top-[62%] rotate-1" },
  { src: rust, name: "edge", note: "fra / iad / sin", pos: "left-[86%] top-[58%] -rotate-3" },
  { src: mongo, name: "events", note: "replica set", pos: "left-[40%] top-[66%] rotate-2" },
];

function Mono({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <p className={`font-mono text-[10px] uppercase leading-[1.35] tracking-wide text-muted-foreground ${className}`}>{children}</p>;
}

function Hl({ children }: { children: React.ReactNode }) {
  return <mark className="bg-primary px-1 text-primary-foreground [box-decoration-break:clone]">{children}</mark>;
}

function Circled({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <svg className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+16px)] text-primary" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M6 22 C4 8 40 3 70 5 C92 7 99 16 95 27 C90 38 40 39 18 35 C6 32 3 24 12 14" fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

function MarketingPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = "var(--color-background)";
    document.body.style.backgroundColor = "var(--color-background)";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "oklch(0.272 0.001 106)");
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top bar — buttons live outside the frame */}
      <header className="flex items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <span className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <Mark className="h-4 w-4" /> morline<span className="text-primary">.</span>
        </span>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="hidden rounded-full px-3 py-1.5 font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground sm:inline-flex">Sign in</Link>
          <Link to="/projects" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 font-mono text-[11px] uppercase text-background transition-colors hover:bg-primary hover:text-primary-foreground">Open workspace <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </nav>
      </header>

      {/* Frame — everything below sits inside one bordered cut-out panel */}
      <div className="mx-0 mb-2 overflow-hidden rounded-t-2xl border border-border sm:mx-3 sm:mb-3 sm:rounded-3xl">
      {/* Sheet 01 — the cover */}
      <section className="relative min-h-[calc(100svh-140px)] border-b border-border" aria-labelledby="cover">
        <span aria-hidden="true" className="sun-disc pointer-events-none absolute right-[5%] top-[8%] aspect-square w-[36vw] rounded-full md:right-[6%] md:top-[9%] md:w-[20vw]" />
        <header className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4 md:p-8">
          <Mono>Issue №1<br />Deployment</Mono>
          <Mono className="hidden md:block"><a href="#sheet-2" className="hover:text-foreground">The system</a><br /><a href="#sheet-3" className="hover:text-foreground">The viewfinder</a><br /><a href="#sheet-4" className="hover:text-foreground">Field notes</a><br /><a href="#sheet-5" className="hover:text-foreground">The signal</a></Mono>
          <Mono className="hidden md:block">morline.space<br />EST. 2026</Mono>
          <Mono className="hidden text-right md:block">Fra-1 · iad · sin<br />Uptime 99.99%</Mono>
        </header>

        <div className="relative px-4 md:px-8">
          <h1 id="cover" className="relative select-none font-display text-[27vw] font-extrabold leading-[0.78] tracking-[-0.07em] md:text-[21vw]">
            morline<span className="text-primary">.</span>
          </h1>
          <Mono className="absolute right-6 top-2 hidden text-right md:block md:right-10">Frame 01<br />Roll 04<br />Region fra-1<br />Build 1.8s<br />Archive No. 031</Mono>
        </div>

        <div className="mx-auto mt-10 max-w-3xl px-5 pb-24 text-center md:mt-14">
          <svg viewBox="0 0 24 24" className="mx-auto mb-5 h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66L17.66 6.34" />
          </svg>
          <p className="font-display text-2xl font-semibold uppercase leading-[1.15] tracking-tight sm:text-4xl">
            <Hl>Deploy the parts.</Hl> Keep every service, database and worker <Hl>in view</Hl>, connected, and <Hl>in its place.</Hl>
          </p>
          <p className="mx-auto mt-6 max-w-sm text-left text-sm text-muted-foreground">
            Morline turns a repository into a running system — then keeps the whole system on one canvas, so you always see what talks to what.
          </p>
        </div>

        <Mono className="absolute bottom-5 left-5 md:bottom-8 md:left-8">No YAML walls.<br />No lost context.<br />Just momentum.</Mono>
        <Mono className="absolute bottom-5 right-5 text-right md:bottom-8 md:right-8">Scroll ↓<br />Sheet 01 / 05</Mono>
      </section>

      {/* Sheet 02 — the specimens */}
      <section id="sheet-2" className="relative border-b border-border">
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_2fr_1fr] md:p-8">
          <Mono>Fig. 02 · The system<br />Movement study</Mono>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight md:text-center md:text-5xl">
            Everything you run, <Circled>laid out</Circled> like it <Circled>actually is.</Circled>
          </h2>
          <Mono className="md:text-right">8 services<br />3 private links<br />1 environment</Mono>
        </div>

        <div className="relative mx-5 mb-5 hidden h-[680px] md:block">
          <svg className="absolute inset-0 h-full w-full text-border" aria-hidden="true">
            <path d="M 12% 20% C 30% 30%, 25% 50%, 30% 58%" stroke="currentColor" fill="none" strokeDasharray="4 5" />
          </svg>
          {specimens.map((s) => (
            <figure key={s.name} className={`group absolute w-32 transition-transform duration-300 hover:z-10 hover:rotate-0 hover:scale-110 ${s.pos}`}>
              <div className="grid aspect-[4/5] place-items-center border border-border bg-card shadow-sm">
                <img src={s.src} alt="" className="h-12 w-12 grayscale transition group-hover:grayscale-0" />
              </div>
              <figcaption className="mt-1.5 text-center font-mono text-[9px] uppercase text-muted-foreground"><span className="text-foreground">{s.name}</span><br />{s.note}</figcaption>
            </figure>
          ))}
          <p className="absolute left-[30%] top-[30%] flex items-center gap-2 font-display text-sm italic text-primary">
            it's your database
            <svg width="60" height="18" viewBox="0 0 60 18" aria-hidden="true"><path d="M2 4 C20 16 40 16 56 12 M50 7 L57 12 L50 16" stroke="currentColor" fill="none" strokeWidth="1.2" /></svg>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 px-5 pb-8 md:hidden">
          {specimens.slice(0, 6).map((s, i) => (
            <figure key={s.name} className={i % 2 ? "rotate-2" : "-rotate-2"}>
              <div className="grid aspect-[4/5] place-items-center border border-border bg-card"><img src={s.src} alt="" className="h-10 w-10" /></div>
              <figcaption className="mt-1 text-center font-mono text-[9px] uppercase text-muted-foreground">{s.name} · {s.note}</figcaption>
            </figure>
          ))}
        </div>

        <div className="grid gap-8 border-t border-border p-5 md:grid-cols-3 md:p-8">
          {[
            ["A", "Push a commit.", "Connect a repo or bring an image. Builds start where your code lives."],
            ["B", "Draw the line.", "Services find each other over private networking. The link is on the canvas, not in a doc."],
            ["C", "Stay with it.", "Logs, health, metrics and rollbacks sit next to the thing they describe."],
          ].map(([k, t, d]) => (
            <div key={k}>
              <Mono>Observation {k}</Mono>
              <p className="mt-2 font-display text-2xl font-semibold">{t}</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sheet 03 — the viewfinder */}
      <section id="sheet-3" className="relative border-b border-border" aria-labelledby="viewfinder">
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_2fr_1fr] md:p-8">
          <Mono>Fig. 03 · The viewfinder<br />Framing study</Mono>
          <h2 id="viewfinder" className="font-display text-3xl font-semibold leading-tight tracking-tight md:text-center md:text-5xl">
            Zoom in. <Circled>Nothing</Circled> leaves the <Circled>frame.</Circled>
          </h2>
          <Mono className="md:text-right">AF locked<br />f/1.8 · fra-1</Mono>
        </div>

        <div className="relative mx-auto mb-6 max-w-3xl border border-border bg-card px-6 py-8 md:mb-10 md:px-10 md:py-12">
          <span aria-hidden="true" className="corner-bracket corner-bracket-tl" />
          <span aria-hidden="true" className="corner-bracket corner-bracket-tr" />
          <span aria-hidden="true" className="corner-bracket corner-bracket-bl" />
          <span aria-hidden="true" className="corner-bracket corner-bracket-br" />
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            <span aria-hidden="true" className="rec-blink inline-block h-2 w-2 rounded-full bg-destructive" />
            REC · live · deploy #412
          </p>
          <div className="mt-6 font-mono text-[11px] leading-6">
            {logLines.slice(0, 5).map((l, i) => (
              <p key={i} className="truncate"><span className="mr-3 text-muted-foreground">{l.svc}</span>{l.msg}</p>
            ))}
          </div>
          <p className="mt-8 font-display text-2xl font-semibold leading-snug md:text-3xl">
            Logs, health and rollbacks —<br />always <span className="italic font-light">in focus.</span>
          </p>
          <Mono className="mt-6">ISO 100 · 1.8s exposure<br />Frame 03 / 05</Mono>
        </div>
      </section>

      {/* Sheet 04 — field notes */}
      <section id="sheet-4" className="relative border-b border-border" aria-labelledby="field-notes">
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_2fr_1fr] md:p-8">
          <Mono>Fig. 04 · Field notes<br />Ledger study</Mono>
          <h2 id="field-notes" className="font-display text-3xl font-semibold leading-tight tracking-tight md:text-center md:text-5xl">
            Everything leaves a <Circled>paper trail.</Circled>
          </h2>
          <Mono className="md:text-right">Filed under<br />deploys</Mono>
        </div>

        <div className="mx-auto mb-6 grid max-w-4xl gap-4 px-5 md:mb-10 md:grid-cols-[2fr_1fr] md:px-8">
          <div className="border border-border bg-card">
            {[
              ["09:41", "deploy #412 queued · fra-1"],
              ["09:41", "build 1.8s · ghcr.io/morline/api:latest"],
              ["09:42", "healthcheck passing · 3/3 replicas"],
              ["09:42", "private link attached · api → postgres"],
              ["09:43", "traffic shifted · 0% → 100%"],
              ["09:43", "● live — rollback armed"],
            ].map(([t, m]) => (
              <p key={m} className="border-b border-border px-5 py-3 font-mono text-[11px] last:border-b-0">
                <span className="mr-4 text-muted-foreground">{t}</span>{m}
              </p>
            ))}
          </div>
          <div className="flex flex-col items-start gap-6 md:items-end">
            <Mono className="md:text-right">No context lost.<br />No doc archaeology.</Mono>
            <span className="-rotate-6 rounded-sm border-2 border-primary px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">Approved for deploy</span>
            <Mono className="md:text-right">Ledger 04<br />Page 112</Mono>
          </div>
        </div>
      </section>

      {/* Plate — the current, after Hokusai */}
      <section className="relative border-b border-border" aria-labelledby="plate">
        <h2 id="plate" className="sr-only">The current</h2>
        <img src={wave} alt="" aria-hidden="true" loading="lazy" width={1920} height={640} className="h-52 w-full object-cover md:h-80" />
        <Mono className="plate-note absolute left-5 top-5 md:left-8 md:top-8">Plate · The current<br />after Hokusai · Edo<br />A system in motion, seen whole.</Mono>
        <Mono className="plate-note absolute right-5 top-5 text-right md:right-8 md:top-8">fra-1 → iad → sin<br />traffic flows east</Mono>
      </section>

      {/* Sheet 05 — the signal */}
      <section id="sheet-5" className="relative overflow-hidden bg-[oklch(0.30_0.02_262)] text-[oklch(0.93_0.01_260)]">
        {/* corner cut-outs */}
        <span aria-hidden="true" className="absolute left-0 top-0 h-8 w-8 rounded-br-2xl bg-background sm:h-12 sm:w-12 sm:rounded-br-3xl" />
        <span aria-hidden="true" className="absolute right-0 top-0 h-8 w-8 rounded-bl-2xl bg-background sm:h-12 sm:w-12 sm:rounded-bl-3xl" />

        <div className="flex flex-wrap items-center justify-between gap-4 px-5 pt-14 md:px-12 md:pt-20">
          <p className="font-mono text-[10px] uppercase opacity-50">Sheet 05 / 05 · The signal<br />production · live</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/projects" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-mono text-xs uppercase text-primary-foreground hover:opacity-90">Open the workspace <ArrowUpRight className="h-4 w-4" /></Link>
            <Link to="/login" className="inline-flex items-center rounded-full border border-[oklch(0.93_0.01_260)]/25 px-5 py-2.5 font-mono text-xs uppercase hover:bg-[oklch(0.93_0.01_260)]/10">Sign in</Link>
          </div>
        </div>

        <div className="grid gap-10 p-5 pt-10 md:grid-cols-[1fr_1.4fr] md:p-12 md:pt-14">
          <h2 className="font-display text-5xl font-extrabold leading-[0.9] tracking-[-0.04em] md:text-7xl">
            Ship it.<br /><span className="italic font-light">Watch it</span><br />breathe<span className="text-primary">.</span>
          </h2>
          <div className="border border-[oklch(0.93_0.01_260)]/15 p-4 font-mono text-[11px] leading-6">
            {logLines.slice(0, 10).map((l, i) => (
              <p key={i} className="truncate opacity-70"><span className="mr-3 opacity-40">{String(i + 1).padStart(2, "0")}</span><span className="mr-3 opacity-40">{l.svc}</span>{l.msg}</p>
            ))}
            <p className="mt-2 text-primary">● deployment live — 1.8s</p>
          </div>
        </div>
      </section>

      {/* Footer — the line */}
      <footer className="relative overflow-hidden bg-[oklch(0.235_0_0)] text-[oklch(0.93_0_0)]">
        <img src={rope} alt="" aria-hidden="true" className="w-full" />
          <div className="grid gap-10 px-5 py-10 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-12 md:py-12">
            <div>
              <span className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
                <Mark className="h-4 w-4" /> morline<span className="text-primary">.</span>
              </span>
              <p className="mt-3 max-w-[240px] text-xs leading-relaxed opacity-60">
                Deploy the parts. Keep the whole system in view.
              </p>
              <p className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide opacity-70">
                <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                all systems go · fra-1 · iad · sin
              </p>
            </div>

            {([
              ["Product", [["Workspace", "/projects"], ["Deployments", "/deployments"], ["Logs", "/logs"], ["Metrics", "/metrics"], ["Domains", "/domains"]]],
              ["Workspace", [["Activity", "/activity"], ["Integrations", "/integrations"], ["Team", "/team"], ["Settings", "/settings"]]],
              ["Account", [["Sign in", "/login"], ["Create account", "/signup"], ["Your account", "/account"]]],
            ] as Array<[string, Array<[string, string]>]>).map(([title, links]) => (
              <div key={title}>
                <Mono className="opacity-50">{title}</Mono>
                <ul className="mt-3 space-y-2">
                  {links.map(([label, to]) => (
                    <li key={label}>
                      <Link to={to} className="font-mono text-[11px] uppercase tracking-wide opacity-70 transition-opacity hover:text-primary hover:opacity-100">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p aria-hidden="true" className="select-none px-2 text-center font-display text-[24vw] font-extrabold leading-[0.72] tracking-[-0.07em] text-[oklch(0.93_0_0)] md:text-[23vw]">
            morline<span className="text-primary">.</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-5 pb-6 font-mono text-[10px] uppercase opacity-60 md:mt-0 md:px-12 md:pr-20">
            <span>© 2026 Morline · morline.space</span>
            <span>No rules. Just push forward.</span>
            <a href="mailto:hello@morline.space" className="hover:opacity-100">hello@morline.space</a>
          </div>
          {/* bottom corner cut-outs */}
          <span aria-hidden="true" className="absolute bottom-0 left-0 h-8 w-8 rounded-tr-2xl bg-background sm:h-12 sm:w-12 sm:rounded-tr-3xl" />
          <span aria-hidden="true" className="absolute bottom-0 right-0 h-8 w-8 rounded-tl-2xl bg-background sm:h-12 sm:w-12 sm:rounded-tl-3xl" />
        </footer>
      </div>
    </div>
  );
}
