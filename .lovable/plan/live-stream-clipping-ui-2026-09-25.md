# Live-stream clipping UI

## Goal
Add a complete visual-only flow for connecting a live stream, monitoring active clipping, and reviewing clips as they appear. No real stream connection, account integration, or persistence will be added.

## What will change

### Home and mobile frame
- Round the top edge of the page area directly below the header on mobile while keeping the bottom edge open.
- Add a **Live** toggle beside the existing video-link mode.
- In Live mode, accept a YouTube Live, Twitch, or custom stream URL and start the live setup flow.

### Live setup flow
- Add a dedicated setup screen that visually confirms the stream source.
- Let users choose clip format, target length, caption style, and what moments to watch for.
- Include a clear connection status and a **Start live clipping** action.

### Active live workspace
- Add a dedicated live project page with a prominent live indicator, elapsed time, connection health, and active monitoring state.
- Show newly found clips in a growing feed with Ready, Reviewing, and Capturing states.
- Provide UI controls to pause/resume clipping, manually mark a moment, and end the session.
- Keep every interaction simulated in the browser and clearly demo-only.

### Project surfaces
- Add a live demo project to the home and Projects pages.
- Give live projects a distinct animated **Live** badge and “clipping now” metadata.
- Route the live project card to its dedicated live workspace while existing projects keep their current clip pages.

## Technical details
- Reuse the existing app shell, buttons, inputs, badges, video previews, clip cards, and semantic color tokens.
- Extend the in-memory demo data with a live project state; do not add a database or external service.
- Add the required TanStack routes for live setup and the active live workspace, each with page-specific metadata.
- Use timers only to simulate elapsed time and newly discovered clips; no stream URL will be fetched or stored.
- Verify the link → setup → active workspace → project navigation flow at desktop and mobile sizes.