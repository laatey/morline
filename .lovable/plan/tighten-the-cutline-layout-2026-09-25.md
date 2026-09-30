# Tighten the Cutline layout

## Changes
- Keep the shared hamburger header, remove the logo and theme toggle, add compact links to Projects, New clip, and Clips.
- Make Cutline permanently dark with neutral gray surfaces and rounded buttons.
- Compress the home intro and source controls to roughly one-third of the first screen while retaining the grid background and supplied service icons.
- Make recent-project and clip cards smaller, uniform, and aligned to the video placeholder width.
- Add a styled scrollbar across the app.
- Update the clip popup so the video remains fixed on the left while only the editing panel on the right scrolls; stack naturally on small screens.

## Technical details
- Reuse the existing shared shell, video preview, project data, and imported Google/social icons.
- Keep all existing navigation and clip actions working; this is presentation-only.
- Check desktop and mobile layouts, popup scrolling, and preview errors after implementation.
