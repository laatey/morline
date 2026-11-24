import { useMemo } from "react";

/**
 * Isometric 3-layer glowing dot-matrix stack for the hero centerpiece.
 * Represents Morline's stacked layers: Edge & Apps -> Services & Mesh -> Data & Volumes.
 */
export function HeroStackVisual() {
  const dots = useMemo(() => {
    const items: Array<{ x: number; y: number; r: number; o: number; accent: boolean }> = [];
    const layers = [
      { dy: -54, boost: 1.0 },
      { dy: 0, boost: 0.78 },
      { dy: 54, boost: 0.56 },
    ];
    const grid = 15;
    const stepX = 11.5;
    const stepY = 6.2;
    for (const layer of layers) {
      for (let gx = 0; gx < grid; gx++) {
        for (let gy = 0; gy < grid; gy++) {
          const ix = (gx - gy) * stepX + 260;
          const iy = (gx + gy) * stepY + 122 + layer.dy;
          const edge = gx === grid - 1 || gy === grid - 1 || gx === 0 || gy === 0;
          const cornerDist = Math.hypot(gx - 11, gy - 11);
          const glow = Math.max(0.14, (1 - cornerDist / 16) * layer.boost);
          items.push({
            x: ix,
            y: iy,
            r: edge ? 2.15 : 1.55,
            o: edge ? Math.min(1, glow + 0.25) : glow * 0.72,
            accent: cornerDist < 7.5 || (edge && gx + gy > 14),
          });
        }
      }
    }
    return items;
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[680px] select-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-16 top-1/2 h-48 -translate-y-1/2 rounded-full blur-[96px]"
        style={{ background: "radial-gradient(circle, var(--lp-accent-soft) 0%, transparent 70%)" }}
      />
      <svg viewBox="0 0 520 340" className="relative z-10 h-auto w-full" aria-hidden="true">
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill={d.accent ? "var(--lp-accent)" : "var(--lp-fg)"}
            fillOpacity={d.o}
          />
        ))}
      </svg>
    </div>
  );
}

/** Product schematic 1: Live visual canvas topology */
export function CanvasSchematic() {
  return (
    <div className="relative flex h-full min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)] p-6">
      <svg viewBox="0 0 420 240" className="h-auto w-full max-w-[400px]" aria-hidden="true">
        {/* Private network edges */}
        <path d="M126 78 C 170 78, 170 112, 214 112" fill="none" stroke="var(--lp-accent)" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="3 3" />
        <path d="M126 164 C 170 164, 170 128, 214 128" fill="none" stroke="var(--lp-border-strong)" strokeWidth="1.2" />
        <path d="M318 118 C 340 118, 340 72, 356 72" fill="none" stroke="var(--lp-live)" strokeOpacity="0.5" strokeWidth="1.2" />

        {/* Node: web */}
        <g transform="translate(20, 48)">
          <rect width="106" height="58" rx="8" fill="var(--lp-bg)" stroke="var(--lp-border-strong)" />
          <circle cx="16" cy="20" r="3.5" fill="var(--lp-live)" />
          <text x="27" y="23" fill="var(--lp-fg)" fontSize="11" fontFamily="var(--font-mono)">web</text>
          <text x="14" y="42" fill="var(--lp-muted)" fontSize="9" fontFamily="var(--font-mono)">Next.js · 3 rep</text>
        </g>

        {/* Node: worker */}
        <g transform="translate(20, 134)">
          <rect width="106" height="58" rx="8" fill="var(--lp-bg)" stroke="var(--lp-border)" />
          <circle cx="16" cy="20" r="3.5" fill="var(--lp-live)" />
          <text x="27" y="23" fill="var(--lp-fg)" fontSize="11" fontFamily="var(--font-mono)">worker</text>
          <text x="14" y="42" fill="var(--lp-muted)" fontSize="9" fontFamily="var(--font-mono)">Python · cron</text>
        </g>

        {/* Node: api */}
        <g transform="translate(214, 88)">
          <rect width="104" height="62" rx="8" fill="var(--lp-bg)" stroke="var(--lp-accent)" strokeOpacity="0.7" />
          <circle cx="16" cy="21" r="3.5" fill="var(--lp-accent)" />
          <text x="27" y="24" fill="var(--lp-fg)" fontSize="11" fontFamily="var(--font-mono)">api</text>
          <text x="14" y="44" fill="var(--lp-muted)" fontSize="9" fontFamily="var(--font-mono)">Go 1.23 · fra-1</text>
        </g>

        {/* Stacked Volume underneath postgres */}
        <g transform="translate(332, 146)">
          <rect x="6" y="42" width="66" height="22" rx="5" fill="var(--lp-band)" stroke="var(--lp-border)" />
          <text x="14" y="56" fill="var(--lp-subtle)" fontSize="8" fontFamily="var(--font-mono)">/data · 20G</text>
          <rect width="78" height="46" rx="8" fill="var(--lp-bg)" stroke="var(--lp-border-strong)" />
          <circle cx="14" cy="18" r="3" fill="var(--lp-live)" />
          <text x="23" y="21" fill="var(--lp-fg)" fontSize="10" fontFamily="var(--font-mono)">pg</text>
          <text x="12" y="36" fill="var(--lp-muted)" fontSize="8.5" fontFamily="var(--font-mono)">Postgres 16</text>
        </g>

        {/* Node: redis */}
        <g transform="translate(342, 48)">
          <rect width="68" height="46" rx="8" fill="var(--lp-bg)" stroke="var(--lp-border)" />
          <circle cx="14" cy="18" r="3" fill="var(--lp-live)" />
          <text x="23" y="21" fill="var(--lp-fg)" fontSize="10" fontFamily="var(--font-mono)">redis</text>
          <text x="12" y="36" fill="var(--lp-muted)" fontSize="8.5" fontFamily="var(--font-mono)">cache</text>
        </g>
      </svg>
    </div>
  );
}

