import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash } from "fluid-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, type ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WorkspaceShell } from "@/components/moor/workspace-shell";
import { useEnvironments, useProject } from "@/lib/workspace";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Project settings — Morline" },
      {
        name: "description",
        content: "Project name, environments, members, spend limits and danger zone.",
      },
      { property: "og:title", content: "Project settings — Morline" },
      {
        property: "og:description",
        content: "Project name, environments, members, spend limits and danger zone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b px-4 py-6 md:grid-cols-[220px_1fr]">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="max-w-xl space-y-3">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const project = useProject().data;
  const envs = useEnvironments().data ?? [];
  const [confirmDel, setConfirmDel] = useState(false);
  const patch = async (body: Record<string, unknown>, ok: string) => {
    if (!project) return;
    try {
      await api(`/projects/${project.id}`, { method: "PATCH", body });
      toast.success(ok);
      await qc.invalidateQueries({ queryKey: ["project", project.id] });
      void qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      toast.error((e as ApiError).message ?? "Could not save");
    }
  };
  const removeEnv = async (id: string, name: string) => {
    try {
      await api(`/environments/${id}`, { method: "DELETE" });
      toast.success(`${name} deleted`);
      void qc.invalidateQueries({ queryKey: ["environments", project?.id] });
    } catch (e) {
      toast.error((e as ApiError).message ?? "Could not delete environment");
    }
  };
  const deleteProject = async () => {
    if (!project) return;
    try {
      await api(`/projects/${project.id}`, { method: "DELETE" });
      toast.success(`${project.name} deleted`);
      void qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects" });
    } catch (e) {
      toast.error((e as ApiError).message ?? "Could not delete project");
    }
  };
  return (
    <WorkspaceShell title="Settings">
      <div className="scroll-area h-full overflow-y-auto" key={project?.id ?? "loading"}>
        <div className="border-b px-4 py-5">
          <h1 className="text-xl font-semibold">Project settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Applies to every environment in {project?.name ?? "this project"}.
          </p>
        </div>
        <Section title="General">
          <label className="block text-xs text-muted-foreground">
            Project name
            <Input
              defaultValue={project?.name ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== project?.name) void patch({ name: v }, "Project renamed");
              }}
              className="mt-1 h-8 font-mono text-sm"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Description
            <Input
              defaultValue={project?.description ?? ""}
              placeholder="What this project runs"
              onBlur={(e) => {
                if (e.target.value !== (project?.description ?? ""))
                  void patch({ description: e.target.value || null }, "Description saved");
              }}
              className="mt-1 h-8 text-sm"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Project ID
            <Input
              readOnly
              value={project?.id ?? ""}
              className="mt-1 h-8 font-mono text-sm text-muted-foreground"
            />
          </label>
        </Section>
        <Section title="Environments">
          <ul className="divide-y rounded-md border">
            {envs.map((e) => (
              <li
                key={e.id}
                className="group flex items-center justify-between gap-2 px-3 py-2 font-mono text-xs"
              >
                {e.name}
                <span className="ml-auto text-muted-foreground">
                  {e.protected
                    ? "protected"
                    : e.type === "preview"
                      ? "auto-deletes on merge"
                      : `${e.serviceCount} services`}
                </span>
                {!e.protected ? (
                  <button
                    aria-label={`Delete ${e.name}`}
                    onClick={() => removeEnv(e.id, e.name)}
                    className="rounded p-1 text-destructive opacity-0 hover:bg-accent group-hover:opacity-100"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-sm">
            <span>Create preview environments for pull requests</span>
            <Switch
              defaultChecked={project?.settings?.prEnvironments ?? true}
              onCheckedChange={(v) =>
                patch(
                  { settings: { prEnvironments: v } },
                  v ? "PR environments on" : "PR environments off",
                )
              }
            />
          </div>
        </Section>
        <Section title="Spend limit">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              defaultValue={project?.settings?.spendLimitUsd ?? ""}
              placeholder="none"
              onBlur={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                if (v !== (project?.settings?.spendLimitUsd ?? null))
                  void patch({ settings: { spendLimitUsd: v } }, "Spend limit saved");
              }}
              className="h-8 w-28 font-mono"
            />
            <span className="text-sm text-muted-foreground">
              USD / month — services sleep when reached
            </span>
          </div>
        </Section>
        <Section title="Members">
          <p className="text-sm text-muted-foreground">
            Project access follows your workspace team.
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
            <Link to="/team">Manage team</Link>
          </Button>
        </Section>
        <Section title="Danger zone">
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs"
            onClick={() => setConfirmDel(true)}
          >
            Delete project
          </Button>
        </Section>
      </div>
      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {project?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every environment, service, deployment and variable will be removed. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspaceShell>
  );
}
