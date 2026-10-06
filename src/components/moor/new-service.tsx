import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "fluid-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { logos, type Kind, type LogoKey } from "@/lib/platform-data";
import { Logo } from "./primitives";
import { GitHubRepoPicker, type GhRepo } from "./github-repo-picker";
import { cn } from "@/lib/utils";

export type Template = { id: string; name: string; logo: LogoKey; kind: Kind; group: string; hint?: string; region?: string };

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await api<{ data: Template[] }>("/templates")).data.map((t) => ({ ...t, logo: (t.logo in logos ? t.logo : "docker") as LogoKey })),
    staleTime: 10 * 60_000,
  });
}

const regions = ["us-east", "us-west", "eu-west", "eu-central", "ap-south"];

export function NewServiceDialog({
  open,
  onOpenChange,
  onPick,
  onPickRepo,
  category = "all",
}: {
  category?: "all" | "database" | "template" | "github";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (t: Template) => void;
  onPickRepo?: (r: GhRepo) => void;
}) {
  const { data: templates = [], isLoading } = useTemplates();
  const [step, setStep] = useState<"pick" | "github" | "review">("pick");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("us-east");

  useEffect(() => {
    if (open) { setStep(category === "github" ? "github" : "pick"); setQuery(""); setPicked(null); setName(""); setRegion("us-east"); }
  }, [open, category]);

  if (open && step === "github") {
    return (
      <Dialog open onOpenChange={(v) => { if (!v) { setStep("pick"); onOpenChange(false); } }}>
        <DialogContent className="gap-0 overflow-hidden border border-border/80 bg-card p-0 shadow-2xl sm:max-w-[420px] sm:rounded-2xl sm:p-0">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <button type="button" aria-label="Back" onClick={() => setStep("pick")} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <DialogTitle className="text-sm font-semibold">Deploy from GitHub</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Connect an account or paste any public repo URL.</DialogDescription>
            </div>
          </div>
          <GitHubRepoPicker onPick={(r) => { setStep("pick"); onPickRepo?.(r); }} />
        </DialogContent>
      </Dialog>
    );
  }

  const q = query.trim().toLowerCase();
  const match = (t: Template) => (category !== "database" || t.kind === "database") && (category !== "template" || t.kind !== "database") && (!q || t.name.toLowerCase().includes(q) || (t.hint ?? "").toLowerCase().includes(q));
  const groups = [...new Set(templates.map((t) => t.group))];
  const anyMatch = groups.some((g) => templates.some((t) => t.group === g && match(t)));
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const openReview = (t: Template) => {
    setPicked(t);
    setName(slug(t.name));
    setRegion(t.region ?? "us-east");
    setStep("review");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setStep("pick"); onOpenChange(false); } }}>
      <DialogContent className="gap-0 overflow-hidden border border-border/80 bg-card p-0 shadow-2xl sm:max-w-[440px] sm:rounded-2xl sm:p-0">
        {step === "pick" ? (
          <>
            <DialogTitle className="sr-only">Add a service</DialogTitle>
            <div className="border-b px-4 py-3">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search — repo, database, starter, app…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                aria-label="Search templates"
              />
            </div>
            <div className="scroll-area max-h-[340px] overflow-y-auto p-1.5">
              {onPickRepo && category === "all" && (!q || "github repository".includes(q)) ? (
                <Section heading="Source">
                  <Row logo="github" name="GitHub repository" hint="Any account or public URL" onClick={() => setStep("github")} chevron />
                </Section>
              ) : null}
              {isLoading ? <div className="space-y-2 p-3" aria-label="Loading templates">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted/60" />)}</div> : null}
              {groups.map((g) => {
                const rows = templates.filter((t) => t.group === g && match(t));
                if (!rows.length) return null;
                return (
                  <Section key={g} heading={g}>
                    {rows.map((t) => (
                      <Row key={t.id} logo={t.logo} name={t.name} hint={t.hint} onClick={() => openReview(t)} chevron />
                    ))}
                  </Section>
                );
              })}
              {!isLoading && !anyMatch ? <p className="py-8 text-center text-xs text-muted-foreground">Nothing matches “{query}”.</p> : null}
            </div>
          </>
        ) : null}
        {step === "review" && picked ? (
          <>
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <button type="button" aria-label="Back" onClick={() => setStep("pick")} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <DialogTitle className="text-sm font-semibold">Add {picked.name}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">Review, then it lands on the canvas and deploys.</DialogDescription>
              </div>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-surface"><Logo k={picked.logo} className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{picked.group} · {picked.kind}</p>
                  <p className="truncate text-sm font-medium">{picked.hint ?? "Deploys as soon as it lands."}</p>
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="svc-name" className="label-caps">Name</label>
                <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-service" className="mt-1 h-8 font-mono text-xs" />
              </div>
              <div className="mt-3">
                <p className="label-caps">Region</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {regions.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                        region === r ? "border-primary/60 bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >{r}</button>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                className="mt-4 w-full"
                onClick={() => {
                  onPick({ ...picked, name: name.trim() || picked.name, region });
                  setStep("pick");
                }}
              >Add to canvas</Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5 first:mt-0">
      <p className="label-caps px-2 pb-1 pt-2">{heading}</p>
      {children}
    </div>
  );
}

function Row({ logo, name, hint, onClick, chevron }: { logo: LogoKey; name: string; hint?: React.ReactNode; onClick: () => void; chevron?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="group h-auto w-full justify-start gap-3 rounded-md px-2.5 py-2.5 text-left"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface">
        <Logo k={logo} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 whitespace-normal">
        <span className="block text-xs font-medium text-foreground">{name}</span>
        {hint ? <span className="mt-0.5 block text-[11px] font-normal leading-4 text-muted-foreground">{hint}</span> : null}
      </span>
      {chevron ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
    </Button>
  );
}
