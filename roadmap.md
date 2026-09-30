# Roadmap

## Frontend (complete)
- [x] Marketing site, workspace UI, all product screens on sample data.

## Backend wiring (api.morline.space/v1)
- [x] API client with token storage, auto-refresh, typed errors (`src/lib/api.ts`).
- [x] Auth provider + route protection (`src/lib/auth.tsx`, `RequireAuth`).
- [x] Real sign-in, sign-up, magic/reset link, GitHub OAuth, sign-out.
- [x] Projects grid: list + create wired to `/teams/:id/projects` (rename/delete/pin stay local until those endpoints exist on api.morline.space; environments sub-resource not live yet).
- [x] Teams: switcher, members, roles, invites via API.
- [x] Environments: picker, create/fork, delete (settings) via API.
- [x] Canvas: services, connections, saved positions, add/delete service via API (polling; SSE later).
- [x] Deployments (+detail, redeploy/rollback/cancel), logs, metrics, variables, domains via API.
- [x] Activity, notifications, GitHub integration via API.
- [x] Global search via /search (command palette).
- [x] Canvas connections: drag-to-connect + remove via API.
- [x] AI assistant threads via /assistant/threads.
- [x] Account settings: profile, avatar, password, sessions, preferences, delete via API.
- [x] Onboarding progress via /me/onboarding.
- [x] Fix service-create crash; placeholder + skeleton cards on canvas.
- [x] Project from repo also adds the repo service.
- [x] Unapplied-changes bar (deploy/discard) — needs backend /staged-changes.
- [x] Suggested variables — needs backend /variables/suggestions.
