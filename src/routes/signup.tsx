import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "fluid-icons/react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/moor/auth-layout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { ApiError, oauthUrl } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { name: "theme-color", content: "#171717" },
      { title: "Create account — Morline" },
      { name: "description", content: "Create a Morline account and deploy your first service in minutes." },
      { property: "og:title", content: "Create account — Morline" },
      { property: "og:description", content: "Create a Morline account and deploy your first service in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { signUp, status } = useAuth();
  useEffect(() => { if (status === "signed-in") navigate({ to: "/projects", replace: true }); }, [status, navigate]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(false);
  const rules = [
    { ok: form.password.length >= 8, label: "8+ characters" },
    { ok: /\d/.test(form.password), label: "a number" },
    { ok: /[A-Z]/.test(form.password), label: "an uppercase letter" },
  ];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Tell us your name.");
    if (!form.email.includes("@")) return setError("Enter a valid email address.");
    if (!rules.every((r) => r.ok)) return setError("Password doesn't meet the requirements yet.");
    setError("");
    setLoading(true);
    try {
      const { requiresEmailVerification } = await signUp(form.name.trim(), form.email, form.password);
      if (requiresEmailVerification) setVerifyEmail(true);
      else navigate({ to: "/onboarding" });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) setError("An account with this email already exists.");
        else if (err.fields) setError(Object.values(err.fields)[0] ?? err.message);
        else setError(err.message);
      } else {
        setError("Couldn't reach the server. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthLayout aside={<div className="max-w-sm space-y-4">{["Deploy from GitHub on every push", "Databases with persistent volumes", "Preview environments for pull requests", "Usage-based pricing with hard limits"].map((t) => <p key={t} className="flex items-center gap-3 text-lg"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>{t}</p>)}</div>}>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">$5 of free usage every month.</p>
      {verifyEmail ? (
        <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
          We sent a verification link to <span className="font-mono">{form.email}</span>. Confirm it, then <Link to="/login" className="text-primary">sign in</Link>.
        </div>
      ) : (
        <>
          <a href={oauthUrl("github", `${window.location.origin}/onboarding`)} className="mt-6 block">
            <Button variant="outline" className="w-full gap-2" type="button"><Github className="h-4 w-4" />Sign up with GitHub</Button>
          </a>
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs text-muted-foreground">Full name<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></label>
            <label className="block text-xs text-muted-foreground">Work email<Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></label>
            <label className="block text-xs text-muted-foreground">Password<Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" /></label>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {rules.map((r) => <li key={r.label} className={cn("flex items-center gap-1 text-[11px]", r.ok ? "text-score" : "text-muted-foreground")}><Check className="h-3 w-3" />{r.label}</li>)}
            </ul>
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">Already have an account? <Link to="/login" className="text-primary">Sign in</Link></p>
    </AuthLayout>
  );
}
