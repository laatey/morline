import { DockerImageFields, type DockerImageValues } from "@/components/moor/docker-image-form";
import { defaultNameFromImage, imageProblem } from "@/lib/docker-image";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, Terminal } from "fluid-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import {
  logos,
  templates as fallbackTemplates,
  type Kind,
  type LogoKey,
} from "@/lib/platform-data";
import { DatabaseFannedLogos, Logo, Kbd } from "./primitives";
import { GitHubRepoPicker, type GhRepo } from "./github-repo-picker";
import { cn } from "@/lib/utils";

export type Template = {
  id: string;
  name: string;
  logo: LogoKey;
  kind: Kind;
  group: string;
  hint?: string;
  region?: string;
};

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      try {
        const res = await api<{ data: Template[] }>("/templates");
        if (res?.data?.length) {
          return res.data.map((t) => ({
            ...t,
            logo: (t.logo in logos
              ? t.logo
              : t.kind === "database"
                ? "postgres"
                : "terminal") as LogoKey,
          }));
        }
      } catch {
        // fallback to bundled catalog
      }
      return fallbackTemplates.map((t, idx) => ({
        id: `tpl-${idx}-${t.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        name: t.name,
        logo: t.logo,
        kind: t.kind,
        group: t.group,
        hint: t.hint,
      }));
    },
    staleTime: 10 * 60_000,
  });
}

type Choice = {
  id: "github" | "docker" | "database" | "starter";
  title: string;
  note: string;
  badge: string;
  logoKey?: LogoKey;
  icon?: typeof Terminal;
  fanned?: "database";
};

const choices: Choice[] = [
  {
    id: "github",
    title: "GitHub repository",
    note: "Deploy from a connected repository",
    badge: "CI/CD",
    logoKey: "github",
  },
  {
    id: "docker",
    title: "Docker image",
    note: "Run a public or private container",
    badge: "Registry",
    logoKey: "docker",
  },
  {
    id: "database",
    title: "Database",
    note: "Postgres, Redis, MySQL and more",
    badge: "Managed",
    fanned: "database",
  },
  {
    id: "starter",
    title: "Starter",
    note: "Begin from a production-ready template",
    badge: "16 starters",
    icon: Terminal,
  },
];

const regions = ["us-east", "us-west", "eu-west", "eu-central", "ap-south"];

export type ImageSelection = { image: string; name: string; port?: number; region: string };

export function NewServiceDialog({
  open,
  onOpenChange,
  onPick,
  onPickRepo,
  onPickImage,
  category = "all",
}: {
  category?: "all" | "database" | "template" | "github" | "docker";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (t: Template) => void;
  onPickRepo?: (r: GhRepo) => void;
  onPickImage?: (i: ImageSelection) => void;
}) {
  const { data: serverTemplates = [], isLoading } = useTemplates();
  const templates: Template[] = serverTemplates.length
    ? serverTemplates
    : fallbackTemplates.map((t, idx) => ({
        id: `tpl-${idx}`,
        name: t.name,
        logo: t.logo,
        kind: t.kind,
        group: t.group,
        hint: t.hint,
      }));

  const [step, setStep] = useState<"pick" | "github" | "review" | "docker">("pick");
  const [docker, setDocker] = useState<DockerImageValues>({ image: "", port: "" });
  const [dockerName, setDockerName] = useState("");
  const [subview, setSubview] = useState<"database" | "starter" | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("us-east");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep(category === "github" ? "github" : category === "docker" ? "docker" : "pick");
      setDocker({ image: "", port: "" });
      setDockerName("");
      setSubview(category === "database" ? "database" : category === "template" ? "starter" : null);
      setQuery("");
      setPicked(null);
      setName("");
      setRegion("us-east");
    }
  }, [open, category]);

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    if (!open || step !== "pick") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement !== searchInputRef.current &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, step]);

  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const openReview = (t: Template) => {
    setPicked(t);
    setName(slug(t.name));
    setRegion(t.region ?? "us-east");
    setStep("review");
  };

  const handleSelectChoice = (choice: Choice) => {
    if (choice.id === "github") {
      setStep("github");
      return;
    }
    if (choice.id === "docker") {
      setStep("docker");
      return;
    }
    if (choice.id === "database") {
      setSubview("database");
      setQuery("");
      return;
    }
    if (choice.id === "starter") {
      setSubview("starter");
      setQuery("");
      return;
    }
  };

  const q = query.trim().toLowerCase();

  const visibleChoices = choices.filter(
    (choice) =>
      choice.title.toLowerCase().includes(q) ||
      choice.note.toLowerCase().includes(q) ||
      choice.badge.toLowerCase().includes(q),
  );

  const databaseTemplates = templates.filter((t) => t.kind === "database");
  const starterTemplates = templates.filter((t) => t.kind !== "database");

  const matchingTemplates = q
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.hint ?? "").toLowerCase().includes(q) ||
          t.group.toLowerCase().includes(q),
      )
    : [];

  // Determine current header title and description based on mode
  let headerCategory = "Create";
  let headerTitle = "Add a service";
  let headerDesc = "Choose where the first service should come from.";

  if (category === "database" || subview === "database") {
    headerCategory = "Database";
    headerTitle = "Add a database";
    headerDesc = "Choose a managed database for your project.";
  } else if (category === "template" || subview === "starter") {
    headerCategory = "Templates";
    headerTitle = "Starters & templates";
    headerDesc = "Begin from a production-ready starter or application.";
  } else if (step === "github") {
    headerCategory = "Source";
    headerTitle = "Deploy from GitHub";
    headerDesc = "Pick the repository to deploy as a service.";
  } else if (step === "docker") {
    headerCategory = "Source";
    headerTitle = "Deploy a Docker image";
    headerDesc = "Pull an image, run it, and route traffic to it.";
  } else if (step === "review" && picked) {
    headerCategory = "Configure";
    headerTitle = `Add ${picked.name}`;
    headerDesc = "Review settings, then the service lands on the canvas and deploys.";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border border-border/80 bg-card p-0 sm:p-0 gap-0 shadow-2xl sm:max-w-[420px] sm:rounded-2xl">
        {step === "github" ? (
          <>
            <div className="border-b px-4.5 pb-3 pt-3.5 sm:px-5 sm:pt-4 sm:pb-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Back"
                  onClick={() => setStep("pick")}
                  className="mr-1 grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="label-caps">{headerCategory}</p>
                  <DialogTitle className="mt-0.5 font-display text-base font-semibold tracking-tight sm:text-lg">
                    {headerTitle}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="mt-1 text-xs text-muted-foreground">
                {headerDesc}
              </DialogDescription>
            </div>
            <GitHubRepoPicker
              onPick={(r) => {
                setStep("pick");
                onOpenChange(false);
                onPickRepo?.(r);
              }}
            />
            <DialogFooter className="border-t px-4.5 py-3 sm:px-5">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("pick")}>
                Back
              </Button>
            </DialogFooter>
          </>
        ) : step === "docker" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const image = docker.image.trim();
              if (!image || imageProblem(image)) return;
              onPickImage?.({
                image,
                name: dockerName.trim() || defaultNameFromImage(image),
                ...(docker.port ? { port: Number(docker.port) } : {}),
                region,
              });
              setStep("pick");
              onOpenChange(false);
            }}
          >
            <div className="border-b px-4.5 pb-3 pt-3.5 sm:px-5 sm:pt-4 sm:pb-3.5">
              <div className="flex items-center gap-2">
                {category !== "docker" ? (
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => setStep("pick")}
                    className="mr-1 grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <div>
                  <p className="label-caps">{headerCategory}</p>
                  <DialogTitle className="mt-0.5 font-display text-base font-semibold tracking-tight sm:text-lg">
                    {headerTitle}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="mt-1 text-xs text-muted-foreground">
                {headerDesc}
              </DialogDescription>
            </div>
            <div className="space-y-3.5 p-4 sm:p-5">
              <DockerImageFields values={docker} onChange={setDocker} />
              <label className="block text-xs text-muted-foreground">
                Service name
                <Input
                  value={dockerName}
                  onChange={(e) =>
                    setDockerName(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-")
                        .replace(/^-+/, "")
                        .slice(0, 40),
                    )
                  }
                  placeholder={docker.image ? defaultNameFromImage(docker.image) : "from the image"}
                  className="mt-1 h-9 font-mono text-sm"
                />
              </label>
              <div>
                <p className="label-caps mb-1.5">Region</p>
                <div className="flex flex-wrap gap-1">
                  {regions.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
                        region === r
                          ? "border-primary/60 bg-primary/10 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="border-t px-4.5 py-3 sm:px-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => (category === "docker" ? onOpenChange(false) : setStep("pick"))}
              >
                {category === "docker" ? "Cancel" : "Back"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!docker.image.trim() || !!imageProblem(docker.image)}
              >
                Add to canvas
              </Button>
            </DialogFooter>
          </form>
        ) : step === "review" && picked ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onPick({ ...picked, name: name.trim() || picked.name, region });
              setStep("pick");
              onOpenChange(false);
            }}
          >
            <div className="border-b px-4.5 pb-3 pt-3.5 sm:px-5 sm:pt-4 sm:pb-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Back"
                  onClick={() => setStep("pick")}
                  className="mr-1 grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="label-caps">{headerCategory}</p>
                  <DialogTitle className="mt-0.5 font-display text-base font-semibold tracking-tight sm:text-lg">
                    {headerTitle}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="mt-1 text-xs text-muted-foreground">
                {headerDesc}
              </DialogDescription>
            </div>

            <div className="space-y-3.5 p-4 sm:p-5">
              <label className="block text-xs text-muted-foreground">
                Service name
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-")
                        .replace(/^-+/, "")
                        .slice(0, 40),
                    )
                  }
                  placeholder={slug(picked.name)}
                  className="mt-1 h-9 font-mono text-sm"
                />
              </label>

              <div className="flex items-center gap-2.5 rounded-lg border bg-surface/40 px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface">
                  <Logo k={picked.logo} className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 text-xs">
                  <span className="block truncate font-medium text-foreground">{picked.name}</span>
                  <span className="block truncate text-muted-foreground font-mono text-[10.5px]">
                    {picked.group} · {picked.kind} · {picked.hint ?? "Deploys on canvas"}
                  </span>
                </span>
              </div>

              <div>
                <p className="label-caps mb-1.5">Region</p>
                <div className="flex flex-wrap gap-1">
                  {regions.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
                        region === r
                          ? "border-primary/60 bg-primary/10 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t px-4.5 py-3 sm:px-5">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("pick")}>
                Back
              </Button>
              <Button type="submit" size="sm">
                Add to canvas
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            {/* Header */}
            <div className="border-b px-4.5 pb-3 pt-3.5 sm:px-5 sm:pt-4 sm:pb-3.5">
              <div className="flex items-center gap-2">
                {subview && category === "all" ? (
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => {
                      setSubview(null);
                      setQuery("");
                    }}
                    className="mr-1 grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <div>
                  <p className="label-caps">{headerCategory}</p>
                  <DialogTitle className="mt-1 font-display text-base font-semibold tracking-tight sm:text-lg">
                    {headerTitle}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                {headerDesc}
              </DialogDescription>
            </div>

            {/* Search */}
            <div className="border-b bg-surface/30 px-3 py-2">
              <label className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sources and templates…"
                  className="h-8 border-0 bg-surface/80 pl-8 pr-12 text-base md:text-xs shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/30"
                  autoFocus
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                ) : (
                  <Kbd className="pointer-events-none absolute right-2.5 hidden sm:inline-block">
                    /
                  </Kbd>
                )}
              </label>
            </div>

            {/* Content List */}
            <div className="flex flex-col divide-y divide-border/50 max-h-[45vh] sm:max-h-[55vh] overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="space-y-2 p-3.5" aria-label="Loading templates">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
                  ))}
                </div>
              ) : null}

              {/* Subview: Database list */}
              {!isLoading && (subview === "database" || category === "database")
                ? databaseTemplates
                    .filter(
                      (t) =>
                        !q ||
                        t.name.toLowerCase().includes(q) ||
                        (t.hint ?? "").toLowerCase().includes(q),
                    )
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => openReview(t)}
                        className="group flex cursor-pointer items-center gap-3 bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-accent/70"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface">
                          <Logo k={t.logo} className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                              {t.name}
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
                              · MANAGED
                            </span>
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {t.hint ?? "Managed database"}
                          </span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </button>
                    ))
                : null}

              {/* Subview: Starter list */}
              {!isLoading && (subview === "starter" || category === "template")
                ? starterTemplates
                    .filter(
                      (t) =>
                        !q ||
                        t.name.toLowerCase().includes(q) ||
                        (t.hint ?? "").toLowerCase().includes(q) ||
                        t.group.toLowerCase().includes(q),
                    )
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => openReview(t)}
                        className="group flex cursor-pointer items-center gap-3 bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-accent/70"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface">
                          <Logo k={t.logo} className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                              {t.name}
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
                              · {t.group}
                            </span>
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {t.hint ?? "Production-ready starter"}
                          </span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </button>
                    ))
                : null}

              {/* Default view: 4 primary choices (matching Add a project) */}
              {!isLoading && !subview && category === "all"
                ? visibleChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleSelectChoice(choice)}
                      className="group flex cursor-pointer items-center gap-3 bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-accent/70"
                    >
                      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface">
                        {choice.fanned === "database" ? (
                          <DatabaseFannedLogos />
                        ) : choice.logoKey ? (
                          <Logo k={choice.logoKey} className="h-4.5 w-4.5" />
                        ) : choice.icon ? (
                          <choice.icon className="h-4 w-4 text-foreground/80" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                            {choice.title}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
                            · {choice.badge}
                          </span>
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {choice.note}
                        </span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </button>
                  ))
                : null}

              {/* When searching in category === "all", also show matching templates section */}
              {!isLoading && !subview && category === "all" && q && matchingTemplates.length > 0 ? (
                <div className="border-t border-border/70 bg-surface/20 p-2">
                  <p className="px-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Templates ({matchingTemplates.length})
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {matchingTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => openReview(t)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-surface">
                          <Logo k={t.logo} className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-medium text-foreground">{t.name}</span>
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                          {t.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* No matches */}
              {!isLoading && q && !visibleChoices.length && !matchingTemplates.length ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Nothing matches “{query}”.
                </p>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
