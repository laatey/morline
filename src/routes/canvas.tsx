import { createFileRoute, redirect } from "@tanstack/react-router";

// /canvas is the old URL. Redirect to /projects so the user picks a project
// and lands on the correct /project/:id URL.
export const Route = createFileRoute("/canvas")({
  beforeLoad: () => {
    throw redirect({ to: "/projects" });
  },
  component: () => null,
});
