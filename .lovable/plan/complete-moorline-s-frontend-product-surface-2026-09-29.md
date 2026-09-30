# Complete Moorline's frontend product surface

## Goal
Bring the existing Moorline demo up to the full product contract in `openapi.yaml`, using only local sample state and frontend interactions. No backend, API client, persistence, authentication service, or mock server will be added.

## Product surfaces

### 1. Shared workspace controls
- Expand the existing header menus into usable workspace, project, environment, profile, and theme controls.
- Add a global command palette that searches projects, services, deployments, and domains.
- Add a notification inbox with unread/read states and links into the relevant product views.
- Add polished loading, empty, unavailable, disabled, success, validation, and destructive-confirmation patterns shared across the app.

### 2. Access, onboarding, profile, and teams
- Add complete frontend-only sign-in, sign-up, email verification, forgotten/reset password, and invite-acceptance screens.
- Add an onboarding flow for profile, workspace, and first-project setup.
- Add account settings for profile/avatar, password, preferences, active sessions, and account deletion.
- Add team settings for workspace details, member roles, pending invitations, invite/revoke/remove/leave actions, and team deletion.

### 3. Projects and environments
- Upgrade project cards with favorite, duplicate, transfer, settings, and delete actions.
- Turn project creation into a compact staged flow covering blank projects, GitHub repositories, Docker images, databases, and templates.
- Add project editing and transfer dialogs with validation, progress, success, failure, and plan-limit states.
- Complete the environment picker with create, fork, rename, protect, and delete workflows.

### 4. Canvas and service management
- Add service lifecycle actions: deploy, restart, sleep/wake, duplicate, and delete.
- Add canvas controls for auto-layout, connection creation/edit/removal, context menus, collaboration/activity indicators, and save-state feedback.
- Complete service setup UI for repository/branch selection, Docker images, templates, region, commands, build settings, health checks, replicas, and public exposure.
- Expand the service inspector with overview/build details, volume attach/resize/delete, richer networking, and explicit settings save states.

### 5. Deployments, logs, metrics, variables, and networking
- Add a deployment detail panel with phases, progress, commit metadata, build logs, cancel, redeploy, and rollback confirmations.
- Complete logs with service/level/time filters, live-tail pause/resume, timestamps, result counts, empty/error/reconnect states, and line detail.
- Complete metrics with time-range and service selectors, chart tooltips, summary comparisons, and no-data states.
- Complete variables with edit, secret marking/reveal, reference picker, raw `.env` editor, shared environment variables, unsaved changes, and conflict/error states.
- Complete domains with add/generate dialogs, DNS instructions, verification progress, target-port editing, copy/open actions, and removal confirmation.

### 6. Settings, activity, GitHub, and assistant
- Recompose settings into clear Project, Environments, Members, Integrations, Usage, and Danger sections without generic nested cards.
- Add a project activity view with actor/type filters and readable change details.
- Add GitHub connection status, repository/branch pickers, framework detection results, and disconnect confirmation.
- Upgrade the assistant into a complete UI-only threaded experience: thread creation/switching/rename/archive/delete, message states, stop/regenerate/feedback controls, context selection, proposed-change previews, apply/dismiss/revert, partial-success, and failure states.

## Design and implementation
- Preserve the current Cutline palette, compact typography, cut-out shell, icon rail, floating panels, and token-based styling.
- Reuse existing panels for both full pages and service inspector views; add focused reusable dialogs, menus, state blocks, and drawers where needed.
- Keep all product data as typed sample data in frontend modules and all interactions session-local in React state.
- Use real controls and visible transitions rather than non-interactive placeholders; destructive actions always require confirmation.
- Add a dedicated route and unique metadata for each shareable product area, while transient tasks remain dialogs or side panels.
- Record the expanded frontend-only architecture in `AGENTS.md` and keep `roadmap.md` aligned with the implementation batches.

## Verification
- Verify every route renders and every primary dialog/panel opens, changes state, validates input, and closes correctly.
- Exercise the central flow from sign-in/onboarding through project creation, canvas service management, deployment inspection, monitoring, settings, notifications, search, and assistant actions.
- Check desktop and mobile layouts, keyboard focus, non-overlapping content, console/runtime errors, and the final build signal.
