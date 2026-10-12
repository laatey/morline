import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Clock, History, Plus, Send, Stop, Trash, Close } from "fluid-icons/react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, apiStream } from "@/lib/api";
import { useEnvId } from "@/lib/workspace";
import {
  actionStats,
  applyAction,
  dismissAction,
  revertAction,
  type AssistantAction,
} from "@/lib/assistant-actions";
import { ActionOutcome, ChangeReview } from "@/components/moor/change-review";
import type { AssistantContext } from "@/lib/assistant-context";
import { toast } from "sonner";

// Threads persist via /assistant/threads.
type Msg = {
  role: "user" | "agent";
  text: string;
  context?: AssistantContext;
  actions?: AssistantAction[];
};
type Thread = { id: string; title: string; when: string; messages: Msg[] };

const prompts = [
  "Build a REST API with login and a SQLite database, and deploy it",
  "Why did the latest deploy fail?",
  "Review environment variables",
];

type RawMsg = {
  role?: string;
  text?: string;
  content?: string;
  context?: AssistantContext;
  actions?: AssistantAction[];
};
type RawThread = {
  id: string;
  title?: string;
  updatedAt?: string;
  createdAt?: string;
  messages?: RawMsg[];
};
const ago = (iso?: string) => {
  if (!iso) return "now";
  const m = Math.max(0, (Date.now() - Date.parse(iso)) / 60000);
  return m < 1
    ? "now"
    : m < 60
      ? `${Math.floor(m)}m`
      : m < 1440
        ? `${Math.floor(m / 60)}h`
        : `${Math.floor(m / 1440)}d`;
};
const toMsg = (m: RawMsg): Msg => ({
  role: m.role === "user" ? "user" : "agent",
  text: m.text ?? m.content ?? "",
  ...(m.context ? { context: m.context } : {}),
  ...(m.actions?.length ? { actions: m.actions } : {}),
});
const toThread = (t: RawThread): Thread => ({
  id: t.id,
  title: t.title || "New conversation",
  when: ago(t.updatedAt ?? t.createdAt),
  messages: (t.messages ?? []).map(toMsg),
});
const unwrap = (r: unknown): RawThread[] =>
  Array.isArray(r)
    ? r
    : ((r as { threads?: RawThread[]; data?: RawThread[] })?.threads ??
      (r as { data?: RawThread[] })?.data ??
      []);
const fresh = (): Thread => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  when: "now",
  messages: [],
});

