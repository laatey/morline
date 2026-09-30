import { useQuery } from "@tanstack/react-query";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { api } from "@/lib/api";
import { logos, type Kind, type LogoKey } from "@/lib/platform-data";
import { Logo } from "./primitives";

export type Template = { id: string; name: string; logo: LogoKey; kind: Kind; group: string; hint?: string };

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await api<{ data: Template[] }>("/templates")).data.map((t) => ({ ...t, logo: (t.logo in logos ? t.logo : "docker") as LogoKey })),
    staleTime: 10 * 60_000,
  });
}

export function NewServiceDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (t: Template) => void }) {
  const { data: templates = [], isLoading } = useTemplates();
  const groups = [...new Set(templates.map((t) => t.group))];
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Add a service — database, starter, app…" />
      <CommandList className="max-h-[300px] p-1.5">
        <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">{isLoading ? "Loading templates…" : "Nothing matches."}</CommandEmpty>
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
