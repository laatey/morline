# Morline — engineering rules
- Product is a deployment platform demo; all data is sample data in `src/lib/platform-data.ts` (no backend yet) — keeps UI iterable before an API exists.
- Workspace pages wrap in `WorkspaceShell` (top bar + icon rail); service tabs live in `components/moor/panels.tsx` and are reused by both the canvas inspector and full pages — one source per concern.
- Canvas is a hand-rolled pan/zoom surface (`components/moor/canvas.tsx`), no graph library — keeps bundle small and styling fully token-based.
- Service logos are SVGs in `src/assets/stack/`.
- The canvas assistant is a UI-only threaded concept with no model calls or persistence — the requested scope is visual design only.
- Non-canvas workspace content is centered at a 1040px cap with edge borders, while the canvas and projects grid stay full-bleed — keeps data pages readable without making the workspace feel empty.
- `/` is the public marketing site and `/projects` is the application entry — separates product storytelling from the workspace without duplicating either surface.
