import { api } from "@/lib/api";
import type { FileDiff } from "@/components/moor/diff-view";

export type DeployTarget = "github" | "direct";

export type ActionStatus = "pending" | "applying" | "applied" | "failed" | "dismissed" | "reverted";

export type ActionResult = {
  repo?: { fullName: string; url: string; branch: string };
  commitSha?: string;
  commitUrl?: string;
  deploymentId?: string;
  serviceId?: string;
  generatedVariables?: string[];
  branch?: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  revertCommitUrl?: string;
  serviceRemoved?: boolean;
  error?: string;
  revertError?: string;
};

export type AssistantAction = {
  id: string;
  type: "create_app" | "modify_code" | string;
  status: ActionStatus;
  title: string;
  description: string;
  reversible: boolean;
  payload: {
    repo?: string;
    branch?: string;
    mode?: "commit" | "pr";
    name?: string;
    port?: number;
    envVars?: { key: string; description: string; generate: boolean }[];
    volume?: { mountPath: string; sizeGb: number } | null;
    fileCount?: number;
    deploy?: DeployTarget;
    githubConnected?: boolean;
  };
  diff: FileDiff[];
  result: ActionResult | null;
};

export const actionStats = (a: AssistantAction) => ({
  files: a.diff.length,
  additions: a.diff.reduce((n, f) => n + f.additions, 0),
  deletions: a.diff.reduce((n, f) => n + f.deletions, 0),
});

export const applyAction = (id: string, mode?: "commit" | "pr", deploy?: DeployTarget) =>
  api<AssistantAction>(`/assistant/actions/${id}/apply`, {
    method: "POST",
    body: { ...(mode ? { mode } : {}), ...(deploy ? { deploy } : {}) },
  });
export const dismissAction = (id: string) =>
  api<AssistantAction>(`/assistant/actions/${id}/dismiss`, { method: "POST" });
export const revertAction = (id: string) =>
  api<AssistantAction>(`/assistant/actions/${id}/revert`, { method: "POST" });
