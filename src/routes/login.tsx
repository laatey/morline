import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/moor/auth-layout";
import { Logo } from "@/components/moor/primitives";
import { initialServices } from "@/lib/platform-data";
import { useAuth } from "@/lib/auth";
import { api, ApiError, oauthUrl } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Morline" },
      { name: "description", content: "Sign in to Morline to deploy and monitor your services." },
      { property: "og:title", content: "Sign in — Morline" },
      { property: "og:description", content: "Sign in to Morline to deploy and monitor your services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

export function StackAside() {
  return (
    <div className="w-full max-w-sm space-y-2">
      {initialServices.slice(0, 5).map((s, i) => (
        <div key={s.id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm" style={{ marginLeft: `${(i % 3) * 24}px` }}>
          <Logo k={s.logo} />
          <span className="text-sm font-medium">{s.name}</span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{s.region}</span>
        </div>
      ))}
      <p className="pt-4 font-display text-2xl font-semibold tracking-tight">Your whole stack, managed in one place.</p>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magic, setMagic] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (!magic && !password) return setError("Enter your password.");
    setError("");
    setLoading(true);
    try {
      if (magic) {
        await api("/auth/password/forgot", { method: "POST", auth: false, body: { email } });
        setSent(true);
      } else {
        await signIn(email, password);
        navigate({ to: "/projects" });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "email_not_verified") setError("Verify your email first — we sent you a link.");
        else if (err.status === 401) setError("Wrong email or password.");
        else setError(err.message);
      } else {
        setError("Couldn't reach the server. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout aside={<StackAside />}>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back.</p>
      <a href={oauthUrl("github", `${window.location.origin}/projects`)} className="mt-6 block">
        <Button variant="outline" className="w-full gap-2" type="button"><Github className="h-4 w-4" />Continue with GitHub</Button>
      </a>
      <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      {sent ? (
        <div className="rounded-lg border bg-card p-4 text-sm">Check <span className="font-mono">{email}</span> for a sign-in link.<button className="mt-2 block text-xs text-primary" onClick={() => setSent(false)}>Use a different email</button></div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs text-muted-foreground">Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1" /></label>
          {!magic ? (
            <label className="block text-xs text-muted-foreground">
              <span className="flex justify-between">Password<button type="button" className="text-primary" onClick={() => setMagic(true)}>Forgot?</button></span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </label>
          ) : null}
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : magic ? "Email me a link" : "Sign in"}</Button>
          <button type="button" onClick={() => setMagic((m) => !m)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">{magic ? "Use password instead" : "Sign in with a magic link"}</button>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">New to Morline? <Link to="/signup" className="text-primary">Create an account</Link></p>
    </AuthLayout>
  );
}
