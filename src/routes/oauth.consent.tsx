import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RequireAuth, useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/oauth/consent")({
  validateSearch: (s: Record<string, unknown>) => ({ request: String(s.request ?? "") }),
  head: () => ({
    meta: [
      { title: "Authorize access — Morline" },
      { name: "description", content: "Approve an app or assistant that wants to use your Morline account." },
      { property: "og:title", content: "Authorize access — Morline" },
      { property: "og:description", content: "Approve an app or assistant that wants to use your Morline account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Consent />
    </RequireAuth>
  ),
});

interface RequestInfo {
  clientName: string;
  redirectHost: string;
  scope: string;
}

export function ConsentCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">{children}</div>
    </div>
  );
}

function Consent() {
  const { request } = Route.useSearch();
  const { user } = useAuth();
  const [info, setInfo] = useState<RequestInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);

  useEffect(() => {
    if (!request) return setError("This authorization link is missing or invalid.");
    api<RequestInfo>(`/oauth/requests/${encodeURIComponent(request)}`)
      .then(setInfo)
      .catch((e) => setError(e instanceof ApiError ? e.message : "This request has expired. Start again from your app."));
  }, [request]);

  const decide = async (action: "approve" | "deny") => {
    setBusy(action);
    try {
      const r = await api<{ redirectUrl: string }>(`/oauth/requests/${encodeURIComponent(request)}/${action}`, { method: "POST" });
      window.location.assign(r.redirectUrl);
    } catch (e) {
      setBusy(null);
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    }
  };

  return (
    <ConsentCard>
      {error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : !info ? (
        <div className="space-y-3">
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <>
          <h1 className="text-base font-semibold">Connect {info.clientName} to Morline</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {info.clientName} will be able to use Morline as {user?.email}: view projects, deploy, restart and read logs.
          </p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">Returns to {info.redirectHost}</p>
          <p className="mt-1 text-xs text-muted-foreground">Your workspace permissions still apply. You can revoke this any time from your sessions.</p>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" className="flex-1" disabled={!!busy} onClick={() => decide("deny")}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={!!busy} onClick={() => decide("approve")}>
              {busy === "approve" ? "Connecting…" : "Approve"}
            </Button>
          </div>
        </>
      )}
    </ConsentCard>
  );
}
