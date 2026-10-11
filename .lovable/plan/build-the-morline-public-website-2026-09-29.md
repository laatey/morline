# Build the Morline public website

## Changes

- Move the existing project workspace from `/` to `/projects`, preserving its current cards, controls, and demo behavior.
- Build a new public homepage at `/` with a compact product story: a memorable deployment-focused hero, an authentic Morline workspace preview, a concise workflow section, and a final call to action.
- Use the existing mark, typography, grid language, status colors, service logos, canvas relationships, logs, and deployment states so the website and product feel inseparable.
- Add a clean public header and footer with direct links to sign in, create an account, and open the demo workspace.
- Keep the page minimal and technical: no stock art, testimonials, gradients, inflated claims, or repetitive feature blocks.
- Add subtle connection-flow, status, reveal, and interface motion with reduced-motion support.
- Make navigation and product previews work cleanly on phones and desktops.
- Make the SVG favicon follow the browser’s light or dark theme while retaining the official Morline mark.

## Technical details

- Update internal links and post-login/onboarding destinations that should open the workspace to `/projects`; keep the logo on application screens returning to the project workspace.
- Create reusable landing-only presentation pieces from existing sample product data without changing dashboard behavior or adding a backend.
- Add homepage-specific metadata, canonical URL, and social metadata using relative `morline.space`-ready paths.
- Preserve all existing application routes and validate the public homepage, workspace entry, calls to action, mobile layout, metadata, favicon, and runtime health.
