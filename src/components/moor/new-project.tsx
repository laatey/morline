import { DockerImageFields, type DockerImageValues } from "@/components/moor/docker-image-form";
import { defaultNameFromImage, imageProblem } from "@/lib/docker-image";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search, Sparkles, Terminal } from "fluid-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { templates, type LogoKey } from "@/lib/platform-data";
import { DatabaseFannedLogos, Logo, Kbd } from "./primitives";
import { GitHubRepoPicker, type GhRepo } from "./github-repo-picker";

type Choice = {
  id: string;
  title: string;
  note: string;
  badge: string;
  logoKey?: LogoKey;
  icon?: typeof Terminal;
  fanned?: "database";
};

const choices: Choice[] = [
  {
    id: "ai",
    title: "Build with AI",
    note: "Describe an app or API, review the code, deploy it",
    badge: "Agent",
    icon: Sparkles,
  },
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
    note: "Run any public container image",
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

export type NewProjectInput = {
  name: string;
  source: "empty" | "github" | "docker";
  github?: { repo: string; branch?: string; url?: string };
  docker?: { image: string; port?: number };
  /** Open the assistant on the new project with this prompt filled in (not sent). */
  ai?: { prompt: string };
  /** After creating the project, open the picker for this kind of service. */
  addNext?: "database" | "template";
};

/** "Build me a REST API for task tracking" -> "rest-api-for". */
function nameFromPrompt(prompt: string) {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["a", "an", "the", "build", "me", "make", "create"].includes(w))
    .slice(0, 3);
  return words.join("-").slice(0, 30) || "ai-project";
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (input: NewProjectInput) => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Choice | null>(null);
  const [pickingRepo, setPickingRepo] = useState(false);
  const [repo, setRepo] = useState<GhRepo | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [docker, setDocker] = useState<DockerImageValues>({ image: "", port: "" });
  const [prompt, setPrompt] = useState("");

  const q = query.trim().toLowerCase();
  const visibleChoices = choices.filter(
    (choice) =>
      choice.title.toLowerCase().includes(q) ||
      choice.note.toLowerCase().includes(q) ||
      choice.badge.toLowerCase().includes(q),
  );

  const matchingTemplates = q
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.hint.toLowerCase().includes(q) ||
          t.group.toLowerCase().includes(q),
      )
    : [];

  const handleSelect = (choice: Choice) => {
    if (onCreate) {
      if (choice.id === "github") {
        setPickingRepo(true);
        return;
      }
      setPending(choice);
      setRepo(null);
      setName("");
      setDocker({ image: "", port: "" });
      setPrompt("");
      return;
    }
    onOpenChange(false);
    navigate({ to: "/projects" });
  };

  const dockerReady =
    pending?.id !== "docker" || (!!docker.image.trim() && !imageProblem(docker.image));
  const aiReady = pending?.id !== "ai" || prompt.trim().length >= 8;
  const ready = dockerReady && aiReady;

  const handleCreate = async () => {
    const finalName =
      name.trim() ||
      (pending?.id === "docker" && docker.image
        ? defaultNameFromImage(docker.image)
        : pending?.id === "ai"
          ? nameFromPrompt(prompt)
          : "new-project");
    if (!onCreate || creating || !ready) return;
    setCreating(true);
    try {
      let input: NewProjectInput;
      if (repo) {
        input = {
          name: finalName,
          source: "github",
          github: {
            repo: repo.fullName,
            branch: repo.defaultBranch,
            ...(repo.url ? { url: repo.url } : {}),
          },
        };
      } else if (pending?.id === "ai") {
        input = { name: finalName, source: "empty", ai: { prompt: prompt.trim() } };
      } else if (pending?.id === "docker") {
        input = {
          name: finalName,
          source: "docker",
          docker: {
            image: docker.image.trim(),
            ...(docker.port ? { port: Number(docker.port) } : {}),
          },
        };
      } else if (pending?.id === "database" || pending?.id === "starter") {
        input = {
          name: finalName,
          source: "empty",
          addNext: pending.id === "database" ? "database" : "template",
        };
      } else {
        input = { name: finalName, source: "empty" };
      }
      await onCreate(input);
      onOpenChange(false);
      if (input.source === "empty" && !input.addNext && !input.ai) navigate({ to: "/projects" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setQuery("");
          setPending(null);
          setPickingRepo(false);
          setRepo(null);
          setDocker({ image: "", port: "" });
          setPrompt("");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="overflow-hidden border border-border/80 bg-card p-0 sm:p-0 gap-0 shadow-2xl sm:max-w-[420px] sm:rounded-2xl">
        {/* Header */}
        <div className="border-b px-4.5 pb-3 pt-3.5 sm:px-5 sm:pt-4 sm:pb-3.5">
          <p className="label-caps">Create</p>
          <DialogTitle className="mt-1 font-display text-base font-semibold tracking-tight sm:text-lg">
            Add a project
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
            {pickingRepo
              ? "Pick the repository to deploy as the first service."
              : pending?.id === "ai"
                ? "Describe what you want. The assistant opens in your new project, ready to go."
                : pending?.id === "docker"
                  ? "Enter the image to run as the first service."
                  : pending?.id === "database" || pending?.id === "starter"
                    ? "Name the project. You'll choose what to add right after."
                    : pending
                      ? "Name the project before it is created."
                      : "Choose where the first service should come from."}
          </DialogDescription>
        </div>

        {pickingRepo ? (
          <>
            <GitHubRepoPicker
              onPick={(r) => {
                setRepo(r);
                setName(
                  r.fullName
                    .split("/")[1]!
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .slice(0, 40),
                );
                setPending(choices[0]!);
                setPickingRepo(false);
              }}
            />
            <DialogFooter className="border-t px-4.5 py-3 sm:px-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickingRepo(false)}
              >
                Back
              </Button>
            </DialogFooter>
          </>
        ) : pending ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <div className="space-y-3 p-4 sm:p-5">
              {pending.id === "ai" ? (
                <label className="block text-xs text-muted-foreground">
                  What should we build?
                  <textarea
                    autoFocus
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, 600))}
                    placeholder="A REST API for a task tracker with login and SQLite storage"
                    className="mt-1 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/60"
                  />
                  <span className="mt-1 block text-[11px]">
                    You'll review every file before anything is created or deployed.
                  </span>
                </label>
              ) : null}
              {pending.id === "docker" ? (
                <DockerImageFields values={docker} onChange={setDocker} />
              ) : null}
              <label className="block text-xs text-muted-foreground">
                Project name
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
                  placeholder={
                    pending.id === "database"
                      ? "my-db"
                      : pending.id === "docker" && docker.image
                        ? defaultNameFromImage(docker.image)
                        : pending.id === "ai" && prompt
                          ? nameFromPrompt(prompt)
                          : "my-app"
                  }
                  className="mt-1 h-9 font-mono text-sm"
                />
              </label>
              <div className="flex items-center gap-2 rounded-lg border bg-surface/40 px-3 py-2.5">
                <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface">
                  {pending.fanned === "database" ? (
                    <DatabaseFannedLogos />
                  ) : pending.logoKey ? (
                    <Logo k={pending.logoKey} className="h-4 w-4" />
                  ) : pending.icon ? (
                    <pending.icon className="h-4 w-4 text-foreground/80" />
                  ) : null}
                </span>
                <span className="min-w-0 text-xs">
                  <span className="block truncate font-medium">
                    {repo ? repo.fullName : pending.title}
                  </span>
                  <span className="block truncate text-muted-foreground">
                    {repo
                      ? `Deploys ${repo.defaultBranch} as the first service`
                      : pending.id === "ai"
                        ? "Opens the assistant with your prompt"
                        : pending.id === "docker"
                          ? "Pulled and started as the first service"
                          : pending.id === "database"
                            ? "You will pick a database next"
                            : pending.id === "starter"
                              ? "You will pick a starter next"
                              : pending.note}
                  </span>
                </span>
              </div>
            </div>
            <DialogFooter className="border-t px-4.5 py-3 sm:px-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPending(null);
                  if (repo) setPickingRepo(true);
                }}
              >
                Back
              </Button>
              <Button type="submit" size="sm" disabled={creating || !ready}>
                {creating ? "Creating…" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            {/* Search */}
            <div className="border-b bg-surface/30 px-3 py-2">
              <label className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sources and templates…"
                  className="h-8 border-0 bg-surface/80 pl-8 pr-12 text-base md:text-xs shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/30"
                  autoFocus
                />
                {query ? (
                  <button
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

            {/* Choices */}
            <div className="flex flex-col divide-y divide-border/50 max-h-[45vh] sm:max-h-[55vh] overflow-y-auto overscroll-contain">
              {visibleChoices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleSelect(choice)}
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
              ))}
            </div>

            {/* Live matching templates when searching */}
            {matchingTemplates.length > 0 && (
              <div className="border-t border-border/70 bg-surface/20 p-2">
                <p className="px-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Templates ({matchingTemplates.length})
                </p>
                <div className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                  {matchingTemplates.slice(0, 5).map((t) => (
                    <button
                      key={t.name}
                      onClick={() => handleSelect(choices[choices.length - 1]!)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent"
                    >
                      <span className="grid h-5 w-5 place-items-center rounded bg-surface shrink-0">
                        <Logo k={t.logo} className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium text-foreground">{t.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                        {t.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
