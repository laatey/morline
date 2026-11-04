import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireAuth, useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { ConsentCard } from "./oauth.consent";

export const Route = createFileRoute("/device")({
  validateSearch: (s: Record<string, unknown>) => ({ code: s['code'] ? String(s['code']) : "" }),
  head: () => ({
    meta: [
      { title: "Connect the CLI — Morline" },
      { name: "description", content: "Confirm the code shown in your terminal to sign the Morline CLI in." },
      { property: "og:title", content: "Connect the CLI — Morline" },
      { property: "og:description", content: "Confirm the code shown in your terminal to sign the Morline CLI in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Device />
    </RequireAuth>
  ),
});

function Device() {
  const { code: initial } = Route.useSearch();
  const { user } = useAuth();
  const [code, setCode] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    setError("");
    try {
      await api("/oauth/device/approve", { method: "POST", body: { userCode: code.trim().toUpperCase() } });
      setState("done");
    } catch (err) {
      setState("idle");
      setError(err instanceof ApiError ? err.message : "That code didn't work. Check your terminal and try again.");
    }
  };

  return (
    <ConsentCard>
      {state === "done" ? (
        <>
          <h1 className="text-base font-semibold">CLI connected</h1>
          <p className="mt-2 text-sm text-muted-foreground">Go back to your terminal. You can close this tab.</p>
        </>
      ) : (
        <form onSubmit={submit}>
          <h1 className="text-base font-semibold">Connect the Morline CLI</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirm this matches the code in your terminal. The CLI will act as {user?.email}.
          </p>
          <Input
            className="mt-4 text-center font-mono text-lg tracking-[0.3em]"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD-EFGH"
            autoFocus
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <Button className="mt-4 w-full" disabled={state === "busy" || code.trim().length < 8}>
            {state === "busy" ? "Connecting…" : "Connect"}
          </Button>
        </form>
      )}
    </ConsentCard>
  );
}
