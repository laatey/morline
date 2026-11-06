# Morline CLI source

Command-line client for Morline. It signs in with OAuth (browser device code, confirmed at `/device` in the web app) and talks to `https://api.morline.space/v1`.

- `src/cli.js` — commands
- `src/client.js` — OAuth device login, token storage and refresh, API calls
- `scripts/build-exe.mjs` — builds a standalone `dist/morline(.exe)` (no Node needed to run it)
- `scripts/build-installer.js` + `installer.iss` — Windows installer that adds `morline` to PATH
- `test/` — checks

## Run from source

Install Node.js 22 or newer:

```sh
npm install
npm start -- help
npm link        # optional: makes `morline` available globally
```

## Build

```sh
npm run build:exe        # dist/morline.exe on Windows, dist/morline on macOS/Linux
npm run dist:installer   # Windows: dist/Morline-CLI-Setup-<version>.exe (needs Inno Setup 6)
```

Build on each platform you want to ship: the executable embeds the Node runtime it was built with.

## Use

```sh
morline login
morline link SERVICE_ID
morline deploy -f
morline logs DEPLOYMENT_ID -f
morline vars
```

Set `MORLINE_API_URL` to point at another server.

## Checks

```sh
npm test
```
