import { cn } from "@/lib/utils";
import { logos, type LogoKey, type Status, type DeployState } from "@/lib/platform-data";

export function Logo({ k, className }: { k: LogoKey; className?: string }) {
  return <img src={logos[k]} alt="" className={cn("h-4 w-4 shrink-0 object-contain", className)} />;
}

const statusMeta: Record<Status, { label: string; dot: string; text: string }> = {
  online: { label: "Online", dot: "bg-score", text: "text-score" },
  deploying: { label: "Deploying", dot: "bg-score-mid animate-pulse", text: "text-score-mid" },
  crashed: { label: "Crashed", dot: "bg-destructive", text: "text-destructive" },
  sleeping: { label: "Sleeping", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

export function StatusDot({ status, withLabel }: { status: Status; withLabel?: boolean }) {
  const m = statusMeta[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {withLabel ? <span className={cn("text-xs font-medium", m.text)}>{m.label}</span> : null}
    </span>
  );
}

export const statusRail: Record<Status, string> = {
  online: "bg-score",
  deploying: "bg-score-mid",
  crashed: "bg-destructive",
  sleeping: "bg-muted-foreground/50",
};

const deployTone: Record<DeployState, string> = {
  active: "border-score/40 text-score",
  building: "border-score-mid/40 text-score-mid",
  failed: "border-destructive/40 text-destructive",
  removed: "border-border text-muted-foreground",
  queued: "border-border text-muted-foreground",
};

export function DeployBadge({ state }: { state: DeployState }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[10px] uppercase tracking-wider", deployTone[state])}>
      {state}
    </span>
  );
}

export function Sparkline({ data, className, fill = true }: { data: number[]; className?: string; fill?: boolean }) {
  const w = 100;
  const h = 32;
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / max) * (h - 2)] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-8 w-full text-primary", className)}>
      {fill ? <path d={`${d} L${w},${h} L0,${h} Z`} className="fill-current opacity-15" /> : null}
      <path d={d} className="fill-none stroke-current" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("rounded-sm border bg-muted px-1 font-mono text-[10px] text-muted-foreground", className)}>{children}</kbd>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex h-9 items-center justify-between border-b px-4">
      <p className="label-caps">{children}</p>
      {action}
    </div>
  );
}
