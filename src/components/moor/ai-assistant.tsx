import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Check, Clock, History, Plus, Send, Stop, Trash, Close, Undo } from "fluid-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

// Threads persist via /assistant/threads.
type Msg = { role: "user" | "agent"; text: string; action?: string };
type Thread = { id: string; title: string; when: string; messages: Msg[] };

const prompts = ["Why did the latest deploy fail?", "Review environment variables", "Explain this service map"];

type RawMsg = { role?: string; text?: string; content?: string; action?: string };
type RawThread = { id: string; title?: string; updatedAt?: string; createdAt?: string; messages?: RawMsg[] };
const ago = (iso?: string) => { if (!iso) return "now"; const m = Math.max(0, (Date.now() - Date.parse(iso)) / 60000); return m < 1 ? "now" : m < 60 ? `${Math.floor(m)}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`; };
const toMsg = (m: RawMsg): Msg => ({ role: m.role === "user" ? "user" : "agent", text: m.text ?? m.content ?? "", ...(m.action ? { action: m.action } : {}) });
const toThread = (t: RawThread): Thread => ({ id: t.id, title: t.title || "New conversation", when: ago(t.updatedAt ?? t.createdAt), messages: (t.messages ?? []).map(toMsg) });
const unwrap = (r: unknown): RawThread[] => Array.isArray(r) ? r : ((r as { threads?: RawThread[]; data?: RawThread[] })?.threads ?? (r as { data?: RawThread[] })?.data ?? []);
const fresh = (): Thread => ({ id: crypto.randomUUID(), title: "New conversation", when: "now", messages: [] });

