import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "fluid-icons/react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { logos, type Kind, type LogoKey } from "@/lib/platform-data";
import { Logo } from "./primitives";
import { GitHubRepoPicker, type GhRepo } from "./github-repo-picker";

export type Template = { id: string; name: string; logo: LogoKey; kind: Kind; group: string; hint?: string };

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await api<{ data: Template[] }>("/templates")).data.map((t) => ({ ...t, logo: (t.logo in logos ? t.logo : "docker") as LogoKey })),
    staleTime: 10 * 60_000,
  });
}

export function NewServiceDialog({
  open,
  onOpenChange,
  onPick,
  onPickRepo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (t: Template) => void;
  onPickRepo?: (r: GhRepo) => void;
}) {
  const { data: templates = [], isLoading } = useTemplates();
  const [github, setGithub] = useState(false);
  const groups = [...new Set(templates.map((t) => t.group))];

  if (github && open) {
    return (
      <Dialog open onOpenChange={(v) => { if (!v) { setGithub(false); onOpenChange(false); } }}>
        <DialogContent className="gap-0 overflow-hidden border border-border/80 bg-card p-0 shadow-2xl sm:max-w-[420px] sm:rounded-2xl sm:p-0">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <button type="button" aria-label="Back" onClick={() => setGithub(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <DialogTitle className="text-sm font-semibold">Deploy from GitHub</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Each push to the default branch redeploys.</DialogDescription>
            </div>
          </div>
          <GitHubRepoPicker onPick={(r) => { setGithub(false); onPickRepo?.(r); }} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Add a service — repo, database, starter, app…" />
      <CommandList className="max-h-[300px] p-1.5">
        <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">{isLoading ? "Loading templates…" : "Nothing matches."}</CommandEmpty>
        {onPickRepo ? (
          <CommandGroup heading="Source">
            <CommandItem value="GitHub repository deploy repo" onSelect={() => setGithub(true)} className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface"><Logo k="github" className="h-3.5 w-3.5" /></span>
              <span className="font-medium text-foreground">GitHub repository</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">Deploy from a repo</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            </CommandItem>
          </CommandGroup>
        ) : null}
        {groups.map((g) => (
          <CommandGroup key={g} heading={g}>
            {templates.filter((t) => t.group === g).map((t) => (
              <CommandItem
                key={t.id}
                value={t.name}
                onSelect={() => onPick(t)}
                className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/70"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface transition-transform duration-150 group-hover:scale-105">
                  <Logo k={t.logo} className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{t.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
