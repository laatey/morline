import { useState } from "react";
import { cn } from "@/lib/utils";

export type DiffLine = {
  type: "ctx" | "add" | "del";
  text: string;
  oldNo: number | null;
  newNo: number | null;
};
export type DiffHunk = { oldStart: number; newStart: number; lines: DiffLine[] };
export type FileDiff = {
  path: string;
  action: "create" | "update" | "delete";
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
};

const MAX_LINES = 1500;

const tone: Record<DiffLine["type"], string> = {
  ctx: "",
  add: "bg-[color-mix(in_oklch,var(--diff-add)_14%,transparent)]",
  del: "bg-[color-mix(in_oklch,var(--diff-del)_14%,transparent)]",
};
const signColor: Record<DiffLine["type"], string> = {
  ctx: "text-muted-foreground/40",
  add: "text-[var(--diff-add)]",
  del: "text-[var(--diff-del)]",
};

/** Unified diff, one file. Flat rows with line numbers; nothing decorative. */
export function DiffView({ file }: { file: FileDiff }) {
  const [all, setAll] = useState(false);
  const total = file.hunks.reduce((n, h) => n + h.lines.length, 0);
  let budget = all ? Infinity : MAX_LINES;

  if (!total) return <p className="px-4 py-6 text-xs text-muted-foreground">No textual changes.</p>;

  return (
    <div className="overflow-x-auto font-mono text-[11px] leading-5">
      <div className="min-w-max">
        {file.hunks.map((h, hi) => {
          const lines = h.lines.slice(0, Math.max(0, budget));
          budget -= lines.length;
          return (
            <div key={hi} className={cn(hi > 0 && "border-t border-dashed")}>
              {lines.map((l, li) => (
                <div key={li} className={cn("flex", tone[l.type])}>
                  <span className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/60">
                    {l.oldNo ?? ""}
                  </span>
                  <span className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/60">
                    {l.newNo ?? ""}
                  </span>
                  <span className={cn("w-4 shrink-0 select-none text-center", signColor[l.type])}>
                    {l.type === "add" ? "+" : l.type === "del" ? "−" : ""}
                  </span>
                  <span className="whitespace-pre pr-6">{l.text || " "}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {!all && total > MAX_LINES ? (
        <button
          onClick={() => setAll(true)}
          className="w-full border-t px-4 py-2 text-left font-sans text-xs text-muted-foreground hover:text-foreground"
        >
          Show all {total} lines
        </button>
      ) : null}
    </div>
  );
}
