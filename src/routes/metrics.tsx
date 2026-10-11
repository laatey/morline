import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { MetricsGrid } from "@/components/moor/panels";
import { Logo, Sparkline, StatusDot } from "@/components/moor/primitives";
import type { Service } from "@/lib/platform-data";
import { aggregate } from "@/components/moor/panels";
import { useMetrics, useServices, useUsage } from "@/lib/workspace";

export const Route = createFileRoute("/metrics")({
  head: () => ({
    meta: [
      { title: "Metrics — Morline" },
      { name: "description", content: "CPU, memory, network and cost across every service." },
      { property: "og:title", content: "Metrics — Morline" },
      {
        property: "og:description",
        content: "CPU, memory, network and cost across every service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MetricsPage,
});

function MetricsPage() {
  const services = useServices().data ?? [];
  const usage = useUsage().data;
  const series = useMetrics("1h").data?.series ?? [];
  return (
    <WorkspaceShell title="Metrics">
      <div className="scroll-area h-full overflow-y-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5">
          <div>
            <h1 className="text-xl font-semibold">Resource usage</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Environment totals over the last hour.
            </p>
          </div>
          <div className="flex gap-6 font-mono text-xs">
            <Stat label="Month to date" value={`$${(usage?.spentUsd ?? 0).toFixed(2)}`} />
            <Stat label="Projected" value={`$${(usage?.estimatedUsd ?? 0).toFixed(2)}`} />
            <Stat label="Spend limit" value={usage?.limitUsd ? `$${usage.limitUsd}` : "None"} />
          </div>
        </div>
        <div className="border-b">
          <MetricsGrid />
        </div>
        <p className="label-caps px-4 pb-2 pt-5">By service</p>
        <table className="w-full text-sm">
          <thead className="border-y font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-normal">Service</th>
              <th className="px-4 text-left font-normal">CPU</th>
              <th className="px-4 text-left font-normal">Memory</th>
              <th className="hidden px-4 text-left font-normal md:table-cell">Trend</th>
              <th className="px-4 text-right font-normal">Est. / mo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {services.map((s) => (
              <Row
                key={s.id}
                s={s}
                data={
                  aggregate(
                    series.filter((x) => x.serviceId === s.id),
                    "cpu",
                  )?.data ?? []
                }
              />
            ))}
            {!services.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No services in this environment yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </WorkspaceShell>
  );
}

function Row({ s, data }: { s: Service; data: number[] }) {
  return (
    <tr className="hover:bg-accent/40">
      <td className="px-4 py-2.5">
        <span className="flex items-center gap-2">
          <Logo k={s.logo} />
          {s.name}
          <StatusDot status={s.status} />
        </span>
      </td>
      <td className="px-4 font-mono text-xs">{s.cpu.toFixed(2)} vCPU</td>
      <td className="px-4 font-mono text-xs">{Math.round(s.mem)} MB</td>
      <td className="hidden w-48 px-4 md:table-cell">
        {data.length > 1 ? (
          <Sparkline data={data} className="h-6" fill={false} />
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 text-right font-mono text-xs">${(s.cpu * 9 + s.mem / 180).toFixed(2)}</td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className="mt-1 text-base">{value}</p>
    </div>
  );
}