/** Product schematic 2: Managed database cluster */
export function DatabaseSchematic() {
  return (
    <div className="relative flex h-full min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)] p-6">
      <div className="w-full max-w-[360px] space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between rounded-lg border border-[var(--lp-border-strong)] bg-[var(--lp-bg)] px-4 py-3">
          <span className="flex items-center gap-2 text-[var(--lp-fg)]">
            <span className="h-2 w-2 rounded-full bg-[var(--lp-live)]" />
            postgres-prod
          </span>
          <span className="text-[11px] text-[var(--lp-muted)]">v16.4 · primary</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {["Data browser", "Auto backups", "Private URL", "Metrics"].map((item, i) => (
            <div key={item} className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-bg)]/70 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-[var(--lp-subtle)]">0{i + 1}</p>
              <p className="mt-1 text-[11px] text-[var(--lp-fg)]">{item}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-bg)] px-3.5 py-2.5 text-[11px] text-[var(--lp-muted)]">
          <span className="text-[var(--lp-accent)]">DATABASE_URL</span>=postgres://internal:5432/app
        </div>
      </div>
    </div>
  );
}

/** Product schematic 3: Persistent volumes block grid */
export function VolumeSchematic() {
  return (
    <div className="relative flex h-full min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)] p-6">
      <div className="grid w-full max-w-[360px] grid-cols-8 gap-1.5" aria-hidden="true">
        {Array.from({ length: 48 }).map((_, i) => {
          const active = i >= 18 && i <= 29;
          return (
            <div
              key={i}
              className="aspect-square rounded-[4px] border"
              style={{
                borderColor: active ? "var(--lp-accent)" : "var(--lp-border)",
                backgroundColor: active ? "var(--lp-accent-soft)" : "var(--lp-bg)",
              }}
            />
          );
        })}
      </div>
      <div className="absolute rounded-lg border border-[var(--lp-border-strong)] bg-[var(--lp-bg)]/95 px-4 py-2.5 font-mono text-xs text-[var(--lp-fg)] shadow-lg backdrop-blur-sm">
        mount <span className="text-[var(--lp-accent)]">/var/lib/data</span> · 50 GB NVMe
      </div>
    </div>
  );
}

/** Product schematic 4: CLI & MCP OAuth terminal */
export function CliSchematic() {
  return (
    <div className="relative flex h-full min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)] p-6">
      <div className="w-full max-w-[370px] rounded-lg border border-[var(--lp-border-strong)] bg-[var(--lp-bg)] p-4 font-mono text-[11px] leading-6">
        <p className="text-[var(--lp-subtle)]"># authenticate via OAuth device flow</p>
        <p className="text-[var(--lp-fg)]">
          <span className="text-[var(--lp-accent)]">$</span> morline login
        </p>
        <p className="text-[var(--lp-live)]">✓ authorized as team/platform</p>
        <p className="mt-2 text-[var(--lp-fg)]">
          <span className="text-[var(--lp-accent)]">$</span> morline deploy --watch
        </p>
        <p className="text-[var(--lp-muted)]">  building image · 1.8s</p>
        <p className="text-[var(--lp-muted)]">  healthcheck passing · 3/3 replicas</p>
        <p className="text-[var(--lp-live)]">● live at api.morline.space</p>
      </div>
    </div>
  );
}

