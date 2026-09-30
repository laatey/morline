# Add visual-only auth screens and mobile layout fixes

## Changes
- Add a dark, grid-backed sign-in page inspired by the supplied reference, with Google and email UI that remains a frontend demo only.
- Add a second visual email step so the auth flow feels complete without creating accounts or connecting a service.
- Center all project and clip card grids on mobile while preserving the current desktop layout.
- Use the same background color inside and outside the app frame.
- Give the mobile header more height and remove the bottom rounded edge so content reaches the viewport bottom cleanly.

## Technical details
- Reuse the existing Cutline design tokens, shared buttons, inputs, and routing patterns.
- Add route-specific metadata for each new auth screen.
- Keep all existing app behavior unchanged and verify the auth screens plus affected mobile pages at phone and desktop widths.