import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Clock, HardDrive, Maximize, Minus, Plus, Redo2, Undo2, Globe, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Edge, Service } from "@/lib/platform-data";
import { api } from "@/lib/api";
import { toService, useCanvasData, useEnvId } from "@/lib/workspace";
import { Logo, StatusDot, Kbd } from "./primitives";
import { cn } from "@/lib/utils";

const NODE_W = 232;
const NODE_H = 96;

function nodeHeight(s: Service) {
  return NODE_H + (s.domain || s.volume ? 28 : 0);
}

export function useCanvasState() {
  const qc = useQueryClient();
  const envId = useEnvId();
  const canvasQ = useCanvasData();
  const [services, setServices] = useState<Service[]>([]);
  const [history, setHistory] = useState<Service[][]>([]);
  const [future, setFuture] = useState<Service[][]>([]);
  const revision = useRef<number | undefined>(undefined);
  const serverServices = canvasQ.data?.services;
  const edges: (Edge & { id: string })[] = (canvasQ.data?.connections ?? []).map((c) => ({ id: c.id, from: c.fromServiceId, to: c.toServiceId, label: c.label ?? c.protocol ?? "" }));
  const connect = async (fromServiceId: string, toServiceId: string) => {
    if (!envId || fromServiceId === toServiceId || edges.some((e) => e.from === fromServiceId && e.to === toServiceId)) return;
    try {
      const r = await api<{ injectedVariables?: { key: string }[] }>(`/environments/${envId}/connections`, { method: "POST", body: { fromServiceId, toServiceId } });
      const keys = (r.injectedVariables ?? []).map((v) => v.key).join(", ");
      toast.success("Services connected", keys ? { description: `Added ${keys}` } : undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect services");
    }
    void qc.invalidateQueries({ queryKey: ["canvas", envId] });
  };
  const disconnect = async (id: string) => {
    try { await api(`/connections/${id}`, { method: "DELETE" }); toast.success("Connection removed"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not remove connection"); }
    void qc.invalidateQueries({ queryKey: ["canvas", envId] });
  };

  // Sync server state in, keeping local positions for nodes the user moved since the last save.
  useEffect(() => {
    if (!serverServices) return;
    revision.current = canvasQ.data?.revision;
    setServices((local) => [
      ...serverServices.map((s) => {
        const mapped = toService(s);
        const mine = local.find((l) => l.id === s.id);
        return mine ? { ...mapped, x: mine.x, y: mine.y } : mapped;
      }),
      // keep optimistic placeholders until their create request settles
      ...local.filter((l) => l.id.startsWith("tmp_")),
    ]);
  }, [serverServices, canvasQ.data?.revision]);

  const persist = (next: Service[], prev: Service[]) => {
    if (!envId) return;
    const positions = next.filter((n) => { const o = prev.find((p) => p.id === n.id); return !o || o.x !== n.x || o.y !== n.y; }).map((n) => ({ serviceId: n.id, x: Math.round(n.x), y: Math.round(n.y) }));
    if (!positions.length) return;
    api<{ revision: number }>(`/environments/${envId}/canvas/layout`, { method: "PATCH", body: { revision: revision.current, positions } })
      .then((r) => { revision.current = r.revision; })
      .catch(() => { void qc.invalidateQueries({ queryKey: ["canvas", envId] }); });
  };
  const commit = (next: Service[], before: Service[] = services) => {
    setHistory((h) => [...h.slice(-30), before]);
    setFuture([]);
    setServices(next);
    persist(next, before);
  };
  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    setFuture((f) => [services, ...f]);
    setHistory((h) => h.slice(0, -1));
    setServices(prev);
    persist(prev, services);
  };
  const redo = () => {
    const nxt = future[0];
    if (!nxt) return;
    setHistory((h) => [...h, services]);
    setFuture((f) => f.slice(1));
    setServices(nxt);
    persist(nxt, services);
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["canvas", envId] });
  return { services, setServices, edges, connect, disconnect, commit, undo, redo, refresh, envId, loading: canvasQ.isLoading, canUndo: history.length > 0, canRedo: future.length > 0 };
}

export function Canvas({
  state,
  selected,
  onSelect,
}: {
  state: ReturnType<typeof useCanvasState>;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { services, setServices, edges, commit } = state;
  const [view, setView] = useState({ x: 60, y: 60, k: 1 });
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "pan" | "node" | "link"; id?: string | undefined; sx: number; sy: number; ox: number; oy: number; moved: boolean; snapshot?: Service[] } | null>(null);
  const [link, setLink] = useState<{ from: string; x: number; y: number } | null>(null);
  const toWorld = (cx: number, cy: number) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k };
  };
  const startLink = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { mode: "link", id, sx: e.clientX, sy: e.clientY, ox: 0, oy: 0, moved: false };
    setLink({ from: id, ...toWorld(e.clientX, e.clientY) });
  };

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el || !services.length) return;
    const minX = Math.min(...services.map((s) => s.x));
    const minY = Math.min(...services.map((s) => s.y));
    const maxX = Math.max(...services.map((s) => s.x + NODE_W));
    const maxY = Math.max(...services.map((s) => s.y + nodeHeight(s)));
    const pad = 80;
    const k = Math.min(1.2, Math.max(0.4, Math.min((el.clientWidth - pad * 2) / (maxX - minX), (el.clientHeight - pad * 2) / (maxY - minY))));
    setView({ k, x: (el.clientWidth - (maxX - minX) * k) / 2 - minX * k, y: (el.clientHeight - (maxY - minY) * k) / 2 - minY * k });
  }, [services]);

  const centerAt100 = useCallback(() => {
    const el = ref.current;
    if (!el || !services.length) return;
    const minX = Math.min(...services.map((s) => s.x));
    const minY = Math.min(...services.map((s) => s.y));
    const maxX = Math.max(...services.map((s) => s.x + NODE_W));
    const maxY = Math.max(...services.map((s) => s.y + nodeHeight(s)));
    const totalW = maxX - minX;
    const totalH = maxY - minY;

    // Default zoom is 100% (k: 1) for both mobile and desktop
    const k = 1;
    let x: number;
    let y: number;

    if (el.clientWidth >= totalW + 60) {
      x = (el.clientWidth - totalW) / 2 - minX;
    } else {
      x = Math.max(16 - minX, (el.clientWidth - NODE_W) / 2 - minX);
    }

    if (el.clientHeight >= totalH + 60) {
      y = (el.clientHeight - totalH) / 2 - minY;
    } else {
      y = Math.max(24 - minY, (el.clientHeight - 220) / 2 - minY);
    }

    setView({ k, x, y });
  }, [services]);

  useEffect(() => { centerAt100(); /* initial 100% zoom default */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (factor: number, cx?: number, cy?: number) => {
    const el = ref.current;
    if (!el) return;
    const px = cx ?? el.clientWidth / 2;
    const py = cy ?? el.clientHeight / 2;
    setView((v) => {
      const k = Math.min(2, Math.max(0.3, v.k * factor));
      return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k };
    });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoom(e.deltaY < 0 ? 1.08 : 0.92, e.clientX - r.left, e.clientY - r.top);
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDist = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent, id?: string) => {
    e.stopPropagation();
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (activePointers.current.size === 2) {
      const [a, b] = Array.from(activePointers.current.values());
      if (a && b) {
        lastPinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
        drag.current = null;
        return;
      }
    }

    const s = id ? services.find((x) => x.id === id) : null;
    drag.current = s
      ? { mode: "node", id, sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y, moved: false, snapshot: services }
      : { mode: "pan", sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointers.current.size === 2) {
      const [a, b] = Array.from(activePointers.current.values());
      if (a && b) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinchDist.current && lastPinchDist.current > 0) {
          const factor = dist / lastPinchDist.current;
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const el = ref.current;
          if (el) {
            const r = el.getBoundingClientRect();
            zoom(factor, midX - r.left, midY - r.top);
          }
        }
        lastPinchDist.current = dist;
        return;
      }
    }

    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.mode === "link") { const p = toWorld(e.clientX, e.clientY); setLink((l) => l && { ...l, ...p }); return; }
    if (d.mode === "pan") setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
    else setServices((all) => all.map((s) => (s.id === d.id ? { ...s, x: Math.round((d.ox + dx / view.k) / 8) * 8, y: Math.round((d.oy + dy / view.k) / 8) * 8 } : s)));
  };
  const onPointerUp = (e?: React.PointerEvent) => {
    if (e) {
      activePointers.current.delete(e.pointerId);
    } else {
      activePointers.current.clear();
    }
    if (activePointers.current.size < 2) {
      lastPinchDist.current = null;
    }
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === "link") {
      setLink(null);
      if (e && d.id) {
        const p = toWorld(e.clientX, e.clientY);
        const target = services.find((s) => p.x >= s.x && p.x <= s.x + NODE_W && p.y >= s.y && p.y <= s.y + nodeHeight(s));
        if (target && target.id !== d.id) void state.connect(d.id, target.id);
      }
      return;
    }
    if (d.mode === "node") {
      if (d.moved && d.snapshot) {
        commit(services, d.snapshot);
      } else onSelect(d.id ?? null);
      return;
    } else if (!d.moved) onSelect(null);
  };

  const byId = Object.fromEntries(services.map((s) => [s.id, s]));
  const related = selected ? new Set(edges.filter((e) => e.from === selected || e.to === selected).flatMap((e) => [e.from, e.to])) : null;

  return (
    <div
      ref={ref}
      className="auth-grid relative h-full w-full cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
      style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${24 * view.k}px ${24 * view.k}px` }}
      onPointerDown={(e) => onPointerDown(e)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
          {link && byId[link.from] ? (() => {
            const a = byId[link.from]!;
            const sx = a.x + NODE_W, sy = a.y + NODE_H / 2;
            const c = Math.max(40, Math.abs(link.x - sx) / 2);
            return <path d={`M${sx},${sy} C${sx + c},${sy} ${link.x - c},${link.y} ${link.x},${link.y}`} className="fill-none stroke-primary" strokeWidth={1.5} strokeDasharray="4 4" />;
          })() : null}
          {edges.map((e) => {
            const a = byId[e.from];
            const b = byId[e.to];
            if (!a || !b) return null;
            const ax = a.x + NODE_W, ay = a.y + NODE_H / 2;
            const bx = b.x, by = b.y + NODE_H / 2;
            const flip = bx < ax;
            const sx = flip ? a.x : ax, tx = flip ? b.x + NODE_W : bx;
            const c = Math.max(60, Math.abs(tx - sx) / 2) * (flip ? -1 : 1);
            const d = `M${sx},${ay} C${sx + c},${ay} ${tx - c},${by} ${tx},${by}`;
            const hot = !related || (related.has(e.from) && related.has(e.to) && (e.from === selected || e.to === selected));
            const removable = !!selected && (e.from === selected || e.to === selected);
            const mx = (sx + tx) / 2, my = (ay + by) / 2;
            return (
              <g key={e.id} className={cn("transition-opacity", hot ? "opacity-100" : "opacity-20")}>
                <path d={d} className="fill-none stroke-border" strokeWidth={1.5} />
                <path d={d} className={cn("edge-flow fill-none", hot && selected ? "stroke-primary" : "stroke-muted-foreground/60")} strokeWidth={1.5} strokeDasharray="4 6" />
                <circle cx={tx} cy={by} r={3} className="fill-background stroke-muted-foreground" strokeWidth={1.5} />
                <foreignObject x={mx - 60} y={my - 10} width={120} height={20}>
                  <div className="flex h-5 items-center justify-center gap-0.5">
                    <span className="rounded-sm border bg-background px-1 font-mono text-[9.5px] text-muted-foreground">{e.label}</span>
                    {removable ? (
                      <button
                        aria-label="Remove connection"
                        title="Remove connection"
                        className="pointer-events-auto grid h-4 w-4 place-items-center rounded-sm border bg-background text-muted-foreground hover:text-destructive"
                        onPointerDown={(ev) => ev.stopPropagation()}
                        onPointerUp={(ev) => ev.stopPropagation()}
                        onClick={() => { if (window.confirm("Remove this connection?")) void state.disconnect(e.id); }}
                      ><X className="h-2.5 w-2.5" /></button>
                    ) : null}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
        {services.map((s) => (
          <ServiceNode
            key={s.id}
            s={s}
            selected={selected === s.id}
            dimmed={!!related && !related.has(s.id)}
            onPointerDown={(e) => onPointerDown(e, s.id)}
            onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e); }}
            onKeyDown={(e) => e.key === "Enter" && onSelect(s.id)}
            onLinkStart={(e) => startLink(e, s.id)}
          />
        ))}
      </div>

      {/* Controls: bottom-left dock */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-0.5 rounded-lg border bg-card/95 p-0.5 shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:gap-1 sm:p-1" onPointerDown={(e) => e.stopPropagation()}>
        <CtrlBtn label="Zoom out" onClick={() => zoom(0.85)}><Minus className="h-3.5 w-3.5" /></CtrlBtn>
        <span className="w-9 text-center font-mono text-[9px] text-muted-foreground sm:w-10 sm:text-[10px]">{Math.round(view.k * 100)}%</span>
        <CtrlBtn label="Zoom in" onClick={() => zoom(1.15)}><Plus className="h-3.5 w-3.5" /></CtrlBtn>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <CtrlBtn label="Fit to screen" onClick={fit}><Maximize className="h-3.5 w-3.5" /></CtrlBtn>
        <CtrlBtn label="Undo" onClick={state.undo} disabled={!state.canUndo}><Undo2 className="h-3.5 w-3.5" /></CtrlBtn>
        <CtrlBtn label="Redo" onClick={state.redo} disabled={!state.canRedo}><Redo2 className="h-3.5 w-3.5" /></CtrlBtn>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-3 font-mono text-[10px] text-muted-foreground md:flex">
        <span>drag to pan</span><span>⌘ + scroll to zoom</span><span><Kbd>N</Kbd> new</span>
      </div>
    </div>
  );
}

function CtrlBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30">
      {children}
    </button>
  );
}

const kindIcon = { app: Box, worker: Box, database: HardDrive, cron: Clock };

function ServiceNode({ s, selected, dimmed, onPointerDown, onPointerUp, onKeyDown, onLinkStart }: { s: Service; selected: boolean; dimmed: boolean; onPointerDown: (e: React.PointerEvent) => void; onPointerUp: (e: React.PointerEvent) => void; onKeyDown: (e: React.KeyboardEvent) => void; onLinkStart: (e: React.PointerEvent) => void }) {
  const KindIcon = kindIcon[s.kind];
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${s.name} service`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      className={cn(
        "group absolute cursor-pointer rounded-xl border bg-card shadow-sm transition-[box-shadow,opacity,border-color] hover:border-foreground/25",
        selected && "border-primary ring-4 ring-primary/15",
        dimmed && "opacity-40",
      )}
      style={{ left: s.x, top: s.y, width: NODE_W }}
    >
      <span
        role="button"
        aria-label={`Connect ${s.name} to another service`}
        title="Drag to another service to connect"
        onPointerDown={onLinkStart}
        className="absolute -right-2 z-10 grid h-4 w-4 cursor-crosshair place-items-center rounded-full border bg-background opacity-0 transition-opacity hover:border-primary group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        style={{ top: NODE_H / 2 - 8 }}
      ><span className="h-1.5 w-1.5 rounded-full bg-primary" /></span>
      <div className="px-3.5 pb-3 pt-3" style={{ height: NODE_H }}>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md border bg-surface"><Logo k={s.logo} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{s.name}</p>
            <p className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><KindIcon className="h-2.5 w-2.5" />{s.kind} · {s.replicas}×</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <StatusDot status={s.status} withLabel />
          <span className="font-mono text-[10px] text-muted-foreground">{s.status === "deploying" ? "building a41c9e2" : s.lastDeploy}</span>
        </div>
        {s.status === "deploying" ? (
          <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-muted"><div className="deploy-bar h-full w-1/3 bg-score-mid" /></div>
        ) : null}
      </div>
      {s.domain || s.volume ? (
        <div className="flex h-7 items-center gap-1.5 rounded-b-xl border-t bg-surface/60 px-3.5 font-mono text-[10px] text-muted-foreground">
          {s.domain ? <Globe className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
          <span className="truncate">{s.domain ?? s.volume}</span>
        </div>
      ) : null}
    </div>
  );
}
