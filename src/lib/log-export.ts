export type LogFormat = "text" | "json" | "csv";

export type ExportLine = {
  timestamp: string;
  level: string;
  message: string;
  serviceName?: string;
};

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function formatLogs(lines: ExportLine[], format: LogFormat): string {
  if (format === "json") return JSON.stringify(lines, null, 2);
  if (format === "csv") {
    const withSvc = lines.some((l) => l.serviceName);
    const head = withSvc
      ? ["timestamp", "level", "service", "message"]
      : ["timestamp", "level", "message"];
    const rows = lines.map((l) =>
      (withSvc
        ? [l.timestamp, l.level, l.serviceName, l.message]
        : [l.timestamp, l.level, l.message]
      )
        .map(csvCell)
        .join(","),
    );
    return [head.join(","), ...rows].join("\n");
  }
  return lines
    .map(
      (l) =>
        `${l.timestamp} ${l.level.toUpperCase().padEnd(5)} ${l.serviceName ? `[${l.serviceName}] ` : ""}${l.message}`,
    )
    .join("\n");
}

const EXT: Record<LogFormat, { ext: string; mime: string }> = {
  text: { ext: "txt", mime: "text/plain" },
  json: { ext: "json", mime: "application/json" },
  csv: { ext: "csv", mime: "text/csv" },
};

export function downloadLogs(lines: ExportLine[], format: LogFormat, name: string) {
  const { ext, mime } = EXT[format];
  const blob = new Blob([formatLogs(lines, format)], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `${name}-${stamp}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