export function AiAssistant({
  onClose,
  initialPrompt,
}: {
  onClose: () => void;
  initialPrompt?: { text: string; key: number; context?: AssistantContext } | null;
}) {
  const [threads, setThreads] = useState<Thread[]>(() => [fresh()]);
  const [activeId, setActiveId] = useState(() => threads[0]!.id);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState("");
  const [review, setReview] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const envId = useEnvId();
  const env = useQuery({
    queryKey: ["assistant-env", envId],
    queryFn: () => api<{ name: string }>(`/environments/${envId}`),
    enabled: !!envId,
  });
  const stopRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const active = threads.find((t) => t.id === activeId) ?? threads[0]!;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, thinking]);
  useEffect(
    () => () => {
      stopRef.current?.();
    },
    [],
  );

  const load = async () => {
    const list = unwrap(await api("/assistant/threads")).map(toThread);
    return list;
  };
  const seeded = useRef(false);
  useEffect(() => {
    load()
      .then((list) => {
        if (!list.length) return;
        if (seeded.current)
          setThreads((l) => [
            ...l.filter((t) => t.messages.length && !list.some((x) => x.id === t.id)),
            ...list,
          ]);
        else {
          setThreads(list);
          setActiveId(list[0]!.id);
        }
      })
      .catch(() => toast.error("Could not load conversations"));
  }, []);
  useEffect(() => {
    if (!initialPrompt?.text) return;
    seeded.current = true;
    const t = fresh();
    setThreads((l) => [t, ...l]);
    setActiveId(t.id);
    setView("chat");
    send(initialPrompt.text, t.id, initialPrompt.context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt?.key]);

  const update = (id: string, fn: (t: Thread) => Thread) =>
    setThreads((l) => l.map((t) => (t.id === id ? fn(t) : t)));
  const send = (text: string, threadId?: string, context?: AssistantContext) => {
    const q = text.trim();
    if (!q || (thinking && !threadId)) return;
    const id = threadId ?? active.id;
    update(id, (t) => ({
      ...t,
      title: t.messages.length ? t.title : q.slice(0, 40),
      when: "now",
      messages: [...t.messages, { role: "user", text: q, ...(context ? { context } : {}) }],
    }));
    setInput("");
    setThinking(true);
    const cancelled = { v: false };
    stopRef.current = () => {
      cancelled.v = true;
    };
    let replied = false;
    const say = (text: string, raw?: RawMsg) => {
      replied = true;
      update(id, (t) => ({
        ...t,
        messages: [...t.messages, raw ? toMsg(raw) : { role: "agent", text }],
      }));
    };
    apiStream(`/assistant/threads/${id}/messages`, {
      body: { text: q, ...(context ? { context } : {}) },
      onEvent: (event, data) => {
        if (cancelled.v) return;
        if (event === "status") setStatus(String(data["text"] ?? ""));
        else if (event === "done")
          say(String(data["text"] ?? ""), (data["message"] as RawMsg | undefined) ?? undefined);
        else if (event === "error") say(String(data["message"] ?? "Something went wrong."));
      },
    })
      .then(async () => {
        if (cancelled.v || replied) return;
        const t = (await load()).find((x) => x.id === id);
        if (t) update(id, () => t);
      })
      .catch((e) => {
        if (!cancelled.v) say((e as Error).message || "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled.v) {
          setThinking(false);
          setStatus("");
        }
      });
  };
  const stop = () => {
    stopRef.current?.();
    setThinking(false);
    setStatus("");
    update(active.id, (t) => ({
      ...t,
      messages: [...t.messages, { role: "agent", text: "Stopped." }],
    }));
  };
  const patchAction = (next: AssistantAction) =>
    setThreads((l) =>
      l.map((t) => ({
        ...t,
        messages: t.messages.map((m) =>
          m.actions?.some((a) => a.id === next.id)
            ? { ...m, actions: m.actions.map((a) => (a.id === next.id ? next : a)) }
            : m,
        ),
      })),
    );
  const allActions = threads.flatMap((t) => t.messages.flatMap((m) => m.actions ?? []));
  const reviewing = allActions.find((a) => a.id === review) ?? null;
  const runAction = async (a: AssistantAction, call: () => Promise<AssistantAction>) => {
    setBusyAction(a.id);
    patchAction({ ...a, status: "applying" });
    try {
      patchAction(await call());
    } catch (e) {
      toast.error((e as Error).message || "That did not work");
      const latest = await api<AssistantAction>(`/assistant/actions/${a.id}`).catch(() => null);
      patchAction(latest ?? a);
    } finally {
      setBusyAction(null);
    }
  };
  const newThread = () => {
    const t = fresh();
    setThreads((l) => [t, ...l]);
    setActiveId(t.id);
    setView("chat");
  };

  return (
    <aside className="absolute bottom-2.5 right-2.5 top-2.5 z-20 flex w-[min(380px,calc(100%-1.25rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl animate-in slide-in-from-right-6 fade-in duration-200">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        {view === "history" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Back to chat"
            onClick={() => setView("chat")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {view === "history" ? "Conversations" : active.title}
          </p>
          <p className="truncate font-mono text-[9px] text-muted-foreground">
            {env.data?.name ?? "Environment"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="New conversation"
          onClick={newThread}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Conversation history"
          onClick={() => setView(view === "history" ? "chat" : "history")}
        >
          <History className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Close assistant"
          onClick={onClose}
        >
          <Close className="h-3.5 w-3.5" />
        </Button>
      </div>

      {view === "history" ? (
        <ul className="scroll-area min-h-0 flex-1 divide-y overflow-y-auto">
          {threads.map((t) => (
            <li key={t.id} className="group flex items-center gap-2 px-3 hover:bg-accent/50">
              <button
                className="min-w-0 flex-1 py-2.5 text-left"
                onClick={() => {
                  setActiveId(t.id);
                  setView("chat");
                }}
              >
                <span
                  className={cn(
                    "block truncate text-xs font-medium",
                    t.id === activeId && "text-primary",
                  )}
                >
                  {t.title}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {t.messages.length} messages · {t.when}
                </span>
              </button>
              <button
                aria-label={`Delete ${t.title}`}
                className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                onClick={() => {
                  if (t.messages.length)
                    api(`/assistant/threads/${t.id}`, { method: "DELETE" }).catch(() =>
                      toast.error("Could not delete conversation"),
                    );
                  setThreads((l) => {
                    const n = l.filter((x) => x.id !== t.id);
                    if (!n.length) n.push(fresh());
                    if (t.id === activeId) setActiveId(n[0]!.id);
                    return n;
                  });
                }}
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {!active.messages.length ? (
            <>
              <div className="mx-auto flex max-w-[300px] flex-col items-center text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl border bg-surface">
                  <Bot className="h-4 w-4 text-primary" />
                </span>
                <h2 className="mt-3 font-display text-base font-semibold">
                  What should we build or fix?
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Ask about services, deploys and configuration, or have me build an API or change
                  an app's code. You review every change before it ships.
                </p>
              </div>
              <div className="mt-6 space-y-1.5">
                {prompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="flex w-full items-center gap-2 rounded-lg border bg-background/40 px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {active.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-background",
                    )}
                  >
                    {m.role === "agent" ? (
                      <div className="prose prose-xs prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-1.5 last:mb-0 leading-5">{children}</p>
                            ),
                            h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
                            h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
                            h3: ({ children }) => <p className="mb-1 font-medium">{children}</p>,
                            ul: ({ children }) => (
                              <ul className="mb-1.5 ml-3 list-disc space-y-0.5">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-1.5 ml-3 list-decimal space-y-0.5">{children}</ol>
                            ),
                            li: ({ children }) => <li className="leading-5">{children}</li>,
                            code: ({ children, className }) =>
                              className ? (
                                <pre className="my-1.5 overflow-x-auto rounded-md bg-muted/60 px-2.5 py-2 font-mono text-[10px] leading-relaxed">
                                  <code>{children}</code>
                                </pre>
                              ) : (
                                <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[10px]">
                                  {children}
                                </code>
                              ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">{children}</strong>
                            ),
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2 hover:opacity-80"
                              >
                                {children}
                              </a>
                            ),
                            hr: () => <hr className="my-2 border-border/50" />,
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <>
                        {m.context ? (
                          <span className="mb-1.5 flex items-center gap-1.5 border-b border-primary-foreground/20 pb-1.5 text-[10px]">
                            <Bot className="h-3 w-3" />
                            {m.context.serviceName} · Failed deployment
                          </span>
                        ) : null}
                        {m.text}
                      </>
                    )}
                    {m.actions?.length ? (
                      <div className="mt-2.5 space-y-2.5 border-t pt-2.5">
                        {m.actions.map((a) => {
                          const st = actionStats(a);
                          return (
                            <div key={a.id} className="space-y-1.5">
                              <p className="text-xs font-medium">{a.title}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {st.files} {st.files === 1 ? "file" : "files"}
                                <span className="ml-2 text-[var(--diff-add)]">+{st.additions}</span>
                                <span className="ml-1.5 text-[var(--diff-del)]">
                                  −{st.deletions}
                                </span>
                                <span className="ml-2">
                                  {a.status === "pending"
                                    ? "Waiting for review"
                                    : a.status === "applying"
                                      ? "Applying"
                                      : a.status === "applied"
                                        ? "Applied"
                                        : a.status === "failed"
                                          ? "Failed"
                                          : a.status === "reverted"
                                            ? "Reverted"
                                            : "Dismissed"}
                                </span>
                              </p>
                              {a.status === "failed" && a.result?.error ? (
                                <p className="text-[11px] text-destructive">{a.result.error}</p>
                              ) : null}
                              <ActionOutcome action={a} />
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant={a.status === "pending" ? "default" : "outline"}
                                  className="h-7 px-2.5 text-[11px]"
                                  onClick={() => setReview(a.id)}
                                >
                                  {a.status === "pending" || a.status === "failed"
                                    ? "Review changes"
                                    : "View changes"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {thinking ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  {status || "Thinking"}…
                </p>
              ) : null}
              <div ref={endRef} />
            </div>
          )}
        </div>
      )}

      {view === "chat" ? (
        <div className="p-3 pt-0">
          <div className="rounded-xl border bg-background p-2 shadow-sm">
            <textarea
              aria-label="Ask Morline Agent"
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about this environment…"
              className="w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="px-1 font-mono text-[9px] text-muted-foreground">
                Enter to send · Shift+Enter for newline
              </span>
              {thinking ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  aria-label="Stop"
                  onClick={stop}
                >
                  <Stop className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Send message"
                  disabled={!input.trim()}
                  onClick={() => send(input)}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {reviewing ? (
        <ChangeReview
          action={reviewing}
          busy={busyAction === reviewing.id}
          onClose={() => setReview(null)}
          onApply={(mode) => runAction(reviewing, () => applyAction(reviewing.id, mode))}
          onDismiss={() => runAction(reviewing, () => dismissAction(reviewing.id))}
          onRevert={() => runAction(reviewing, () => revertAction(reviewing.id))}
        />
      ) : null}
    </aside>
  );
}
