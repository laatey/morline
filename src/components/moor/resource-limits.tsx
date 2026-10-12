import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";

type Capacity = {
  cpu: { min: number; step: number };
  memory: { minMb: number; stepMb: number };
  service: {
    effectiveCpus: number;
    effectiveMemoryMb: number;
    maxCpus: number;
    maxMemoryMb: number;
  };
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmtCpu = (n: number) => `${round1(n)} vCPU`;
const fmtMem = (mb: number) =>
  mb >= 1024 ? `${Number((mb / 1024).toFixed(2))} GB` : `${Math.round(mb)} MB`;

function Limit({
  label,
  value,
  display,
  free,
  min,
  max,
  step,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  display: string;
  free: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  return (
    <div className="space-y-3 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <p className="text-muted-foreground">
          {label}: <span className="font-semibold text-foreground">{display}</span>
        </p>
        <p className="text-xs text-muted-foreground">{free}</p>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={Math.max(max, min)}
        step={step}
        disabled={max <= min}
        onValueChange={([v]) => onChange(v!)}
        onValueCommit={([v]) => onCommit(v!)}
      />
    </div>
  );
}

/** CPU and memory for one service. The ceiling is whatever the host has left, not a plan. */
export function ResourceLimits({ serviceId }: { serviceId: string }) {
  const qc = useQueryClient();
  const cap = useQuery({
    queryKey: ["capacity", serviceId],
    queryFn: () => api<Capacity>(`/infrastructure/capacity?serviceId=${serviceId}`),
    retry: false,
  }).data;
  const [cpu, setCpu] = useState<number | null>(null);
  const [mem, setMem] = useState<number | null>(null);
  useEffect(() => {
    if (!cap) return;
    setCpu(cap.service.effectiveCpus);
    setMem(cap.service.effectiveMemoryMb);
  }, [cap]);

  if (!cap || cpu === null || mem === null) return null;
  const maxCpu = Math.max(cap.service.maxCpus, cap.service.effectiveCpus);
  const maxMem = Math.max(cap.service.maxMemoryMb, cap.service.effectiveMemoryMb);

  const save = async (settings: Record<string, number>) => {
    try {
      await api(`/services/${serviceId}`, { method: "PATCH", body: { settings } });
      toast.success("Resources updated");
    } catch (e) {
      toast.error((e as Error).message || "Could not update resources");
    } finally {
      void qc.invalidateQueries({ queryKey: ["capacity"] });
      void qc.invalidateQueries({ queryKey: ["service", serviceId] });
    }
  };

  return (
    <div className="divide-y">
      <Limit
        label="CPU"
        value={cpu}
        display={fmtCpu(cpu)}
        free={`${fmtCpu(Math.max(0, maxCpu - cpu))} free on host`}
        min={cap.cpu.min}
        max={maxCpu}
        step={cap.cpu.step}
        onChange={(v) => setCpu(round1(v))}
        onCommit={(v) => save({ cpuLimit: round1(v) })}
      />
      <Limit
        label="Memory"
        value={mem}
        display={fmtMem(mem)}
        free={`${fmtMem(Math.max(0, maxMem - mem))} free on host`}
        min={cap.memory.minMb}
        max={maxMem}
        step={cap.memory.stepMb}
        onChange={setMem}
        onCommit={(v) => save({ memoryLimitMb: Math.round(v) })}
      />
    </div>
  );
}
