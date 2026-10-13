import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type GhStatus = { connected: boolean; account: unknown; installUrl: string };

/** Open GitHub in a centred popup. Returns null when the browser blocked it. */
export function openGithubPopup(url: string): Window | null {
  const w = 560;
  const h = 680;
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
  return window.open(url, "morline-github", `width=${w},height=${h},left=${left},top=${top}`);
}

/**
 * GitHub connection for the active team. `connect()` opens GitHub in a popup, so the user never
 * leaves the page, and resolves once the team is connected (or the popup is abandoned).
 */
export function useGithubConnect() {
  const qc = useQueryClient();
  const { teams, activeTeamId } = useAuth();
  const teamId = activeTeamId ?? teams[0]?.id ?? null;
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const status = useQuery({
    queryKey: ["github", teamId],
    queryFn: () => api<GhStatus>(`/integrations/github?teamId=${teamId}`),
    enabled: !!teamId,
    // GitHub can sever window.opener, so poll while the popup is open as well as listening.
    refetchInterval: waiting ? 2000 : false,
  });
  const connected = !!status.data?.connected;

  const finish = useCallback(
    (ok: boolean) => {
      setWaiting(false);
      resolver.current?.(ok);
      resolver.current = null;
      if (ok) {
        void qc.invalidateQueries({ queryKey: ["github", teamId] });
        void qc.invalidateQueries({ queryKey: ["github-repos", teamId] });
      }
    },
    [qc, teamId],
  );

  useEffect(() => {
    if (connected && waiting) finish(true);
  }, [connected, waiting, finish]);

  useEffect(() => {
    if (!waiting) return;
    const onMessage = (e: MessageEvent) => {
      const type = (e.data as { type?: string } | null)?.type;
      if (type === "github_connected") finish(true);
      if (type === "github_error") {
        setError(String((e.data as { message?: string }).message || "GitHub could not connect"));
        finish(false);
      }
    };
    const onFocus = () => void qc.invalidateQueries({ queryKey: ["github", teamId] });
    window.addEventListener("message", onMessage);
    window.addEventListener("focus", onFocus);
    const giveUp = window.setTimeout(() => finish(false), 5 * 60_000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("focus", onFocus);
      window.clearTimeout(giveUp);
    };
  }, [waiting, finish, qc, teamId]);

  const connect = useCallback(async (): Promise<boolean> => {
    const url = status.data?.installUrl;
    if (!url) return false;
    setError(null);
    const popup = openGithubPopup(url);
    if (!popup) {
      // Popups blocked: fall back to a normal redirect rather than doing nothing.
      window.location.href = url;
      return false;
    }
    setWaiting(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, [status.data?.installUrl]);

  return { teamId, status, connected, waiting, error, connect };
}
