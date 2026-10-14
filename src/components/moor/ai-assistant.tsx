import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Close,
  Edit,
  Eye,
  FileCode,
  Lightbulb,
  Plus,
  Stop,
  Trash,
} from "fluid-icons/react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api, apiStream } from "@/lib/api";
import { useEnvId, useSelection, useServices } from "@/lib/workspace";
import { Logo } from "@/components/moor/primitives";
import type { LogoKey } from "@/lib/platform-data";
import {
  actionStats,
  applyAction,
  deployLabel,
  dismissAction,
  revertAction,
  type AssistantAction,
} from "@/lib/assistant-actions";
import { ActionOutcome, ChangeReview } from "@/components/moor/change-review";
import type { AssistantContext } from "@/lib/assistant-context";

// Threads persist via /assistant/threads.
type Chip = { id?: string; name: string; logo?: string };
type Msg = {
  id?: string;
  role: "user" | "agent";
  text: string;
  context?: AssistantContext;
  chips?: Chip[];
  actions?: AssistantAction[];
  /** What the assistant did to produce this reply. Saved with the message, so it survives a refresh. */
  steps?: string[];
  durationMs?: number;
};
type Thread = {
  id: string;
  title: string;
  when: string;
  messages: Msg[];
  /** Older messages exist on the server and load as the user scrolls up. */
  hasMore?: boolean;
};

const suggestions = [
  "Build a REST API with login and a SQLite database, and deploy it",
  "Add a /health endpoint to one of my services",
  "Why did the latest deploy fail?",
];

type RawContext =
  AssistantContext | { type?: string; id?: string; label?: string; logo?: string }[];
