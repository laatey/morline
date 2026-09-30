# Neutral palette and home workflow update

## Changes
- Replace the remaining cool blue-tinted dark surfaces with neutral charcoal tokens matching the new background, while retaining a clear action accent.
- Extend the home grid behind the shared header so the top of the page reads as one continuous grid canvas.
- Remove decorative icons from the centered header and from labeled action buttons; preserve necessary icon-only media controls and give export a text label.
- Enlarge the five home workflow icons and arrange them as a clear left-to-right process beneath the source input.
- Add a restrained hand-drawn connector and annotations around that workflow to communicate: source video enters, passes through each step, and exits as finished clips.
- Keep the existing setup flow, processing behavior, cards, and popup behavior unchanged.

## Verification
- Check the home and project screens at desktop and mobile sizes.
- Confirm the grid reaches behind the header, no cool-blue surfaces remain, controls do not overflow, and the full source-to-setup flow still works.

## Technical details
- Update semantic color variables in the global design system rather than adding one-off colors in page code.
- Build the doodled connector with CSS borders and text marks around the supplied SVG icons; no additional image asset is needed.
