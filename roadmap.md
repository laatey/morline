# Roadmap

## Open

- [ ] **Deployment context in the assistant.** The frontend sends `POST /assistant/threads/:threadId/messages` with `{ text, context: { type: "deployment", deploymentId, serviceName } }`. The server must authorize the deployment, load its logs and diagnosis itself, keep the context for follow-up messages, and return it in thread history, with raw logs and secrets never appearing in the visible message text. As of this cleanup `morline-server` stores the `context` field but does not resolve deployment context, so live verification is blocked on that.
- [ ] **Canvas live updates.** The canvas polls; switch it to the server's `/environments/:id/events` SSE stream.
- [ ] **Pin / favorite projects.** The server supports `PUT` and `DELETE /projects/:id/favorite` and returns a `favorite` flag, but the projects grid has no pin control yet. Rename and delete already use the API.

## Done

- Marketing site and the full workspace UI.
- API client with token storage, auto-refresh and typed errors; auth provider and route protection.
- Sign-in, sign-up, magic and reset links, GitHub OAuth, sign-out.
- Teams (switcher, members, roles, invites) and environments (picker, create, fork, delete).
- Projects grid: list, create (including from a repo), rename, delete.
- Canvas: services, connections (drag to connect, remove), saved positions, add and delete service, placeholders and skeletons, volume cards, right-click menus.
- Deployments (detail, redeploy, rollback, cancel), logs, metrics, variables (including suggestions), domains.
- Unapplied-changes bar backed by `/staged-changes`.
- Activity, notifications, GitHub integration, global search (command palette).
- AI assistant threads and the deployment-context handoff on the client side.
- Account settings: profile, avatar, password, sessions, preferences, deletion; onboarding progress.
