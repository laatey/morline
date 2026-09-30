import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Github } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/moor/auth-layout";
import { Logo } from "@/components/moor/primitives";
import { repos, templates } from "@/lib/platform-data";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type OnboardingState = { step?: number; completed?: boolean; workspaceName?: string | null; selectedTemplate?: string | null; invitedEmails?: string | null; data?: { githubConnected?: boolean } | null };

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your workspace — Morline" },
      { name: "description", content: "Name your workspace, connect GitHub and invite your team." },
      { property: "og:title", content: "Set up your workspace — Morline" },
      { property: "og:description", content: "Name your workspace, connect GitHub and invite your team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

const steps = ["Workspace", "Connect GitHub", "First service", "Invite team"];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [ws, setWs] = useState("");
  const [connected, setConnected] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [invites, setInvites] = useState("");
  const loaded = useRef(false);
  const canNext = [ws.trim().length > 1, true, true, true][step];

  useEffect(() => {
    api<OnboardingState | { onboarding?: OnboardingState }>("/me/onboarding")
      .then((r) => {
        const o = ((r as { onboarding?: OnboardingState })?.onboarding ?? r) as OnboardingState;
        if (o?.completed) { navigate({ to: "/projects" }); return; }
        if (typeof o?.step === "number") setStep(Math.min(3, Math.max(0, o.step)));
        if (o?.workspaceName) setWs(o.workspaceName);
        if (o?.selectedTemplate) setPick(o.selectedTemplate);
        if (o?.invitedEmails) setInvites(o.invitedEmails);
        if (o?.data?.githubConnected) setConnected(true);
      })
      .catch(() => {})
      .finally(() => { loaded.current = true; });
  }, [navigate]);

  const save = (nextStep: number, completed = false) =>
    api("/me/onboarding", {
      method: "PATCH",
      body: { step: nextStep, workspaceName: ws, ...(pick ? { selectedTemplate: pick } : {}), invitedEmails: invites, completed, data: { githubConnected: connected } },
    });

  const goTo = (n: number) => { setStep(n); save(n).catch(() => toast.error("Could not save progress")); };
  const next = async () => {
    if (step < 3) return goTo(step + 1);
    try { await save(3, true); } catch { toast.error("Could not save progress"); return; }
    toast.success(`Welcome to ${ws || "your workspace"}`);
    navigate({ to: "/projects" });
  };
  return (
    <AuthLayout aside={
      <ol className="w-full max-w-xs space-y-3">
        {steps.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm", i === step && "border-primary")}>
            <span className={cn("grid h-6 w-6 place-items-center rounded-full border font-mono text-[10px]", i < step && "border-primary bg-primary text-primary-foreground")}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>{s}
          </li>
        ))}
      </ol>
    }>
      <p className="label-caps">Step {step + 1} of 4</p>
      <div className="mt-2 flex gap-1">{steps.map((s, i) => <span key={s} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}</div>
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">{["Name your workspace", "Connect GitHub", "Deploy something", "Bring your team"][step]}</h1>

      {step === 0 ? (
        <div className="mt-6 space-y-3">
          <label className="block text-xs text-muted-foreground">Workspace name<Input autoFocus value={ws} onChange={(e) => setWs(e.target.value)} placeholder="Acme Labs" className="mt-1" /></label>
          <p className="font-mono text-[11px] text-muted-foreground">morline.space/{ws.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "your-team"}</p>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-6 space-y-3">
          {!connected ? (
            <Button className="w-full gap-2" onClick={() => setConnected(true)}><Github className="h-4 w-4" />Install the GitHub app</Button>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {repos.map((r) => <li key={r.name} className="flex items-center gap-2 px-3 py-2 font-mono text-xs"><Github className="h-3.5 w-3.5" />{r.name}<span className="ml-auto text-muted-foreground">{r.private ? "private" : "public"}</span></li>)}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">You can pick which repositories Morline can see.</p>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 grid grid-cols-2 gap-2">
          {templates.slice(0, 8).map((t) => (
            <button key={t.name} onClick={() => setPick(t.name)} className={cn("flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-xs hover:bg-accent", pick === t.name && "border-primary")}>
              <Logo k={t.logo} />{t.name}
            </button>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 space-y-2">
          <label className="block text-xs text-muted-foreground">Emails, comma separated<Input value={invites} onChange={(e) => setInvites(e.target.value)} placeholder="ada@acme.dev, kofi@acme.dev" className="mt-1" /></label>
        </div>
      ) : null}

      <div className="mt-8 flex items-center gap-2">
        {step > 0 ? <Button variant="ghost" onClick={() => goTo(step - 1)}>Back</Button> : null}
        {step > 0 ? <Button variant="ghost" className="ml-auto text-muted-foreground" onClick={next}>Skip</Button> : null}
        <Button className={cn(step === 0 && "ml-auto")} disabled={!canNext} onClick={next}>{step === 3 ? "Finish" : "Continue"}</Button>
      </div>
    </AuthLayout>
  );
}
