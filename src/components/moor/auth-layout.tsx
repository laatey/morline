import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Mark } from "./workspace-shell";

export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  useEffect(() => {
    document.documentElement.style.backgroundColor = "var(--color-surface)";
    document.body.style.backgroundColor = "var(--color-surface)";
    let meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "#171717");
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
      if (prev) meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link to="/" className="flex items-center gap-2"><Mark /><span className="font-display text-sm font-semibold tracking-tight">morline</span></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="font-mono text-[10px] text-muted-foreground">Morline · deploy and see your whole stack</p>
      </div>
      <div className="auth-grid relative hidden overflow-hidden border-l bg-surface lg:block">
        <div className="absolute inset-0 grid place-items-center p-12">{aside}</div>
      </div>
    </div>
  );
}