/** Three crisp geometric wireframe SVGs for the Architecture primitives band */
export function PrimitiveWireframe({ variant }: { variant: 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 220 140" className="mx-auto h-36 w-full max-w-[220px]" aria-hidden="true">
      {variant === 1 && (
        <g stroke="var(--lp-border-strong)" fill="none" strokeWidth="1">
          <circle cx="110" cy="70" r="52" />
          <line x1="110" y1="36" x2="110" y2="104" />
          <line x1="76" y1="70" x2="144" y2="70" />
          <line x1="86" y1="46" x2="134" y2="94" />
          <line x1="134" y1="46" x2="86" y2="94" />
          <circle cx="110" cy="18" r="2.5" fill="var(--lp-accent)" stroke="none" />
          <circle cx="162" cy="70" r="2.5" fill="var(--lp-accent)" stroke="none" />
          <circle cx="58" cy="70" r="2.5" fill="var(--lp-accent)" stroke="none" />
        </g>
      )}
      {variant === 2 && (
        <g stroke="var(--lp-border-strong)" fill="none" strokeWidth="1">
          {[0, 22, 44].map((dy) => (
            <polygon key={dy} points={`110,${18 + dy} 168,${44 + dy} 110,${70 + dy} 52,${44 + dy}`} />
          ))}
          <circle cx="110" cy="18" r="2.5" fill="var(--lp-live)" stroke="none" />
          <circle cx="168" cy="44" r="2.5" fill="var(--lp-live)" stroke="none" />
          <circle cx="52" cy="44" r="2.5" fill="var(--lp-live)" stroke="none" />
        </g>
      )}
      {variant === 3 && (
        <g stroke="var(--lp-border-strong)" fill="none" strokeWidth="1">
          <polygon points="110,16 164,46 164,100 110,130 56,100 56,46" />
          <polygon points="110,48 134,62 134,88 110,102 86,88 86,62" />
          <line x1="110" y1="16" x2="110" y2="48" />
          <line x1="164" y1="100" x2="134" y2="88" />
          <line x1="56" y1="100" x2="86" y2="88" />
          <circle cx="110" cy="16" r="2.5" fill="var(--lp-accent)" stroke="none" />
          <circle cx="164" cy="46" r="2.5" fill="var(--lp-accent)" stroke="none" />
          <circle cx="56" cy="46" r="2.5" fill="var(--lp-accent)" stroke="none" />
        </g>
      )}
    </svg>
  );
}

/** Dot-matrix global region map with glowing Morline nodes */
export function GlobalNetworkMap() {
  const dots = useMemo(() => {
    const pts: Array<{ x: number; y: number; o: number }> = [];
    // Stylized continental clusters
    const clusters = [
      { cx: 185, cy: 105, rx: 75, ry: 42 }, // North America
      { cx: 245, cy: 190, rx: 38, ry: 48 }, // South America
      { cx: 415, cy: 92, rx: 52, ry: 30 }, // Europe
      { cx: 430, cy: 170, rx: 46, ry: 46 }, // Africa
      { cx: 565, cy: 112, rx: 88, ry: 45 }, // Asia
      { cx: 635, cy: 205, rx: 36, ry: 24 }, // Oceania
    ];
    for (let x = 80; x <= 710; x += 11) {
      for (let y = 44; y <= 245; y += 11) {
        let hit = 0;
        for (const c of clusters) {
          const d = ((x - c.cx) / c.rx) ** 2 + ((y - c.cy) / c.ry) ** 2;
          if (d < 1) hit = Math.max(hit, 1 - d);
        }
        if (hit > 0.08) {
          pts.push({ x, y, o: 0.14 + hit * 0.28 });
        }
      }
    }
    return pts;
  }, []);

  const regions = [
    { x: 222, y: 106, label: "iad-1 · US East" },
    { x: 418, y: 88, label: "fra-1 · Frankfurt" },
    { x: 584, y: 158, label: "sin-1 · Singapore" },
  ];

  return (
    <svg viewBox="0 0 780 280" className="h-auto w-full" aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="2" fill="var(--lp-fg)" fillOpacity={d.o} />
      ))}
      {regions.map((r) => (
        <g key={r.label} transform={`translate(${r.x}, ${r.y})`}>
          <circle r="10" fill="var(--lp-accent)" fillOpacity="0.18" />
          <circle r="3.5" fill="var(--lp-accent)" />
          <text x="9" y="3.5" fill="var(--lp-fg)" fontSize="10" fontFamily="var(--font-mono)">
            {r.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Halftone closing emblem for the final CTA band */
export function ClosingHalftone() {
  const dots = useMemo(() => {
    const list: Array<{ x: number; y: number; r: number; o: number }> = [];
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 24; col++) {
        const dx = (col - 14) / 10;
        const dy = (row - 9) / 8;
        const dist = Math.hypot(dx, dy);
        if (dist < 1.35) {
          const intensity = Math.max(0, 1 - dist / 1.35);
          list.push({
            x: col * 14 + 10,
            y: row * 14 + 10,
            r: 1.4 + intensity * 2.8,
            o: 0.12 + intensity * 0.78,
          });
        }
      }
    }
    return list;
  }, []);

  return (
    <svg viewBox="0 0 360 270" className="h-auto w-full max-w-[380px] select-none" aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--lp-accent)" fillOpacity={d.o} />
      ))}
    </svg>
  );
}