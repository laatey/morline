import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Check, Clock3, History, Plus, Send, Square, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// UI-only concept: canned replies, no model calls, no persistence.
type Msg = { role: "user" | "agent"; text: string; action?: string };
type Thread = { id: string; title: string; when: string; messages: Msg[] };

const prompts = ["Why did the latest deploy fail?", "Review environment variables", "Explain this service map"];
const canned: Record<string, Msg> = {
  "Why did the latest deploy fail?": { role: "agent", text: "nightly-report crashed at 12:48:10 with `column \"exported_at\" does not exist`. Commit e11b4c8 reads a column that the postgres migration hasn't added yet.", action: "Roll back nightly-report to 3f2aa70" },
  "Review environment variables": { role: "agent", text: "api has 7 variables. DATABASE_URL and REDIS_URL are references — good. API_SECRET_KEY is a live key in staging too; consider scoping it to production only.", action: "Open variables" },
  "Explain this service map": { role: "agent", text: "web calls api over :8080. api and queue-worker share postgres and redis on the private network. nightly-report calls api on a schedule and is currently crashed." },
};

const seedThreads: Thread[] = [
  { id: "t1", title: "Deploy failure in api", when: "now", messages: [] },
  { id: "t2", title: "Production health review", when: "2d", messages: [{ role: "user", text: "How healthy is production?" }, { role: "agent", text: "5 of 6 services are online. p95 latency is 84 ms, CPU is 38% of the limit. nightly-report needs attention." }] },
  { id: "t3", title: "Redis memory usage", when: "3d", messages: [{ role: "user", text: "Is redis close to its memory limit?" }, { role: "agent", text: "redis uses 0.4 of 5 GB on its volume and 92 MB in memory. Plenty of headroom." }] },
];

export function AiAssistant({ onClose }: { onClose: () => void }) {
  const [threads, setThreads] = useState(seedThreads);
  const [activeId, setActiveId] = useState("t1");
  const [view, setView] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const active = threads.find((t) => t.id === activeId) ?? threads[0]!;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length, thinking]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const update = (id: string, fn: (t: Thread) => Thread) => setThreads((l) => l.map((t) => (t.id === id ? fn(t) : t)));
  const send = (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    const id = active.id;
    update(id, (t) => ({ ...t, title: t.messages.length ? t.title : q.slice(0, 40), when: "now", messages: [...t.messages, { role: "user", text: q }] }));
    setInput("");
    setThinking(true);
    timer.current = setTimeout(() => {
      update(id, (t) => ({ ...t, messages: [...t.messages, canned[q] ?? { role: "agent", text: "This is a design preview — the agent isn't connected yet. In the real product I'd inspect logs, deploys and config for this environment to answer." }] }));
      setThinking(false);
    }, 1100);
  };
  const stop = () => { if (timer.current) clearTimeout(timer.current); setThinking(false); update(active.id, (t) => ({ ...t, messages: [...t.messages, { role: "agent", text: "Stopped." }] })); };
  const newThread = () => { const id = crypto.randomUUID(); setThreads((l) => [{ id, title: "New conversation", when: "now", messages: [] }, ...l]); setActiveId(id); setView("chat"); };

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
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close assistant" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>

      {view === "history" ? (
        <ul className="scroll-area min-h-0 flex-1 divide-y overflow-y-auto">
          {threads.map((t) => (
            <li key={t.id} className="group flex items-center gap-2 px-3 hover:bg-accent/50">
              <button className="min-w-0 flex-1 py-2.5 text-left" onClick={() => { setActiveId(t.id); setView("chat"); }}>
                <span className={cn("block truncate text-xs font-medium", t.id === activeId && "text-primary")}>{t.title}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{t.messages.length} messages · {t.when}</span>
              </button>
              <button aria-label={`Delete ${t.title}`} className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" onClick={() => { setThreads((l) => { const n = l.filter((x) => x.id !== t.id); if (!n.length) n.push({ id: "fresh", title: "New conversation", when: "now", messages: [] }); if (t.id === activeId) setActiveId(n[0]!.id); return n; }); }}><Trash2 className="h-3.5 w-3.5" /></button>
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
                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span>{p}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {active.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
                  <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5", m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-background")}>
                    {m.text}
                    {m.action ? (
                      <button disabled={applied.has(`${active.id}-${i}`)} onClick={() => setApplied((s) => new Set(s).add(`${active.id}-${i}`))} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-[11px] font-medium hover:bg-accent disabled:text-score">
                        {applied.has(`${active.id}-${i}`) ? <><Check className="h-3 w-3" />Done (preview)</> : m.action}
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
              <span className="px-1 font-mono text-[9px] text-muted-foreground">Design preview · replies are samples</span>
              {thinking ? (
                <Button size="icon" variant="outline" className="h-7 w-7" aria-label="Stop" onClick={stop}><Square className="h-3 w-3" /></Button>
              ) : <Button size="icon" className="h-7 w-7" aria-label="Send message" disabled={!input.trim()} onClick={() => send(input)}><Send className="h-3.5 w-3.5" /></Button>}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