type RawMsg = {
  id?: string;
  role?: string;
  text?: string;
  content?: string;
  context?: RawContext;
  actions?: AssistantAction[];
  toolCalls?: { steps?: string[]; durationMs?: number } | unknown[] | null;
};
type RawThread = {
  id: string;
  title?: string;
  updatedAt?: string;
  createdAt?: string;
  messages?: RawMsg[];
  hasMoreMessages?: boolean;
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
const toMsg = (m: RawMsg): Msg => {
  const chips: Chip[] = Array.isArray(m.context)
    ? m.context
        .filter((c) => !!c.label)
        .map((c) => ({
          name: c.label!,
          ...(c.id ? { id: c.id } : {}),
          ...(c.logo ? { logo: c.logo } : {}),
        }))
    : [];
  const work = m.toolCalls && !Array.isArray(m.toolCalls) ? m.toolCalls : null;
  return {
    ...(m.id ? { id: m.id } : {}),
    role: m.role === "user" ? "user" : "agent",
    text: m.text ?? m.content ?? "",
    ...(m.context && !Array.isArray(m.context) ? { context: m.context } : {}),
    ...(chips.length ? { chips } : {}),
    ...(m.actions?.length ? { actions: m.actions } : {}),
    ...(work?.steps?.length ? { steps: work.steps } : {}),
    ...(work?.durationMs ? { durationMs: work.durationMs } : {}),
  };
};
const toThread = (t: RawThread): Thread => ({
  id: t.id,
  title: t.title || "New conversation",
  when: ago(t.updatedAt ?? t.createdAt),
  messages: (t.messages ?? []).map(toMsg),
  ...(t.hasMoreMessages ? { hasMore: true } : {}),
});
const unwrap = (r: unknown): RawThread[] =>
  Array.isArray(r)
    ? r
    : ((r as { threads?: RawThread[]; data?: RawThread[] })?.threads ??
      (r as { data?: RawThread[] })?.data ??
      []);
const fresh = (): Thread => ({
  id: crypto.randomUUID(),
  title: "New chat",
  when: "now",
  messages: [],
});

const statusLabel: Record<string, string> = {
  pending: "Waiting for review",
  applying: "Applying",
  applied: "Applied",
  failed: "Failed",
  reverted: "Reverted",
  dismissed: "Dismissed",
};

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-dashed border-muted-foreground" />
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        h1: ({ children }) => (
          <h2 className="mb-2 mt-5 text-[15px] font-semibold first:mt-0">{children}</h2>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-5 text-[15px] font-semibold first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1.5 mt-4 text-sm font-semibold first:mt-0">{children}</h3>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 ml-5 list-disc space-y-1.5 marker:text-muted-foreground">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-5 list-decimal space-y-1.5 marker:text-muted-foreground">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ children, className }) =>
          className ? (
            <pre className="my-3 overflow-x-auto rounded-lg border bg-muted/40 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed">
              <code>{children}</code>
            </pre>
          ) : (
            <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[12px]">
              {children}
            </code>
          ),
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
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
        hr: () => <hr className="my-4 border-border/60" />,
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border-b px-2 py-1.5 font-medium">{children}</th>,
        td: ({ children }) => <td className="border-b px-2 py-1.5">{children}</td>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

/** Reading steps get an eye; everything else (planning, writing, thinking) gets a bulb. */
function StepIcon({ text }: { text: string }) {
  const Icon = /^(read|review|look|check|fetch|inspect|scan)/i.test(text)
    ? Eye
    : /^(writ|edit|creat|delet|updat|chang|modif|apply)/i.test(text)
      ? Edit
      : Lightbulb;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}

const took = (ms?: number) => {
  if (!ms) return null;
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

/** The work behind a finished reply, collapsed by default. */
function Steps({ steps, durationMs }: { steps: string[]; durationMs?: number }) {
  const [open, setOpen] = useState(false);
  const t = took(durationMs);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <span>
          {t ? `Worked for ${t}` : "Worked"} · {steps.length}{" "}
          {steps.length === 1 ? "step" : "steps"}
        </span>
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
      </button>
      {open ? (
        <ul className="mt-2 space-y-2 text-[13px] text-muted-foreground">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <StepIcon text={s} />
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A service shown as context: its own logo, not a generic icon. */
function ServiceChipIcon({ logo }: { logo?: string | undefined }) {
  return <Logo k={(logo || "generic") as LogoKey} className="h-3.5 w-3.5" />;
}

function ActionRows({
  actions,
  onReview,
  onFix,
  fixing,
}: {
  actions: AssistantAction[];
  onReview: (id: string) => void;
  onFix: (a: AssistantAction) => void;
  fixing: boolean;
}) {
  return (
    <div className="mt-4">
      {actions.map((a) => {
        const st = actionStats(a);
        const open = a.status === "pending" || a.status === "failed";
        return (
          <div key={a.id} className="flex items-start gap-3 border-t py-3">
            <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[13px] font-medium leading-5">{a.title}</p>
              <p className="flex flex-wrap items-center gap-x-2.5 font-mono text-[11px] text-muted-foreground">
                <span>
                  {st.files} {st.files === 1 ? "file" : "files"}
                </span>
                <span className="text-[var(--diff-add)]">+{st.additions}</span>
                <span className="text-[var(--diff-del)]">−{st.deletions}</span>
                <span
                  className={cn(
                    "font-sans",
                    deployLabel(a)?.tone === "bad" && "text-destructive",
                    deployLabel(a)?.tone === "good" && "text-[var(--diff-add)]",
                  )}
                >
                  {deployLabel(a)?.text ?? statusLabel[a.status] ?? a.status}
                </span>
              </p>
              {deployLabel(a)?.tone === "bad" && a.deployment?.error ? (
                <p className="line-clamp-2 text-xs text-destructive">{a.deployment.error}</p>
              ) : null}
              {a.status === "failed" && a.result?.error ? (
                <p className="text-xs text-destructive">{a.result.error}</p>
              ) : null}
              <ActionOutcome action={a} />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {deployLabel(a)?.tone === "bad" ? (
                <Button
                  size="sm"
                  className="h-8 rounded-full px-3.5 text-xs"
                  disabled={fixing}
                  onClick={() => onFix(a)}
                >
                  Fix and deploy
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={a.status === "pending" ? "default" : "outline"}
                className="h-8 rounded-full px-3.5 text-xs"
                onClick={() => onReview(a.id)}
              >
                {open ? "Review" : "View"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AiAssistant({
  onClose,
  initialPrompt,
  prefill,
  addService,
}: {
  onClose: () => void;
  /** Adds a service to the composer as a context chip ("Add to chat" on the canvas). */
  addService?: { id: string; name: string; logo?: string; key: number } | null;
  /** Sends immediately (used by "Ask AI" on a failed deployment). */
  initialPrompt?: { text: string; key: number; context?: AssistantContext } | null;
  /** Fills the composer without sending, so the user can edit first. */
  prefill?: { text: string; key: number } | null;
}) {
  const [threads, setThreads] = useState<Thread[]>(() => [fresh()]);
  const [activeId, setActiveId] = useState(() => threads[0]!.id);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<{ id: string; name: string; logo?: string }[]>([]);
  const [thinking, setThinking] = useState(false);
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [review, setReview] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const envId = useEnvId();
  const { projectId } = useSelection();
  const services = useServices().data ?? [];
  const env = useQuery({
    queryKey: ["assistant-env", envId],
    queryFn: () => api<{ name: string }>(`/environments/${envId}`),
    enabled: !!envId,
  });
  const stopRef = useRef<(() => void) | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const active = threads.find((t) => t.id === activeId) ?? threads[0]!;

  const scrollToEnd = (smooth = true) =>
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  // Opening a conversation lands on the latest message at once (no top-to-bottom scrolling).
  const settled = useRef<string | null>(null);
  const keepOffset = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      // Older messages were added above: hold the reader's place.
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
      return;
    }
    if (settled.current !== active.id && active.messages.length) {
      settled.current = active.id;
      scrollToEnd(false);
    } else if (atBottom) scrollToEnd(settled.current === active.id && active.messages.length > 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.messages.length, view, thinking, liveSteps.length]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadOlder = async () => {
    const first = active.messages[0]?.id;
    if (!active.hasMore || loadingOlder || !first) return;
    setLoadingOlder(true);
    try {
      const r = await api<{ data: RawMsg[]; hasMore: boolean }>(
        `/assistant/threads/${active.id}/messages?limit=30&before=${encodeURIComponent(first)}`,
      );
      keepOffset.current = scroller.current
        ? scroller.current.scrollHeight - scroller.current.scrollTop
        : null;
      update(active.id, (t) => ({
        ...t,
        hasMore: r.hasMore,
        messages: [...r.data.map(toMsg), ...t.messages],
      }));
    } catch {
      toast.error("Could not load earlier messages");
    } finally {
      setLoadingOlder(false);
    }
  };
  useEffect(
    () => () => {
      stopRef.current?.();
    },
    [],
  );

  // Grow the composer with its content, up to a limit.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input, view]);

  // Conversations belong to a project: only this project's are ever requested.
  const load = async () =>
    projectId
      ? unwrap(await api(`/assistant/threads?projectId=${encodeURIComponent(projectId)}`)).map(
          toThread,
        )
      : [];
  useEffect(() => {
    load()
      .then((list) => {
        if (!list.length) return;
        // Saved conversations go into history; the panel itself stays on the empty new chat.
        setThreads((l) => [...l.filter((t) => !list.some((x) => x.id === t.id)), ...list]);
      })
      .catch(() => toast.error("Could not load conversations"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);
  useEffect(() => {
    if (!addService) return;
    setView("chat");
    setChips((l) =>
      l.some((c) => c.id === addService.id)
        ? l
        : [
            ...l,
            {
              id: addService.id,
              name: addService.name,
              ...(addService.logo ? { logo: addService.logo } : {}),
            },
          ],
    );
    requestAnimationFrame(() => field.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addService?.key]);
  // One empty chat is reused instead of stacking blanks. A chat only exists on the server once a
  // first message is sent.
  const blankThread = () => {
    const empty = threads.find((t) => !t.messages.length);
    if (empty) return empty.id;
    const t = fresh();
    setThreads((l) => [t, ...l]);
    return t.id;
  };
  useEffect(() => {
    if (!initialPrompt?.text) return;
    const id = blankThread();
    setActiveId(id);
    setView("chat");
    send(initialPrompt.text, id, initialPrompt.context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt?.key]);
  useEffect(() => {
    if (!prefill?.text) return;
    setActiveId(blankThread());
    setView("chat");
    setInput(prefill.text);
    requestAnimationFrame(() => {
      const el = field.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.key]);

  const update = (id: string, fn: (t: Thread) => Thread) =>
    setThreads((l) => l.map((t) => (t.id === id ? fn(t) : t)));

  const send = (text: string, threadId?: string, context?: AssistantContext) => {
    const q = text.trim();
    if (!q || (thinking && !threadId)) return;
    const id = threadId ?? active.id;
    const sentChips = threadId ? [] : chips;
    const body: Record<string, unknown> = { text: q };
    if (projectId) body["projectId"] = projectId;
    if (envId) body["environmentId"] = envId;
    if (context) body["context"] = context;
    else if (sentChips.length)
      body["context"] = sentChips.map((c) => ({
        type: "service",
        id: c.id,
        label: c.name,
        ...(c.logo ? { logo: c.logo } : {}),
      }));
    update(id, (t) => ({
      ...t,
      title: t.messages.length ? t.title : q.slice(0, 40),
      when: "now",
      messages: [
        ...t.messages,
        {
          role: "user",
          text: q,
          ...(context ? { context } : {}),
          ...(sentChips.length ? { chips: sentChips } : {}),
        },
      ],
    }));
    setInput("");
    setChips([]);
    setThinking(true);
    setLiveSteps([]);
    setAtBottom(true);
    const cancelled = { v: false };
    stopRef.current = () => {
      cancelled.v = true;
    };
    let replied = false;
    let steps: string[] = [];
    const startedAt = Date.now();
    const say = (reply: string, raw?: RawMsg) => {
      replied = true;
      const base: Msg = raw ? toMsg(raw) : { role: "agent", text: reply };
      update(id, (t) => ({
        ...t,
        messages: [
          ...t.messages,
          {
            ...base,
            ...(steps.length ? { steps, durationMs: Date.now() - startedAt } : {}),
          },
        ],
      }));
    };
    apiStream(`/assistant/threads/${id}/messages`, {
      body,
      onEvent: (event, data) => {
        if (cancelled.v) return;
        if (event === "status") {
          const s = String(data["text"] ?? "");
          if (s && steps[steps.length - 1] !== s) {
            steps = [...steps, s];
            setLiveSteps(steps);
          }
        } else if (event === "thread.title") {
          const title = String(data["title"] ?? "").trim();
          if (title) update(id, (t) => ({ ...t, title }));
        } else if (event === "done")
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
          setLiveSteps([]);
        }
      });
  };
  const stop = () => {
    stopRef.current?.();
    setThinking(false);
    setLiveSteps([]);
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
      return true;
    } catch (e) {
      toast.error((e as Error).message || "That did not work");
      const latest = await api<AssistantAction>(`/assistant/actions/${a.id}`).catch(() => null);
      patchAction(latest ?? a);
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  // Follow every deployment an applied action started, so the chat says Deploying, Live or Failed.
  const watching = allActions.filter(
    (a) =>
      a.status === "applied" &&
      a.deployment &&
      ["queued", "building", "deploying"].includes(a.deployment.state),
  );
  const watchKey = watching.map((a) => `${a.id}:${a.deployment?.state}`).join(",");
  useEffect(() => {
    if (!watching.length) return;
    const timer = window.setInterval(() => {
      for (const a of watching) {
        api<AssistantAction>(`/assistant/actions/${a.id}`)
          .then((next) => {
            patchAction(next);
            const bad = next.deployment && ["failed", "crashed"].includes(next.deployment.state);
            if (bad) setReview((r) => (r === next.id ? null : r));
          })
          .catch(() => undefined);
      }
    }, 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchKey]);

  /** "Fix and deploy": the assistant reads the failed deployment's logs and proposes a fix. */
  const fixDeployment = (a: AssistantAction) => {
    if (!a.deployment) return;
    setReview(null);
    send("Fix and deploy", undefined, {
      type: "deployment",
      deploymentId: a.deployment.id,
      serviceName: a.deployment.serviceName,
    });
  };
  const newThread = () => {
    setActiveId(blankThread());
    setView("chat");
    setChips([]);
  };
  const saved = threads.filter((t) => t.messages.length);

  const iconBtn =
    "h-8 w-8 shrink-0 rounded-full border text-muted-foreground hover:bg-accent hover:text-foreground";

  return (
    <aside className="absolute bottom-2.5 right-2.5 top-2.5 z-20 flex w-[min(440px,calc(100%-1.25rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in slide-in-from-right-6 fade-in duration-200">
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        {view === "history" ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(iconBtn, "-ml-2")}
            aria-label="Back to chat"
            onClick={() => setView("chat")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}
        {view === "history" ? (
          <span className="truncate text-sm font-medium">Conversations</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex min-w-0 shrink items-center gap-1.5 text-sm font-medium hover:opacity-80"
                aria-label="Recent conversations"
              >
                <span className="truncate">{active.title}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Recent conversations
              </DropdownMenuLabel>
              {saved.slice(0, 3).map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => setActiveId(t.id)}
                  className={cn("flex items-center gap-2", t.id === activeId && "bg-accent")}
                >
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{t.when}</span>
                </DropdownMenuItem>
              ))}
              {!saved.length ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">No conversations yet.</p>
              ) : null}
              {saved.length > 3 ? (
                <DropdownMenuItem
                  onSelect={() => setView("history")}
                  className="text-muted-foreground"
                >
                  Show more
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {view === "chat" ? (
          <span className="hidden max-w-[110px] shrink-0 truncate rounded-full bg-[#3A2A65] px-2.5 py-0.5 text-[11px] text-white sm:block">
            {env.data?.name ?? "Environment"}
          </span>
        ) : null}
        <span className="min-w-0 flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className={iconBtn}
          aria-label="New conversation"
          onClick={newThread}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={iconBtn}
          aria-label="Close assistant"
          onClick={onClose}
        >
          <Close className="h-4 w-4" />
        </Button>
      </header>

      {view === "history" ? (
        <ul className="scroll-area min-h-0 flex-1 divide-y overflow-y-auto border-t">
          {saved.map((t) => (
            <li key={t.id} className="group flex items-center gap-2 px-4 hover:bg-accent/50">
              <button
                className="min-w-0 flex-1 py-3 text-left"
                onClick={() => {
                  setActiveId(t.id);
                  setView("chat");
                }}
              >
                <span
                  className={cn(
                    "block truncate text-[13px] font-medium",
                    t.id === activeId && "text-primary",
                  )}
                >
                  {t.title}
                </span>
                <span className="text-[11px] text-muted-foreground">
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
        <div className="relative min-h-0 flex-1">
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
              if (el.scrollTop < 80) void loadOlder();
            }}
            className="scroll-area h-full overflow-y-auto px-5 pb-6 pt-2"
          >
            {!active.messages.length ? (
              <div className="pt-6">
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  What should we build or fix?
                </h2>
                <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                  Ask about services and deploys, or have me build an API or change an app's code.
                  You review every change before it ships.
                </p>
                <ul className="mt-6 divide-y border-y">
                  {suggestions.map((p) => (
                    <li key={p}>
                      <button
                        onClick={() => {
                          setInput(p);
                          field.current?.focus();
                        }}
                        className="group flex w-full items-center gap-3 py-3 text-left text-[13px] hover:text-foreground"
                      >
                        <span className="flex-1 text-muted-foreground group-hover:text-foreground">
                          {p}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-7 pt-2">
                {loadingOlder ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Loading earlier messages…
                  </p>
                ) : null}
                {active.messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="flex flex-col items-end gap-2">
                      {m.context || m.chips?.length ? (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {m.context ? (
                            <span className="flex items-center gap-1.5 rounded-md bg-primary/15 px-2 py-1 text-xs text-primary">
                              <ServiceChipIcon />
                              {m.context.serviceName} · Failed deployment
                            </span>
                          ) : null}
                          {m.chips?.map((c) => (
                            <span
                              key={c.id ?? c.name}
                              className="flex items-center gap-1.5 rounded-md bg-primary/15 px-2 py-1 text-xs text-primary"
                            >
                              <ServiceChipIcon
                                logo={c.logo ?? services.find((x) => x.id === c.id)?.logo}
                              />
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="max-w-[88%] whitespace-pre-wrap rounded-3xl bg-muted px-4 py-2.5 text-sm leading-6">
                        {m.text}
                      </p>
                    </div>
                  ) : (
                    <div key={i} className="text-[13.5px] leading-6">
                      {m.steps?.length ? (
                        <Steps
                          steps={m.steps}
                          {...(m.durationMs ? { durationMs: m.durationMs } : {})}
                        />
                      ) : null}
                      <Markdown text={m.text} />
                      {m.actions?.length ? (
                        <ActionRows
                          actions={m.actions}
                          onReview={setReview}
                          onFix={fixDeployment}
                          fixing={thinking}
                        />
                      ) : null}
                    </div>
                  ),
                )}
                {thinking ? (
                  <ul className="space-y-2.5 text-[13px] text-muted-foreground">
                    {liveSteps.slice(0, -1).map((s) => (
                      <li key={s} className="flex items-center gap-2.5">
                        <StepIcon text={s} />
                        {s}
                      </li>
                    ))}
                    <li className="flex items-center gap-2.5">
                      <Spinner />
                      <span>{liveSteps[liveSteps.length - 1] ?? "Thinking"}…</span>
                    </li>
                  </ul>
                ) : null}
              </div>
            )}
          </div>
          {!atBottom && active.messages.length ? (
            <button
              aria-label="Scroll to latest"
              onClick={() => scrollToEnd()}
              className="absolute bottom-3 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border bg-card text-muted-foreground shadow-md hover:text-foreground"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      )}

      {view === "chat" ? (
        <div className="px-3 pb-1 pt-1">
          <div className="rounded-3xl border bg-background p-3 shadow-sm transition-colors focus-within:border-primary/50">
            {chips.length ? (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs"
                  >
                    <ServiceChipIcon logo={c.logo} />
                    {c.name}
                    <button
                      aria-label={`Remove ${c.name}`}
                      onClick={() => setChips((l) => l.filter((x) => x.id !== c.id))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Close className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <textarea
              ref={field}
              aria-label="Ask Morline AI"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask AI anything"
              className="block max-h-40 w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex items-center justify-between">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={iconBtn}
                    aria-label="Add a service as context"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Add a service as context
                  </DropdownMenuLabel>
                  {services.length ? (
                    services.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        disabled={chips.some((c) => c.id === s.id)}
                        onSelect={() =>
                          setChips((l) => [...l, { id: s.id, name: s.name, logo: s.logo }])
                        }
                        className="gap-2"
                      >
                        <ServiceChipIcon logo={s.logo} />
                        {s.name}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      No services in this environment yet.
                    </p>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {thinking ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full"
                  aria-label="Stop"
                  onClick={stop}
                >
                  <Stop className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  aria-label="Send message"
                  disabled={!input.trim()}
                  onClick={() => send(input)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="px-4 py-1 text-center text-[11px] leading-4 text-muted-foreground">
            Morline AI can make mistakes. Review changes before you apply them.
          </p>
        </div>
      ) : null}
      {reviewing ? (
        <ChangeReview
          action={reviewing}
          busy={busyAction === reviewing.id}
          onClose={() => setReview(null)}
          onApply={(mode, deploy) =>
            void runAction(reviewing, () => applyAction(reviewing.id, mode, deploy)).then(
              (ok) => ok && setReview(null),
            )
          }
          onDismiss={() => runAction(reviewing, () => dismissAction(reviewing.id))}
          onRevert={() => runAction(reviewing, () => revertAction(reviewing.id))}
        />
      ) : null}
    </aside>
  );
}
