# Cold Outreach Companion - Release notes

## v1.2.0 - 14th Oct 2026
- Added a native installation button that appears only when Chrome offers the app's own install prompt, as a potential workaround for Chrome's overlapping-app installation menu.
- Added explicit 192px and 512px SVG icon variants to improve installability. (PNG fallbacks still advisable for broad compatibility.)
- Kept the app manifest identity, scope, CRM, cloud handoff and on-device settings unchanged.

## v1.1.0 - 14th Oct 2026
- Made Cold Outreach a distinct, installable standalone PWA with its own stable manifest identity, scoped service worker and home-screen icon (ice cube + UW badge).
- Added a dedicated app title, branding and About / release details.
- Cached only the static page shell for basic offline access; CRM saving and prospect retrieval still require an internet connection.
- Preserved existing CRM spreadsheet, Apps Script web app, Google Drive screenshot and ChatGPT handoff connections, and on-device saved connection settings.
- Kept the current `PWA/outreach/` URL so existing links and CRM handoffs continue to work.

## v1.0.0 - Pilot
- Relationship follow-up workflow: capture, CRM pipeline, follow-ups, screenshot uploads and ChatGPT handoff.
