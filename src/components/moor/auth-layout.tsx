import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mark } from "./workspace-shell";

export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link to="/" className="flex items-center gap-2"><Mark /><span className="font-display text-sm font-semibold tracking-tight">morline</span></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="font-mono text-[10px] text-muted-foreground">Demo interface · no real accounts are created</p>
      </div>
      <div className="auth-grid relative hidden overflow-hidden border-l bg-background lg:block">
        <div className="absolute inset-0 grid place-items-center p-12">{aside}</div>
      </div>
    </div>
  );
}
