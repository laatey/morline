import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { actionStats, type AssistantAction } from "@/lib/assistant-actions";
import { DiffView } from "@/components/moor/diff-view";

const mark = { create: "A", update: "M", delete: "D" } as const;
const markTone = {
  create: "text-[var(--diff-add)]",
  update: "text-muted-foreground",
  delete: "text-[var(--diff-del)]",
} as const;

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2 hover:text-foreground"
    >
      {children}
    </a>
  );
}

/** What happened once an action has been applied, as plain links. */
export function ActionOutcome({ action }: { action: AssistantAction }) {
  const r = action.result;
  if (!r) return null;
  const sha = (s?: string) => (s ? s.slice(0, 7) : "");
  const parts: React.ReactNode[] = [];
  if (action.status === "applied") {
    if (r.repo)
      parts.push(
        <Link key="repo" href={r.repo.url}>
          {r.repo.fullName}
        </Link>,
      );
    if (r.pullRequestUrl)
      parts.push(
        <Link key="pr" href={r.pullRequestUrl}>
          Pull request #{r.pullRequestNumber}
        </Link>,
      );
    else if (r.commitUrl)
      parts.push(
        <Link key="c" href={r.commitUrl}>
          Commit {sha(r.commitSha)}
        </Link>,
      );
    if (r.deploymentId) parts.push(<span key="d">Deploying</span>);
  }
  if (action.status === "reverted") {
    if (r.revertCommitUrl)
      parts.push(
        <Link key="rc" href={r.revertCommitUrl}>
          Revert commit
        </Link>,
      );
    if (r.serviceRemoved && r.repo)
      parts.push(
        <span key="kept">
          Service removed, repository kept at <Link href={r.repo.url}>{r.repo.fullName}</Link>
        </span>,
      );
  }
  if (!parts.length) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {parts.map((p, i) => (
        <span key={i}>{p}</span>
      ))}
    </p>
  );
}

export function ChangeReview({
  action,
  busy,
  onApply,
  onDismiss,
  onRevert,
  onClose,
}: {
  action: AssistantAction;
  busy: boolean;
  onApply: (mode?: "commit" | "pr") => void;
  onDismiss: () => void;
  onRevert: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [action.id]);
  const file = action.diff[selected] ?? action.diff[0];
  const { files, additions, deletions } = actionStats(action);
  const isApp = action.type === "create_app";
  const canAct = action.status === "pending" || action.status === "failed";
  const generated = (action.payload.envVars ?? []).filter((v) => v.generate).map((v) => v.key);
  const required = (action.payload.envVars ?? []).filter((v) => !v.generate);
  const working = busy || action.status === "applying";

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-[min(1000px,100vw)] flex-col gap-0 p-0 sm:max-w-none"
      >
        <div className="shrink-0 border-b px-5 py-4 pr-12">
          <SheetTitle className="text-sm font-semibold">{action.title}</SheetTitle>
          <SheetDescription className="mt-1 font-mono text-[11px] text-muted-foreground">
            {isApp
              ? "New private repository"
              : `${action.payload.repo ?? ""} · ${action.payload.branch ?? ""}`}
            {" · "}
            {files} {files === 1 ? "file" : "files"}
            <span className="ml-2 text-[var(--diff-add)]">+{additions}</span>
            <span className="ml-1.5 text-[var(--diff-del)]">−{deletions}</span>
          </SheetDescription>
        </div>

        {isApp && (generated.length || required.length) ? (
          <div className="shrink-0 space-y-1 border-b px-5 py-3 text-xs text-muted-foreground">
            {generated.length ? (
              <p>
                Generated for you and stored as secrets:{" "}
                <span className="font-mono text-foreground">{generated.join(", ")}</span>
              </p>
            ) : null}
            {required.length ? (
              <p>
                You will need to set:{" "}
                <span className="font-mono text-foreground">
                  {required.map((v) => v.key).join(", ")}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <ul className="scroll-area max-h-40 shrink-0 divide-y overflow-y-auto border-b md:max-h-none md:w-72 md:border-b-0 md:border-r">
            {action.diff.map((f, i) => (
              <li key={f.path}>
                <button
                  onClick={() => setSelected(i)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-accent/50",
                    i === selected && "bg-accent",
                  )}
                >
                  <span className={cn("w-3 shrink-0 font-mono text-[10px]", markTone[f.action])}>
                    {mark[f.action]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{f.path}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    +{f.additions} −{f.deletions}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="scroll-area min-h-0 min-w-0 flex-1 overflow-y-auto">
            {file ? (
              <>
                <p className="sticky top-0 z-10 border-b bg-background px-4 py-2 font-mono text-[11px] text-muted-foreground">
                  {file.path}
                </p>
                <DiffView file={file} />
              </>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t px-5 py-3">
          {action.status === "failed" && action.result?.error ? (
            <p className="text-xs text-destructive">{action.result.error}</p>
          ) : null}
          {action.result?.revertError ? (
            <p className="text-xs text-destructive">{action.result.revertError}</p>
          ) : null}
          <ActionOutcome action={action} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {action.status === "dismissed" ? (
              <span className="mr-auto text-xs text-muted-foreground">
                Dismissed. If the branch moved on, ask again to get a fresh proposal.
              </span>
            ) : null}
            {action.status === "reverted" ? (
              <span className="mr-auto text-xs text-muted-foreground">Reverted</span>
            ) : null}
            {canAct ? (
              <>
                <Button variant="ghost" size="sm" disabled={working} onClick={onDismiss}>
                  Dismiss
                </Button>
                {!isApp ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={working}
                    onClick={() => onApply("pr")}
                  >
                    Open pull request
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  disabled={working}
                  onClick={() => onApply(isApp ? undefined : "commit")}
                >
                  {working
                    ? "Applying…"
                    : action.status === "failed"
                      ? "Try again"
                      : isApp
                        ? "Create and deploy"
                        : "Commit and deploy"}
                </Button>
              </>
            ) : null}
            {action.status === "applying" && !canAct ? (
              <span className="text-xs text-muted-foreground">Applying…</span>
            ) : null}
            {action.status === "applied" && action.reversible ? (
              <Button variant="outline" size="sm" disabled={working} onClick={onRevert}>
                {working ? "Undoing…" : "Undo"}
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
