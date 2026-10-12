# Morline web: engineering rules

- The app talks to the live API (`src/lib/api.ts`: token storage, auto-refresh, typed errors). `src/lib/platform-data.ts` is design-time material only: shared types, stack logos, the template catalog, and a few leftover fixtures. New features go through the API, not through that file.
- Workspace pages wrap in `WorkspaceShell` (top bar and icon rail). Service tabs live in `components/moor/panels.tsx` and are reused by the canvas inspector and the full pages, so there is one source per concern.
- The canvas is a hand-rolled pan/zoom surface (`components/moor/canvas.tsx`) with no graph library, which keeps the bundle small and the styling token-based.
- Service logos are SVGs in `src/assets/stack/`.
- The assistant proposes changes as actions (`lib/assistant-actions.ts`). They render as a flat summary in the chat and open `change-review.tsx` (file list + `diff-view.tsx`) for approval; nothing is applied from the chat bubble itself. Diff colours come from `--diff-add` / `--diff-del`.
- CPU and memory sliders (`resource-limits.tsx`) read `/infrastructure/capacity`; the ceiling is the host's remaining capacity, not a plan.
- The canvas assistant persists threads through `/assistant/threads`; onboarding progress through `/me/onboarding`.
- Deployment-to-chat handoff sends reference-only context next to a short message. The API is meant to resolve authorized details, so logs and secrets never become pasted user text.
- Canvas volume cards and the Volumes panel share one per-service volume query, so optimistic panel updates reach the canvas without a second data source.
- Non-canvas workspace content is centered at a 1040px cap with edge borders; the canvas and the projects grid stay full-bleed.
- `/` is the public marketing site and `/projects` is the application entry.
- Package manager is Bun; commit `bun.lock` only. Don't add `package-lock.json`.
- `routeTree.gen.ts` is generated. See `src/routes/README.md` for routing conventions.
