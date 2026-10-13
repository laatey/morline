import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { API_BASE, freshAccessToken } from "@/lib/api";

// One server-sent event stream per environment replaces most polling. While it is connected the
// queries below refresh on a slow safety interval; if it drops they fall back to fast polling.

let live = false;
const listeners = new Set<() => void>();
const setLive = (value: boolean) => {
  if (live === value) return;
  live = value;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** True while the live stream is connected. */
export const useStreamLive = () =>
  useSyncExternalStore(
    subscribe,
    () => live,
    () => false,
  );

/** Poll interval: fast when we can't rely on the stream, slow as a safety net when we can. */
export function usePollInterval(fastMs: number, slowMs = 60_000) {
  return useStreamLive() ? slowMs : fastMs;
}

type Topic = "canvas" | "services" | "deployments" | "domains" | "logs" | "capacity" | "service";

const TOPICS: Record<string, Topic[]> = {
  "service.created": ["canvas", "services", "capacity", "service"],
  "service.updated": ["canvas", "services", "capacity", "service"],
  "service.deleted": ["canvas", "services", "capacity", "domains", "deployments"],
  "service.status": ["canvas", "services", "capacity", "service"],
  "deployment.updated": ["deployments", "canvas", "services", "capacity", "service"],
  "domain.updated": ["domains", "services"],
  "domain.deleted": ["domains", "services"],
  "connection.created": ["canvas"],
  "connection.deleted": ["canvas"],
  "canvas.updated": ["canvas"],
  "source.import": ["canvas", "services"],
  log: ["logs"],
};

function refresh(qc: QueryClient, envId: string, topics: Set<Topic>) {
  const keys: Record<Topic, unknown[]> = {
    canvas: ["canvas", envId],
    services: ["services", envId],
    deployments: ["deployments"],
    domains: ["domains", envId],
    logs: ["logs", envId],
    capacity: ["capacity"],
    service: ["service"],
  };
  topics.forEach((t) => void qc.invalidateQueries({ queryKey: keys[t] }));
  if (topics.has("deployments")) void qc.invalidateQueries({ queryKey: ["deployment"] });
}

/** Keep the workspace in sync with the environment's event stream. Mount once. */
export function useEnvironmentStream(envId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!envId || typeof EventSource === "undefined") return;
    let source: EventSource | null = null;
    let closed = false;
    let retry = 1000;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let flush: ReturnType<typeof setTimeout> | undefined;
    const pending = new Set<Topic>();

    // Bursts of events (a deploy emits many) are merged into one refresh.
    const queue = (topics: Topic[]) => {
      topics.forEach((t) => pending.add(t));
      if (flush) return;
      flush = setTimeout(() => {
        flush = undefined;
        refresh(qc, envId, new Set(pending));
        pending.clear();
      }, 150);
    };

    const connect = async () => {
      const token = await freshAccessToken();
      if (closed) return;
      source = new EventSource(
        `${API_BASE}/environments/${envId}/events${token ? `?token=${encodeURIComponent(token)}` : ""}`,
      );
      source.onopen = () => {
        retry = 1000;
        setLive(true);
        queue(["canvas", "services", "deployments", "capacity"]); // catch up on anything missed
      };
      source.onerror = () => {
        // Closing and reconnecting by hand lets us pick up a refreshed token.
        setLive(false);
        source?.close();
        if (closed) return;
        reconnect = setTimeout(() => void connect(), retry);
        retry = Math.min(retry * 2, 15_000);
      };
      for (const [name, topics] of Object.entries(TOPICS)) {
        source.addEventListener(name, () => queue(topics));
      }
    };
    void connect();

    return () => {
      closed = true;
      clearTimeout(reconnect);
      clearTimeout(flush);
      source?.close();
      setLive(false);
    };
  }, [envId, qc]);
}
