# Cold Outreach - standalone PWA development notes

This folder is an independently installable PWA at `/PWA/outreach/`.
Maintain its stable URL, unique manifest id and same-folder service-worker scope.
Treat `backend/Code.gs` and the existing Cold Outreach CRM as independent, external data infrastructure. Do not change Apps Script/back-end deployment as a side-effect of appearance or PWA updates.

For EVERY behaviour or UI change, increment the displayed semantic version, update `CHANGELOG.md`, and bump the service worker cache token. Keep existing `acOutreachBackendUrl`/`acOutreachBackendKey` storage keys and data handoff contracts.
Do not cache, log, or embed workspace secrets, CRM responses, screenshot evidence or prospect personal data into any PWA cache.
