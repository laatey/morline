# Morline Web

The Morline dashboard and public site: a canvas for projects, services, databases, deployments, logs, metrics, domains and teams, backed by the Morline API at `https://api.morline.space/v1` (see [`morline-server`](../morline-server)).

`/` is the marketing site and `/projects` is the entry to the app.

## Stack

TanStack Start and Router (file-based routes), TanStack Query, React 19, Tailwind CSS 4, shadcn/ui on Radix, Vite 8, Nitro. The Lovable Vite config targets Cloudflare Workers by default, so `npm run build` also emits a `wrangler.json`.

## Run it

Bun is the package manager (`bun.lock` is the lockfile, with a 24-hour supply-chain guard in `bunfig.toml`).

```bash
bun install
bun run dev        # http://localhost:5173
bun run build
bun run lint
bun run format
```

npm works for ad-hoc use (`npm install`), but it won't honour `bun.lock`.

## Configuration

The API address is the `API_BASE` constant in `src/lib/api.ts`. Change it there to point at another backend.

The AI proxy route (`src/routes/api/public/ai/$.ts`) needs two server-side variables: `PROXY_KEY` (callers must present it) and `LOVABLE_API_KEY` (used upstream). Without both it answers 500.

## Layout

```text
src/
  routes/            file-based routes; routeTree.gen.ts is generated, don't edit it
  components/moor/   product UI: canvas, inspector, panels, deployment, volumes, assistant
  components/ui/     shadcn primitives
  lib/               api client, auth, workspace state, design-time data and types
  assets/            stack logos, flags, marketing imagery
.lovable/            Lovable's planning notes (managed by Lovable)
```

Engineering conventions live in [`AGENTS.md`](./AGENTS.md) and open work in [`roadmap.md`](./roadmap.md).

## Lovable

This project is synced with [Lovable](https://lovable.dev/projects/d6675d32-3b88-4e0e-883f-307acf54e254): changes made there are committed to this repo, and pushes to `main` sync back.