export function AiAssistant({ onClose, initialPrompt }: { onClose: () => void; initialPrompt?: { text: string; key: number } | null }) {
  const [threads, setThreads] = useState<Thread[]>(() => [fresh()]);
  const [activeId, setActiveId] = useState(() => threads[0]!.id);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const stopRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const active = threads.find((t) => t.id === activeId) ?? threads[0]!;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length, thinking]);
  useEffect(() => () => { stopRef.current?.(); }, []);

  const load = async () => {
    const list = unwrap(await api("/assistant/threads")).map(toThread);
    return list;
  };
  const seeded = useRef(false);
  useEffect(() => {
    load().then((list) => {
      if (!list.length) return;
      if (seeded.current) setThreads((l) => [...l.filter((t) => t.messages.length && !list.some((x) => x.id === t.id)), ...list]);
      else { setThreads(list); setActiveId(list[0]!.id); }
    }).catch(() => toast.error("Could not load conversations"));
  }, []);
  useEffect(() => {
    if (!initialPrompt?.text) return;
    seeded.current = true;
    const t = fresh();
    setThreads((l) => [t, ...l]);
    setActiveId(t.id);
    setView("chat");
    send(initialPrompt.text, t.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt?.key]);

  const update = (id: string, fn: (t: Thread) => Thread) => setThreads((l) => l.map((t) => (t.id === id ? fn(t) : t)));
  const send = (text: string, threadId?: string) => {
    const q = text.trim();
    if (!q || (thinking && !threadId)) return;
    const id = threadId ?? active.id;
    update(id, (t) => ({ ...t, title: t.messages.length ? t.title : q.slice(0, 40), when: "now", messages: [...t.messages, { role: "user", text: q }] }));
    setInput("");
    setThinking(true);
    const cancelled = { v: false };
    stopRef.current = () => { cancelled.v = true; };
    api<unknown>(`/assistant/threads/${id}/messages`, { method: "POST", body: { text: q } })
      .then(async (res) => {
        if (cancelled.v) return;
        const r = res as { thread?: RawThread; messages?: RawMsg[]; reply?: RawMsg; message?: RawMsg };
        if (r?.thread?.messages) update(id, () => toThread(r.thread!));
        else if (r?.messages) update(id, (t) => ({ ...t, messages: r.messages!.map(toMsg) }));
        else {
          const t = (await load()).find((x) => x.id === id);
          if (t) update(id, () => t);
        }
      })
      .catch((e) => { if (!cancelled.v) update(id, (t) => ({ ...t, messages: [...t.messages, { role: "agent", text: (e as Error).message || "Something went wrong." }] })); })
      .finally(() => { if (!cancelled.v) setThinking(false); });
  };
  const stop = () => { stopRef.current?.(); setThinking(false); update(active.id, (t) => ({ ...t, messages: [...t.messages, { role: "agent", text: "Stopped." }] })); };
  const newThread = () => { const t = fresh(); setThreads((l) => [t, ...l]); setActiveId(t.id); setView("chat"); };

  return (
    <aside className="absolute bottom-2.5 right-2.5 top-2.5 z-20 flex w-[min(380px,calc(100%-1.25rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl animate-in slide-in-from-right-6 fade-in duration-200">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        {view === "history" ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Back to chat" onClick={() => setView("chat")}><ArrowLeft className="h-3.5 w-3.5" /></Button>
        ) : <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground"><Bot className="h-3.5 w-3.5" /></span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{view === "history" ? "Conversations" : active.title}</p>
          <p className="font-mono text-[9px] text-muted-foreground">harbor-api · production</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="New conversation" onClick={newThread}><Plus className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Conversation history" onClick={() => setView(view === "history" ? "chat" : "history")}><History className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close assistant" onClick={onClose}><Close className="h-3.5 w-3.5" /></Button>
      </div>

      {view === "history" ? (
        <ul className="scroll-area min-h-0 flex-1 divide-y overflow-y-auto">
          {threads.map((t) => (
            <li key={t.id} className="group flex items-center gap-2 px-3 hover:bg-accent/50">
              <button className="min-w-0 flex-1 py-2.5 text-left" onClick={() => { setActiveId(t.id); setView("chat"); }}>
                <span className={cn("block truncate text-xs font-medium", t.id === activeId && "text-primary")}>{t.title}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{t.messages.length} messages · {t.when}</span>
              </button>
              <button aria-label={`Delete ${t.title}`} className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" onClick={() => { if (t.messages.length) api(`/assistant/threads/${t.id}`, { method: "DELETE" }).catch(() => toast.error("Could not delete conversation")); setThreads((l) => { const n = l.filter((x) => x.id !== t.id); if (!n.length) n.push(fresh()); if (t.id === activeId) setActiveId(n[0]!.id); return n; }); }}><Trash className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {!active.messages.length ? (
            <>
              <div className="mx-auto flex max-w-[300px] flex-col items-center text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl border bg-surface"><Bot className="h-4 w-4 text-primary" /></span>
                <h2 className="mt-3 font-display text-base font-semibold">What should we inspect?</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Ask about services, deploys, logs, or configuration in this environment.</p>
              </div>
              <div className="mt-6 space-y-1.5">
                {prompts.map((p) => (
                  <button key={p} onClick={() => send(p)} className="flex w-full items-center gap-2 rounded-lg border bg-background/40 px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span>{p}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {active.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
                  <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5", m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-background")}>
                    {m.role === "agent" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-xs prose-invert max-w-none"
                        components={{
                          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-5">{children}</p>,
                          h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
                          h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
                          h3: ({ children }) => <p className="mb-1 font-medium">{children}</p>,
                          ul: ({ children }) => <ul className="mb-1.5 ml-3 list-disc space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-1.5 ml-3 list-decimal space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-5">{children}</li>,
                          code: ({ children, className }) => className ? (
                            <pre className="my-1.5 overflow-x-auto rounded-md bg-muted/60 px-2.5 py-2 font-mono text-[10px] leading-relaxed">
                              <code>{children}</code>
                            </pre>
                          ) : (
                            <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[10px]">{children}</code>
                          ),
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:opacity-80">{children}</a>,
                          hr: () => <hr className="my-2 border-border/50" />,
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    ) : m.text}
                    {m.action ? (
                      <button disabled={applied.has(`${active.id}-${i}`)} onClick={() => setApplied((s) => new Set(s).add(`${active.id}-${i}`))} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-[11px] font-medium hover:bg-accent disabled:text-score">
                        {applied.has(`${active.id}-${i}`) ? <><Check className="h-3 w-3" />Noted</> : m.action}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {thinking ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="flex gap-0.5">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 120}ms` }} />)}</span>
                  Inspecting environment…
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          )}
        </div>
      )}

      {view === "chat" ? (
        <div className="p-3 pt-0">
          <div className="rounded-xl border bg-background p-2 shadow-sm">
            <textarea aria-label="Ask Morline Agent" rows={3} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder="Ask about this environment…" className="w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground" />
            <div className="mt-1 flex items-center justify-between">
              <span className="px-1 font-mono text-[9px] text-muted-foreground">Enter to send · Shift+Enter for newline</span>
              {thinking ? (
                <Button size="icon" variant="outline" className="h-7 w-7" aria-label="Stop" onClick={stop}><Stop className="h-3 w-3" /></Button>
              ) : <Button size="icon" className="h-7 w-7" aria-label="Send message" disabled={!input.trim()} onClick={() => send(input)}><Send className="h-3.5 w-3.5" /></Button>}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
